// SPEC 0002, critério 5: conversa por ACP. A tarefa vai ao harness por session/prompt; o andamento aparece ao vivo
// no run.live (raciocínio, ferramenta, texto); a resposta final entra na conversa; a chamada é um efeito com
// identidade no log. Parar envia session/cancel. Permissão do harness: negada e registrada até a M1.2d.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
// Servidores falsos fechados aqui também: com um teste vermelho, a asserção falha antes do reg.close() do próprio
// teste e o processo não terminava (2026-10-18).
const regs: { close: () => Promise<void> }[] = [];
after(async () => { for (const o of owners) await killHard(o); for (const r of regs) await r.close().catch(() => {}); });

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
function fakeOpencode(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-oc-'));
  if (process.platform === 'win32') writeFileSync(join(dir, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(dir, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(dir, 'opencode'), 0o755); }
  return dir;
}
const REG = { version: '1.0.0', agents: [
  { id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './opencode.exe', args: ['acp'] } } } },
  { id: 'codex-acp', name: 'Codex', version: '2.2.2', description: 'x', license: 'Apache-2.0', distribution: { npx: { package: '@agentclientprotocol/codex-acp@2.2.2' } } },
] };
async function owner(env: NodeJS.ProcessEnv) {
  const reg = await fakeHttp(() => ({ json: REG }));
  regs.push(reg);
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, ...env }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  return { home, ipc, reg };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}

test('conversa por ACP: andamento ao vivo, resposta na conversa e efeito com identidade (critério 5)', async () => {
  const { home, ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_GAP: '400' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 's1', task: 'leia o README', workspace, harness: 'opencode' });
  // Ao vivo: a ferramenta e depois o texto aparecem enquanto o harness trabalha.
  const tool = await until(async () => { const l = await ipc('run.live', { session: 's1' }); return l.running?.tool ? l.running : undefined; });
  assert.equal(tool.tool, 'Lendo README.md');
  assert.match(tool.route, /opencode/);
  await until(async () => { const l = await ipc('run.live', { session: 's1' }); return l.running?.text?.includes('Olá') ? true : undefined; });
  await until(async () => ((await ipc('run.get', { id: run })).state === 'done' ? true : undefined));
  const ev = (await ipc('session.events', { session: 's1' })) as { kind: string; payload: any }[];
  const said = ev.filter((e) => e.kind === 'agent.message').map((e) => [e.payload.message.role, e.payload.message.content]);
  assert.deepEqual(said, [['user', 'leia o README'], ['assistant', 'Olá, Pai.']]);
  assert.match(ev.find((e) => e.kind === 'agent.reasoning')!.payload.text, /Pensando na tarefa: leia o README/);
  assert.deepEqual(ev.filter((e) => e.kind === 'harness.tool').map((e) => [e.payload.title, e.payload.status]), [['Lendo README.md', 'pending'], ['Lendo README.md', 'completed']]);
  const intent = ev.find((e) => e.kind === 'effect.intent')!.payload;
  assert.deepEqual([intent.kind, intent.key, intent.target], ['harness.prompt', `${run}:acp:opencode`, 'opencode']);
  assert.ok(ev.some((e) => e.kind === 'effect.receipt' && e.payload.effect === intent.effect && e.payload.result.stopReason === 'end_turn'));
  assert.equal((await ipc('run.live', { session: 's1' })).running, null, 'andamento limpo no fim');
  void home; await reg.close();
});

test('parar a conversa por ACP envia session/cancel e a execução para por quem usa (critério 5)', async () => {
  const { ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_GAP: '1500' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 's2', task: 'tarefa longa', workspace, harness: 'opencode' });
  await until(async () => { const l = await ipc('run.live', { session: 's2' }); return l.running?.reasoning ? true : undefined; });
  await ipc('agent.stop', { session: 's2' });
  const r = await until(async () => { const x = await ipc('run.get', { id: run }); return x.state !== 'running' ? x : undefined; });
  assert.equal(r.state, 'stopped');
  const ev = (await ipc('session.events', { session: 's2' })) as { kind: string; payload: any }[];
  assert.equal(ev.find((e) => e.kind === 'run.stopped')!.payload.reason, 'userStopped');
  await reg.close();
});

test('permissão pedida pelo harness: negada e registrada até a M1.2d; a conversa termina (critério 5)', async () => {
  const { ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_PROMPT: 'permission' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 's3', task: 'edite o README', workspace, harness: 'opencode' });
  await until(async () => ((await ipc('run.get', { id: run })).state === 'done' ? true : undefined));
  const ev = (await ipc('session.events', { session: 's3' })) as { kind: string; payload: any }[];
  const perm = ev.find((e) => e.kind === 'harness.permission')!.payload;
  assert.deepEqual([perm.title, perm.outcome], ['Editar README.md', 'cancelled']);
  assert.match(ev.filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content, /Permissão: cancelled/);
  await reg.close();
});

// Checagem real de 2026-10-18: o OpenCode anuncia o que vai fazer, usa a ferramenta e responde; sem separação, o texto
// chegava colado ("...create the output.**O que li:**").
test('texto antes e depois de uma ferramenta vira parágrafos separados na resposta (critério 5)', async () => {
  const { ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_PREAMBLE: 'Vou ler o README.' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 's5', task: 'leia', workspace, harness: 'opencode' });
  await until(async () => ((await ipc('run.get', { id: run })).state === 'done' ? true : undefined));
  const ev = (await ipc('session.events', { session: 's5' })) as { kind: string; payload: any }[];
  assert.equal(ev.filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content, 'Vou ler o README.\n\nOlá, Pai.');
  await reg.close();
});

test('harness que baixa código sem aprovação: a conversa é recusada antes de iniciar, com motivo claro (critérios 4 e 5)', async () => {
  const { ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  await assert.rejects(ipc('agent.run', { session: 's4', task: 'oi', workspace, harness: 'codex-acp' }), /aprovação/);
  assert.equal(((await ipc('run.list')) as unknown[]).length, 0, 'nenhuma execução começou');
  await reg.close();
});
