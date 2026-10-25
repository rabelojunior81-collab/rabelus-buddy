// Postura do próprio agente (pedido do Pai em 2026-10-25: "uma forma de trabalhar com o opencode, sem essa contenção,
// da maneira que ele mesmo se configura"). Por padrão, o Buddy impõe a postura dele: o OpenCode recebe "permission ask"
// no processo filho e o Codex, o modo read-only. Com a postura "do agente" (harnessPosture: 'native'), o Buddy não
// injeta nada: o agente segue a própria configuração, o seletor de modo dele aparece, e o que ele ainda perguntar
// continua chegando ao Pai pelo cartão. A escolha fica registrada no log.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { checkParams } from '../src/contract.ts';
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

test('contrato: agent.run e harness.options aceitam a postura buddy ou native, e recusam o resto', () => {
  const base = { session: 's', task: 't', workspace: 'C:/w', harness: 'opencode' };
  for (const v of ['buddy', 'native']) {
    assert.equal(checkParams('agent.run', { ...base, harnessPosture: v }).ok, true, v);
    assert.equal(checkParams('harness.options', { id: 'opencode', posture: v }).ok, true, v);
  }
  assert.equal(checkParams('agent.run', { ...base, harnessPosture: 'livre' }).ok, false);
});

test('postura do Buddy (padrão): o OpenCode recebe "permission ask" e o modo read-only é imposto', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_MODES: '1', FAKE_ACP_ECHO_CONFIG: '1' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'p1', task: 'oi', workspace, harness: 'opencode' });
  await finished(ipc, run);
  const t = await lastText(ipc, 'p1');
  assert.match(t, /Modo: read-only\./);
  assert.match(t, /Config: ask\./);
});

test('postura do agente: nada é injetado, o modo dele fica, e a escolha vai para o log', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_MODES: '1', FAKE_ACP_ECHO_CONFIG: '1' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'p2', task: 'oi', workspace, harness: 'opencode', harnessPosture: 'native' });
  await finished(ipc, run);
  const t = await lastText(ipc, 'p2');
  assert.match(t, /Modo: agent\./, 'o modo do próprio agente fica');
  assert.match(t, /Config: nenhuma\./, 'nenhuma configuração injetada');
  const ev = (await ipc('session.events', { session: 'p2' })) as any[];
  assert.equal(ev.find((e) => e.kind === 'harness.posture')?.payload.posture, 'native');
});

test('postura do agente: o seletor de modo dele aparece (na do Buddy, o modo é a postura e não vira seletor)', async () => {
  const ipc = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_GROUPED_MODE: '1' });
  const buddy = (await ipc('harness.options', { id: 'opencode' })).options as any[];
  assert.equal(buddy.some((o) => o.id === 'mode'), false);
  const nativa = (await ipc('harness.options', { id: 'opencode', posture: 'native' })).options as any[];
  assert.equal(nativa.some((o) => o.id === 'mode'), true);
});

test('console: a escolha de postura por agente, com aviso, pelo catálogo nas duas línguas', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(PAGE, /params\.harnessPosture = /, 'manda a postura junto da tarefa');
  assert.ok(PAGE.includes("'rb.posture.'"), 'guardada por agente');
  assert.ok(PAGE.includes("t('console.posture.nativeWarn'"), 'aviso quando é do agente');
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8'));
    for (const k of ['label', 'buddy', 'native', 'nativeWarn']) assert.ok(cat.console.posture?.[k], `${lang}: ${k}`);
  }
});
