// SPEC 0002, critério 6: permissão pelo núcleo. Um session/request_permission do harness vira decisão da política;
// se for "ask", aparece como aprovação com o nome do harness, a ação e o alvo. Negar devolve a recusa ao harness,
// aprovar devolve a escolha, e a concessão de sessão vale para os pedidos seguintes iguais. Medido em 2026-10-18
// (docs/20-conhecimento/acp-permissoes-dos-harnesses.md): na configuração padrão, o OpenCode e o Codex escrevem sem
// perguntar; o núcleo define a postura ao abrir a sessão (modo read-only; permission ask) e avisa escrita sem pedido.
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
after(async () => { for (const o of owners) await killHard(o); });

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
type Ev = { kind: string; payload: any };
async function owner(env: NodeJS.ProcessEnv) {
  const reg = await fakeHttp(() => ({ json: REG }));
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, FAKE_ACP_MODE: 'ok', ...env }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  return { ipc, workspace };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
const finished = (ipc: (m: string, p?: Record<string, unknown>) => Promise<any>, run: string) =>
  until(async () => ((await ipc('run.get', { id: run })).state !== 'running' ? true : undefined));
const lastText = (ev: Ev[]) => ev.filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content as string;

test('pedido de escrita do harness vira aprovação com nome, ação e alvo; aprovar devolve a escolha ao harness (critério 6)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission' });
  const { run } = await ipc('agent.run', { session: 'p1', task: 'edite o README', workspace, harness: 'opencode', interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'p1'));
  assert.match(ap.action, /OpenCode/);
  assert.match(ap.action, /write_file README\.md/);
  assert.equal((await ipc('run.live', { session: 'p1' })).running.phase, 'approval', 'a conversa mostra que espera o Pai');
  await ipc('approval.resolve', { id: ap.id, decision: 'approve' });
  await finished(ipc, run);
  assert.equal((await ipc('run.get', { id: run })).state, 'done');
  const ev = (await ipc('session.events', { session: 'p1' })) as Ev[];
  assert.match(lastText(ev), /Permissão: ok\./);
  const perm = ev.find((e) => e.kind === 'harness.permission')!.payload;
  assert.deepEqual([perm.tool, perm.target, perm.decision, perm.outcome], ['write_file', 'README.md', 'approve', 'ok']);
  // Efeito com identidade: o pedido de permissão tem intenção e recibo no log.
  const intent = ev.find((e) => e.kind === 'effect.intent' && e.payload.kind === 'harness.permission')!.payload;
  assert.equal(intent.key, `${run}:perm:t2`);
  assert.ok(ev.some((e) => e.kind === 'effect.receipt' && e.payload.effect === intent.effect && e.payload.result.outcome === 'ok'));
});

test('negar na console devolve a recusa ao harness e nada é concedido (critério 6)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission' });
  const { run } = await ipc('agent.run', { session: 'p2', task: 'edite o README', workspace, harness: 'opencode', interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'p2'));
  await ipc('approval.resolve', { id: ap.id, decision: 'deny' });
  await finished(ipc, run);
  const ev = (await ipc('session.events', { session: 'p2' })) as Ev[];
  assert.match(lastText(ev), /Permissão: no\./);
  assert.deepEqual([ev.find((e) => e.kind === 'harness.permission')!.payload.decision], ['deny']);
  assert.equal(ev.filter((e) => e.kind === 'policy.grant.created').length, 0);
});

test('concessão de sessão vale para o pedido seguinte igual, sem perguntar de novo (critério 6)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission' });
  await ipc('policy.grant', { scope: 'session', tool: 'write_file', pattern: 'README.md', session: 'p3' });
  const { run } = await ipc('agent.run', { session: 'p3', task: 'edite o README', workspace, harness: 'opencode', interactive: true });
  await finished(ipc, run);
  const ev = (await ipc('session.events', { session: 'p3' })) as Ev[];
  assert.match(lastText(ev), /Permissão: ok\./);
  assert.equal(ev.find((e) => e.kind === 'harness.permission')!.payload.decision, 'allow');
  assert.equal(ev.filter((e) => e.kind === 'approval.requested').length, 0, 'nenhuma aprovação pedida');
});

test('comando pedido pelo harness pede aprovação de uma vez, com o comando à vista (critério 6; ADR 0009)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission', FAKE_ACP_PERM_KIND: 'execute' });
  const { run } = await ipc('agent.run', { session: 'p4', task: 'instale', workspace, harness: 'opencode', interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'p4'));
  assert.match(ap.action, /run_command npm install/);
  await ipc('approval.resolve', { id: ap.id, decision: 'approve' });
  await finished(ipc, run);
  assert.match(lastText((await ipc('session.events', { session: 'p4' })) as Ev[]), /Permissão: ok\./);
});

test('postura ao abrir a sessão: modo read-only quando o harness declara, permission ask para o OpenCode (critério 6)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_MODES: '1', FAKE_ACP_ECHO_CONFIG: '1' });
  const { run } = await ipc('agent.run', { session: 'p5', task: 'oi', workspace, harness: 'opencode' });
  await finished(ipc, run);
  const ev = (await ipc('session.events', { session: 'p5' })) as Ev[];
  assert.match(lastText(ev), /Modo: read-only\. Config: ask\./);
  assert.deepEqual(ev.find((e) => e.kind === 'harness.posture')!.payload.mode, 'read-only');
});

test('escrita concluída sem pedido de permissão vira aviso registrado (critério 6)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'unasked' });
  const { run } = await ipc('agent.run', { session: 'p6', task: 'escreva', workspace, harness: 'opencode' });
  await finished(ipc, run);
  const ev = (await ipc('session.events', { session: 'p6' })) as Ev[];
  const w = ev.find((e) => e.kind === 'harness.unasked')!.payload;
  assert.deepEqual([w.title, w.kind], ['Escrevendo saida.txt', 'edit']);
});
