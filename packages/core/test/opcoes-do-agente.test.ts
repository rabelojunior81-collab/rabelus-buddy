// Opções do agente (SPEC 0002, critério 18; cobrança do Pai em 2026-10-20): com um agente escolhido, a console mostra
// os seletores que ele declara em session/new (modelo, esforço, modo), inclusive as opções agrupadas, e a escolha
// do Pai é aplicada por session/set_config_option antes da tarefa. A postura de segurança continua mandando: a opção
// de modo que contém "read-only" (Codex) não é oferecida e é ligada pelo núcleo, mesmo agrupada.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { checkParams } from '../src/contract.ts';
import { flatOptions } from '../src/harness/session.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
const servers: { close: () => Promise<void> }[] = [];
after(async () => { for (const o of owners) await killHard(o); for (const s of servers) await s.close().catch(() => {}); });

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
function fakeOpencode(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-oc-'));
  if (process.platform === 'win32') writeFileSync(join(dir, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(dir, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(dir, 'opencode'), 0o755); }
  return dir;
}
const REG = { version: '1.0.0', agents: [
  { id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './opencode.exe', args: ['acp'] } } } },
] };
async function owner(env: NodeJS.ProcessEnv) {
  const reg = await fakeHttp(() => ({ json: REG }));
  servers.push(reg);
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, ...env }));
  return (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
}
const finished = async (ipc: (m: string, p?: Record<string, unknown>) => Promise<any>, run: string) => { for (;;) { const r = await ipc('run.get', { id: run }); if (r.state !== 'running') return r; await new Promise((x) => setTimeout(x, 50)); } };
const lastText = async (ipc: (m: string, p?: Record<string, unknown>) => Promise<any>, session: string) => ((await ipc('session.events', { session })) as any[]).filter((e) => e.kind === 'agent.message' && e.payload.message.role === 'assistant').at(-1)?.payload.message.content as string;

test('opções agrupadas viram uma lista plana com o nome do grupo (a falha antiga: agrupadas sumiam)', () => {
  const flat = flatOptions({ options: [{ group: 'go', name: 'OpenCode Go', options: [{ value: 'go/free', name: 'Free' }] }, { value: 'solo', name: 'Solo' }] });
  assert.deepEqual(flat, [{ value: 'go/free', name: 'Free', group: 'OpenCode Go' }, { value: 'solo', name: 'Solo' }]);
});

test('harness.options devolve os seletores que o agente declara, com os agrupados abertos (critério 18)', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_OPTIONS: '1' });
  const { options } = await ipc('harness.options', { id: 'opencode' });
  const byId = Object.fromEntries((options as any[]).map((o) => [o.id, o]));
  assert.deepEqual(Object.keys(byId).sort(), ['effort', 'mode', 'model']);
  assert.equal(byId.model.category, 'model');
  assert.equal(byId.model.currentValue, 'go/free');
  assert.deepEqual(byId.model.options.map((o: any) => [o.value, o.group]), [['go/free', 'OpenCode Go'], ['go/pro', 'OpenCode Go'], ['ol/kimi', 'Ollama']]);
  assert.deepEqual(byId.effort.options.map((o: any) => o.value), ['low', 'high', 'default']);
  assert.deepEqual(byId.mode.options.map((o: any) => o.value), ['build', 'plan']);
});

test('a escolha do Pai é aplicada antes da tarefa: modelo, esforço e modo (critério 18)', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_OPTIONS: '1' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'o1', task: 'oi', workspace, harness: 'opencode', harnessOptions: { model: 'go/pro', effort: 'high', mode: 'plan' } });
  assert.equal((await finished(ipc, run)).state, 'done');
  assert.match(await lastText(ipc, 'o1'), /Opções: model=go\/pro, effort=high, mode=plan\./);
  const ev = (await ipc('session.events', { session: 'o1' })) as any[];
  assert.deepEqual(ev.find((e) => e.kind === 'harness.options.applied')?.payload.values, { model: 'go/pro', effort: 'high', mode: 'plan' });
});

test('postura: a opção de modo com read-only (mesmo agrupada) não é oferecida e é ligada pelo núcleo; o Pai não a troca (critérios 6 e 18)', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_GROUPED_MODE: '1' });
  const { options } = await ipc('harness.options', { id: 'opencode' });
  assert.equal((options as any[]).some((o) => o.id === 'mode'), false, 'a postura não vira seletor');
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'o2', task: 'oi', workspace, harness: 'opencode', harnessOptions: { mode: 'agent' } });
  await finished(ipc, run);
  assert.match(await lastText(ipc, 'o2'), /Modo: read-only\./, 'a postura vence, mesmo com a opção agrupada');
});

test('contrato: harness.options pede o id; agent.run aceita harnessOptions curtas e recusa o resto', () => {
  assert.equal(checkParams('harness.options', { id: 'opencode' }).ok, true);
  assert.equal(checkParams('harness.options', {}).ok, false);
  const base = { session: 's', task: 't', workspace: 'C:/w', harness: 'opencode' };
  assert.equal(checkParams('agent.run', { ...base, harnessOptions: { model: 'go/pro' } }).ok, true);
  assert.equal(checkParams('agent.run', { ...base, harnessOptions: { model: 5 } }).ok, false);
});

test('página: com um agente escolhido, a caixa pede os seletores dele e manda a escolha junto da tarefa', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.ok(PAGE.includes("api('harness.options'"), 'pede os seletores');
  assert.match(PAGE, /params\.harnessOptions = /, 'manda a escolha');
  assert.ok(PAGE.includes("t('console.hopts."), 'textos dos seletores pelo catálogo');
});
