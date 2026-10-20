// SPEC 0002, critério 8 (M1.4): a ferramenta `delegate` do Buddy abre uma sessão num harness por ACP e traz a
// resposta. As permissões do harness chegam ao Pai como aprovação com o nome (e o ícone) de quem pede. Parar a
// execução do Buddy encerra a sessão delegada. A delegação é um efeito com identidade no log.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
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
const done = (content: string) => ({ json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } });
const delegateCall = (args: Record<string, unknown>) => ({ json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'd1', type: 'function', function: { name: 'delegate', arguments: JSON.stringify(args) } }] } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } });

// O modelo do Buddy (falso): no primeiro passo delega; no segundo, responde com o que voltou da ferramenta.
async function buddy(env: NodeJS.ProcessEnv, args: Record<string, unknown> = { harness: 'opencode', task: 'leia o README' }) {
  const bodies: any[] = [];
  const llm = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    const body = (typeof c.body === 'string' ? JSON.parse(c.body) : c.body) as any;
    bodies.push(body);
    if (bodies.length === 1) return delegateCall(args);
    const tool = body.messages.find((m: any) => m.role === 'tool');
    return done(`Resumo: ${tool?.content ?? ''}`);
  });
  const reg = await fakeHttp(() => ({ json: REG }));
  servers.push(llm, reg);
  const home = tempHome();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${llm.url}/v1` }] }));
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, OPENCODE_GO_API_KEY: 'chave-falsa', OLLAMA_CLOUD_API_KEY: '', OPENROUTER_API_KEY: '', ...env }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  // Como a console ao abrir: harness.list traz o registro; a lista da delegação usa a cópia local, sem rede.
  assert.ok(((await ipc('harness.list')).harnesses as any[]).some((h) => h.id === 'opencode' && h.found));
  return { ipc, bodies };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
const finished = (ipc: (m: string, p?: Record<string, unknown>) => Promise<any>, run: string) => until(async () => { const r = await ipc('run.get', { id: run }); return r.state !== 'running' ? r : undefined; });

test('delegate: o Buddy abre uma sessão no harness e traz a resposta, com efeito de identidade (critério 8)', async () => {
  const { ipc, bodies } = await buddy({ FAKE_ACP_MODE: 'ok' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'd1', task: 'peça ao OpenCode um resumo do README', workspace });
  const r = await finished(ipc, run);
  assert.equal(r.state, 'done');

  // A ferramenta existe para o modelo, com os harnesses encontrados.
  const spec = bodies[0].tools.find((t: any) => t.function?.name === 'delegate');
  assert.ok(spec, 'ferramenta delegate oferecida ao modelo');
  assert.ok(spec.function.parameters.properties.harness.enum.includes('opencode'));
  // A resposta do harness voltou ao modelo como resultado da ferramenta.
  const result = JSON.parse(bodies[1].messages.find((m: any) => m.role === 'tool').content);
  assert.deepEqual([result.ok, result.harness, result.stopReason, result.text], [true, 'opencode', 'end_turn', 'Olá, Pai.']);

  const ev = (await ipc('session.events', { session: 'd1' })) as { kind: string; payload: any }[];
  const intent = ev.find((e) => e.kind === 'effect.intent' && e.payload.kind === 'harness.delegate')!.payload;
  assert.deepEqual([intent.key, intent.target], [`${run}:d1`, 'opencode']);
  assert.ok(ev.some((e) => e.kind === 'effect.receipt' && e.payload.effect === intent.effect && e.payload.result.stopReason === 'end_turn'));
  assert.deepEqual(ev.filter((e) => e.kind === 'harness.delegated').map((e) => [e.payload.run, e.payload.id, e.payload.phase]), [[run, 'opencode', 'start'], [run, 'opencode', 'end']]);
  assert.ok(ev.some((e) => e.kind === 'harness.tool' && e.payload.run === run && e.payload.title === 'Lendo README.md'), 'o andamento do harness fica no log da execução');
  assert.match(ev.filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content, /Resumo: .*Olá, Pai\./);
});

test('delegate: a permissão do harness chega ao Pai com o nome de quem pede; aprovada, o harness segue (critério 8)', async () => {
  const { ipc, bodies } = await buddy({ FAKE_ACP_MODE: 'ok', FAKE_ACP_PROMPT: 'permission' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'd2', task: 'peça ao OpenCode para editar o README', workspace, interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'd2'));
  assert.match(ap.action, /^Harness OpenCode: write_file README\.md$/, 'a console tira o ícone do nome no começo da ação');
  await ipc('approval.resolve', { id: ap.id, decision: 'approve' });
  assert.equal((await finished(ipc, run)).state, 'done');
  const result = JSON.parse(bodies[1].messages.find((m: any) => m.role === 'tool').content);
  assert.equal(result.text, 'Olá, Pai. Permissão: ok.');
  const ev = (await ipc('session.events', { session: 'd2' })) as { kind: string; payload: any }[];
  assert.deepEqual(ev.filter((e) => e.kind === 'harness.permission').map((e) => [e.payload.run, e.payload.decision]), [[run, 'approve']]);
});

test('delegate: negar a permissão encerra a sessão delegada e o Buddy recebe a recusa (critério 8)', async () => {
  const { ipc, bodies } = await buddy({ FAKE_ACP_MODE: 'ok', FAKE_ACP_PROMPT: 'permission', FAKE_ACP_DENY_ENDS: '1' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'd3', task: 'peça ao OpenCode para editar', workspace, interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'd3'));
  await ipc('approval.resolve', { id: ap.id, decision: 'deny' });
  assert.equal((await finished(ipc, run)).state, 'done', 'o Buddy segue com a recusa');
  const result = JSON.parse(bodies[1].messages.find((m: any) => m.role === 'tool').content);
  assert.deepEqual([result.ok, result.reason], [false, 'permissionDenied']);
});

test('delegate: parar a execução do Buddy encerra a sessão delegada (session/cancel) e a execução para por quem usa (critério 8)', async () => {
  const { ipc, bodies } = await buddy({ FAKE_ACP_MODE: 'ok', FAKE_ACP_GAP: '1500' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'd4', task: 'delegue algo longo', workspace });
  await until(async () => { const l = await ipc('run.live', { session: 'd4' }); return l.running?.reasoning?.includes('Pensando na tarefa') ? true : undefined; });
  await ipc('agent.stop', { session: 'd4' });
  const r = await finished(ipc, run);
  assert.equal(r.state, 'stopped');
  const ev = (await ipc('session.events', { session: 'd4' })) as { kind: string; payload: any }[];
  assert.equal(ev.find((e) => e.kind === 'run.stopped')!.payload.reason, 'userStopped');
  assert.equal(ev.filter((e) => e.kind === 'harness.delegated').at(-1)!.payload.stopReason, 'cancelled', 'o harness devolveu cancelled');
  assert.equal(bodies.length, 1, 'parado, o Buddy não chama o modelo de novo');
});

test('delegate: harness desconhecido volta ao modelo como recusa legível, sem abrir nada (critério 8)', async () => {
  const { ipc, bodies } = await buddy({ FAKE_ACP_MODE: 'ok' }, { harness: 'nao-existe', task: 'x' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 'd5', task: 'delegue', workspace });
  assert.equal((await finished(ipc, run)).state, 'done');
  const result = JSON.parse(bodies[1].messages.find((m: any) => m.role === 'tool').content);
  assert.deepEqual([result.ok, result.reason], [false, 'harnessUnavailable']);
  assert.match(result.message, /desconhecido: nao-existe/);
  const ev = (await ipc('session.events', { session: 'd5' })) as { kind: string; payload: any }[];
  assert.equal(ev.some((e) => e.kind === 'harness.delegated'), false);
});
