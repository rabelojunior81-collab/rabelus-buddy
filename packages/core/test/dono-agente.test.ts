// O dono executa o agente (SPEC 0001, escopos 2, 7, 11 e 12; critérios 4, 5 e 26 com provedor falso).
// Provedor: servidor HTTP falso compatível com Chat Completions, no lugar do OpenCode Go (config.json).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';
import { DEFAULT_ROUTES, loadConfig, buildRoutes } from '../src/config.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

interface Run { id: string; session: string; state: string }
interface Approval { id: string; session: string; action: string; state: string }

const chat = (message: Record<string, unknown>, finish: string) => ({ json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', ...message } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } });
const writeCall = (path: string, content: string) => chat({ content: null, tool_calls: [{ id: 'w1', type: 'function', function: { name: 'write_file', arguments: JSON.stringify({ path, content }) } }] }, 'tool_calls');

async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await f();
    if (v !== undefined) return v;
    if (Date.now() - t0 > ms) throw new Error('tempo esgotado esperando a condição');
    await new Promise((r) => setTimeout(r, 50));
  }
}

function homeWithFake(url: string): { home: string; workspace: string } {
  const home = tempHome();
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${url}/v1` }] }));
  return { home, workspace };
}

test('configuração: rotas padrão na ordem da ADR 0015 e só entram provedores com credencial', () => {
  assert.deepEqual(DEFAULT_ROUTES.map((r) => r.provider), ['opencode-go', 'ollama-cloud', 'chatgpt', 'openrouter']);
  const home = tempHome();
  assert.deepEqual(loadConfig(home).routes, DEFAULT_ROUTES);
  const routes = buildRoutes(home, loadConfig(home), { OPENCODE_GO_API_KEY: 'k1', OPENROUTER_API_KEY: 'k3' });
  assert.deepEqual(routes.map((r) => `${r.provider.id}/${r.model}`), ['opencode-go/kimi-k3', 'openrouter/nvidia/nemotron-3.5-super-vl:free']);
  // Chave guardada pelo login vale como a da variável de ambiente.
  mkdirSync(join(home, 'credentials'), { recursive: true });
  writeFileSync(join(home, 'credentials', 'keys.json'), JSON.stringify({ 'ollama-cloud': 'k2' }));
  assert.deepEqual(buildRoutes(home, loadConfig(home), {}).map((r) => r.provider.id), ['ollama-cloud']);
});

test('dono roda o agente: pede aprovação, a aprovação chega pelo IPC e a tarefa termina (escopo 2, 11)', async () => {
  let turn = 0;
  const fake = await fakeHttp((c: Captured) => (c.path.endsWith('/chat/completions') ? (++turn === 1 ? writeCall('nota.txt', 'olá') : chat({ content: 'fim' }, 'stop')) : { status: 404 }));
  const { home, workspace } = homeWithFake(fake.url);
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' }));
  const ep = endpointFor(home);
  const { run } = (await call(ep, 'agent.run', { session: 'sx', task: 'escreva uma nota', workspace, interactive: true })) as { run: string };
  const ap = await until(async () => ((await call(ep, 'approval.list', {})) as Approval[]).find((a) => a.session === 'sx'));
  assert.equal(ap.action, 'write_file nota.txt');
  await call(ep, 'approval.resolve', { id: ap.id, decision: 'approve' });
  const done = await until(async () => { const r = (await call(ep, 'run.get', { id: run })) as Run; return r.state === 'running' ? undefined : r; });
  assert.equal(done.state, 'done');
  assert.equal(readFileSync(join(workspace, 'nota.txt'), 'utf8'), 'olá');
  const kinds = ((await call(ep, 'session.events', { session: 'sx' })) as { kind: string }[]).map((e) => e.kind);
  for (const k of ['approval.requested', 'approval.resolved', 'budget.reserved', 'budget.settled', 'file.written', 'run.finished']) assert.ok(kinds.includes(k), `falta ${k}`);
  assert.ok(((await call(ep, 'run.list', {})) as Run[]).some((r) => r.id === run && r.state === 'done'));
  await fake.close();
});

test('kill -9 com a chamada ao modelo em curso, reinício e agent.resume: tarefa vai ao fim sem escrita duplicada (critérios 4, 5 e 26)', async () => {
  let turn = 0;
  let hangNow = true;
  const fake = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    turn++;
    if (turn === 1) return writeCall('a.txt', 'um');
    if (hangNow) return { hang: true };
    return chat({ content: 'fim' }, 'stop');
  });
  const { home, workspace } = homeWithFake(fake.url);
  const owner = await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' });
  owners.push(owner);
  const ep = endpointFor(home);
  // Concessão de projeto para a escrita, sem humano (a tarefa roda sem terminal).
  await call(ep, 'policy.grant', { scope: 'project', tool: 'write_file', pattern: '*.txt', session: 'sk' });
  const { run } = (await call(ep, 'agent.run', { session: 'sk', task: 'escrever', workspace, interactive: false })) as { run: string };
  await until(async () => (turn >= 2 ? true : undefined));
  await killHard(owner);

  hangNow = false;
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' }));
  assert.equal(((await call(ep, 'run.get', { id: run })) as Run).state, 'interrupted');
  await call(ep, 'agent.resume', { session: 'sk', run, workspace, interactive: false });
  const done = await until(async () => { const r = (await call(ep, 'run.get', { id: run })) as Run; return r.state === 'running' ? undefined : r; });
  assert.equal(done.state, 'done');
  assert.equal(readFileSync(join(workspace, 'a.txt'), 'utf8'), 'um');
  const kinds = ((await call(ep, 'session.events', { session: 'sk' })) as { kind: string }[]).map((e) => e.kind);
  assert.equal(kinds.filter((k) => k === 'file.written').length, 1, 'escrita uma vez');
  assert.ok(kinds.includes('run.interrupted') && kinds.includes('run.resumed') && kinds.includes('effect.reconciled'));
  await fake.close();
});

test('dono ocioso se desliga sozinho (a próxima tarefa sobe outro com as credenciais atuais); com execução rodando, fica', async () => {
  const home = tempHome();
  const ep = endpointFor(home);
  const o = await spawnOwner(home, { RBUDDY_IDLE_MS: '1500' });
  owners.push(o);
  // Esperar o processo sair, sem falar com o dono (cada chamada conta como atividade).
  const code = await new Promise<number | null>((r) => { if (o.exitCode !== null) r(o.exitCode); else o.once('exit', (c) => r(c)); });
  assert.equal(code, 0, 'ocioso: saiu do ar sozinho');
  await assert.rejects(call(ep, 'daemon.status', {}));

  const fake = await fakeHttp(() => ({ hang: true }));
  const { home: h2, workspace } = homeWithFake(fake.url);
  const ep2 = endpointFor(h2);
  owners.push(await spawnOwner(h2, { RBUDDY_IDLE_MS: '1500', OPENCODE_GO_API_KEY: 'chave-falsa' }));
  await call(ep2, 'agent.run', { session: 'si', task: 'longa', workspace, interactive: false });
  await new Promise((r) => setTimeout(r, 4000));
  assert.ok(await call(ep2, 'daemon.status', {}), 'com execução rodando, o dono fica');
  await call(ep2, 'daemon.stop', {});
  await fake.close();
});

test('rota escolhida por execução: só o provedor pedido, com o modelo pedido', () => {
  const home = tempHome();
  const env = { OPENCODE_GO_API_KEY: 'k1', OPENROUTER_API_KEY: 'k3' };
  const one = buildRoutes(home, loadConfig(home), env, { provider: 'openrouter', model: 'outro/modelo:free' });
  assert.deepEqual(one.map((r) => `${r.provider.id}/${r.model}`), ['openrouter/outro/modelo:free']);
  assert.deepEqual(buildRoutes(home, loadConfig(home), env, { provider: 'chatgpt', model: 'gpt-6.1-sol' }), [], 'sem credencial, nada');
});

test('dono: agent.run com esforço, rota escolhida e continuação da conversa (rev. 5)', async () => {
  const seen: Record<string, unknown>[] = [];
  const fake = await fakeHttp((c: Captured) => { if (!c.path.endsWith('/chat/completions')) return { status: 404 }; seen.push(c.body); return chat({ content: `resposta ${seen.length}` }, 'stop'); });
  const { home, workspace } = homeWithFake(fake.url);
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' }));
  const ep = endpointFor(home);
  const waitDone = (run: string) => until(async () => { const r = (await call(ep, 'run.get', { id: run })) as Run; return r.state === 'running' ? undefined : r; });
  const { run: r1 } = (await call(ep, 'agent.run', { session: 'sc', task: 'primeira', workspace, effort: 'low', route: { provider: 'opencode-go', model: 'kimi-k3' } })) as { run: string };
  assert.equal((await waitDone(r1)).state, 'done');
  assert.equal(seen[0]?.reasoning_effort, 'low');
  const { run: r2 } = (await call(ep, 'agent.run', { session: 'sc', task: 'segunda', workspace, continueFrom: r1 })) as { run: string };
  assert.equal((await waitDone(r2)).state, 'done');
  const msgs = (seen[1]?.messages as { role: string; content: string }[]).map((m) => `${m.role}:${m.content}`);
  assert.deepEqual(msgs.slice(1), ['user:primeira', 'assistant:resposta 1', 'user:segunda']);
  assert.equal(seen[1]?.reasoning_effort, undefined, 'esforço padrão na segunda');
  await assert.rejects(call(ep, 'agent.run', { session: 'sc', task: 'x', workspace, effort: 'altíssimo' }), /esforço/);
  await fake.close();
});

test('dono: chaves e provedores pelo núcleo (a chave nunca volta); login do ChatGPT iniciado pelo núcleo', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: '', OPENROUTER_API_KEY: '', OLLAMA_CLOUD_API_KEY: '' }));
  const ep = endpointFor(home);
  const secret = `canario-${Date.now()}-chave`;
  const set = await call(ep, 'keys.set', { provider: 'ollama-cloud', key: secret });
  assert.equal(JSON.stringify(set).includes(secret), false);
  const st = (await call(ep, 'providers.status', {})) as { provider: string; model: string; source: { kind: string } | null }[];
  assert.equal(JSON.stringify(st).includes(secret), false, 'a chave nunca volta');
  assert.deepEqual(st.find((p) => p.provider === 'ollama-cloud')?.source, { kind: 'keys' });
  assert.equal(st.find((p) => p.provider === 'opencode-go')?.source, null);
  await assert.rejects(call(ep, 'keys.set', { provider: 'chatgpt', key: 'x' }), /provedor/);
  await call(ep, 'keys.remove', { provider: 'ollama-cloud' });
  assert.equal(((await call(ep, 'providers.status', {})) as { provider: string; source: unknown }[]).find((p) => p.provider === 'ollama-cloud')?.source, null);

  const { url } = (await call(ep, 'auth.chatgpt.start', {})) as { url: string };
  assert.match(url, /^https:\/\/auth\.openai\.com\/api\/accounts\/authorize\?/);
  assert.match(new URL(url).searchParams.get('ext_agent_host_id') ?? '', /^urn:uuid:/);
  const auth = (await call(ep, 'auth.chatgpt.status', {})) as { loggedIn: boolean; pending: boolean };
  assert.deepEqual({ loggedIn: auth.loggedIn, pending: auth.pending }, { loggedIn: false, pending: true });
  await call(ep, 'daemon.stop', {});
});

test('retomar mantém o esforço e a rota escolhidos para a execução (achado no ensaio da console)', async () => {
  const seen: Record<string, unknown>[] = [];
  let hang = true;
  const fake = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    seen.push(c.body);
    if (hang) return { hang: true };
    return chat({ content: 'fim' }, 'stop');
  });
  const { home, workspace } = homeWithFake(fake.url);
  const owner = await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa', RBUDDY_CONSOLE: '0' });
  owners.push(owner);
  const ep = endpointFor(home);
  const { run } = (await call(ep, 'agent.run', { session: 'sr', task: 'x', workspace, effort: 'high', route: { provider: 'opencode-go', model: 'kimi-k3' } })) as { run: string };
  await until(async () => (seen.length >= 1 ? true : undefined));
  await killHard(owner);
  hang = false;
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa', RBUDDY_CONSOLE: '0' }));
  await call(ep, 'agent.resume', { run, workspace });
  await until(async () => (((await call(ep, 'run.get', { id: run })) as Run).state === 'done' ? true : undefined));
  assert.equal(seen.at(-1)?.reasoning_effort, 'high', 'o esforço da execução volta na retomada');
  await fake.close();
});
