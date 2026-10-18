// SPEC 0002, critério 15: telemetria de uso dos provedores pelo dono (providers.usage), sem expor a chave.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { CONSOLE_METHODS } from '../src/console.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

test('providers.usage devolve as janelas do Go (estado, percentual, reinício) e nunca a chave (critério 15)', async () => {
  const usage = { usage: { rolling: { status: 'ok', percent: 0, resetsAt: '2026-10-18T09:22:19.241Z' }, weekly: { status: 'rate-limited', percent: 100, resetsAt: '2026-10-19T00:00:00.000Z' }, monthly: { status: 'ok', percent: 52, resetsAt: '2026-11-04T05:00:34.000Z' } } };
  const fake = await fakeHttp((c) => (c.path.endsWith('/usage') ? { json: usage } : { status: 404 }));
  const home = tempHome();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${fake.url}/v1` }] }));
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-secreta-go' }));
  const r = (await call(endpointFor(home), 'providers.usage', {})) as { provider: string; windows?: { window: string; status: string; percent: number; resetsAt: string }[]; error?: string }[];
  const go = r.find((x) => x.provider === 'opencode-go')!;
  assert.deepEqual(go.windows!.map((w) => [w.window, w.status, w.percent]), [['rolling', 'ok', 0], ['weekly', 'rate-limited', 100], ['monthly', 'ok', 52]]);
  assert.equal(go.windows![1]!.resetsAt, '2026-10-19T00:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(r), /chave-secreta-go/);
  assert.ok((CONSOLE_METHODS as readonly string[]).includes('providers.usage'), 'liberado na console');
  await fake.close();
});
