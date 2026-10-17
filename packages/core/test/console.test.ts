// Console web local (SPEC 0001 rev. 5, escopo 19; critérios 27, 28 e 30; ADR 0017).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { consolePath, CONSOLE_METHODS } from '../src/console.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

interface Res { status: number; body: string; type: string }
function request(port: number, method: string, path: string, { host = `127.0.0.1:${port}`, token, body }: { host?: string; token?: string; body?: unknown } = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, method, path, headers: { host, ...(token ? { 'x-rbuddy-token': token } : {}), ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}) } }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b, type: String(res.headers['content-type'] ?? '') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const api = async (port: number, token: string, method: string, params: unknown = {}) => {
  const r = await request(port, 'POST', `/api/${method}`, { token, body: params });
  const j = JSON.parse(r.body) as { result?: unknown; error?: { message: string } };
  if (r.status !== 200) throw new Error(`${r.status} ${j.error?.message}`);
  return j.result;
};
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
const consoleOf = (home: string) => JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };

test('console: só 127.0.0.1, com token e Host exato; sem token 401, Host estranho 403, nada acontece (critério 27)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const { port, token } = consoleOf(home);
  if (process.platform !== 'win32') assert.equal(statSync(consolePath(home)).mode & 0o777, 0o600);
  const st = (await call(endpointFor(home), 'daemon.status', {})) as { console?: { url: string } };
  assert.equal(st.console?.url, `http://127.0.0.1:${port}/?t=${token}`);

  assert.equal((await request(port, 'GET', '/')).status, 401);
  assert.equal((await request(port, 'GET', `/?t=errado`)).status, 401);
  assert.equal((await request(port, 'GET', `/?t=${token}`, { host: `evil.example:${port}` })).status, 403);
  assert.equal((await request(port, 'GET', `/?t=${token}`, { host: `localhost:${port}` })).status, 403, 'só o Host exato');
  const page = await request(port, 'GET', `/?t=${token}`);
  assert.equal(page.status, 200);
  assert.match(page.type, /text\/html/);

  // API: sem token, com Host estranho e método fora da lista não fazem nada.
  const secret = `canario-${Date.now()}`;
  assert.equal((await request(port, 'POST', '/api/keys.set', { body: { provider: 'ollama-cloud', key: secret } })).status, 401);
  assert.equal((await request(port, 'POST', '/api/keys.set', { token, host: `evil.example:${port}`, body: { provider: 'ollama-cloud', key: secret } })).status, 403);
  assert.equal((await request(port, 'POST', '/api/event.append', { token, body: { session: 'x', kind: 'y', payload: {} } })).status, 404);
  assert.equal((await request(port, 'POST', '/api/daemon.stop', { token })).status, 404);
  const prov = (await api(port, token, 'providers.status')) as { provider: string; source: unknown }[];
  assert.equal(prov.length, 4, 'com token, a API responde');
  assert.equal(prov.some((p) => JSON.stringify(p).includes(secret)), false, 'a chave recusada não entrou');
  assert.equal(CONSOLE_METHODS.includes('event.append' as never), false);
});

test('console: toda chave de catálogo usada pela página existe em pt-BR e en (critério 28)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const { port, token } = consoleOf(home);
  const page = (await request(port, 'GET', `/?t=${token}`)).body;
  const used = new Set<string>([...page.matchAll(/data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_.]+)"/g), ...page.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]!));
  assert.ok(used.size > 30, `a página usa ${used.size} chaves`);
  for (const lang of ['pt-BR', 'en']) {
    const r = await request(port, 'GET', `/i18n/${lang}.json`, { token });
    assert.equal(r.status, 200);
    const cat = JSON.parse(r.body) as Record<string, unknown>;
    const has = (k: string) => k.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), cat) !== undefined;
    // Chave montada (termina em "."): todos os valores possíveis precisam existir; outra montagem reprova.
    const DYN: Record<string, string[]> = { 'console.effort.': ['default', 'low', 'medium', 'high'], 'status.state.': ['running', 'done', 'interrupted', 'stopped'] };
    const expanded = [...used].flatMap((k) => (k.endsWith('.') ? (DYN[k] ?? [`${k}<montagem desconhecida>`]).map((v) => k + v) : [k]));
    assert.deepEqual(expanded.filter((k) => !has(k)).sort(), [], `${lang}: chaves ausentes`);
  }
  assert.equal((await request(port, 'GET', '/i18n/pt-BR.json')).status, 401, 'catálogo também exige token');
});

test('console: rodar com esforço, aprovar pela console, continuar a conversa, retomar; chave nunca volta (critério 30)', async () => {
  let turn = 0;
  const fake = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    turn++;
    if (turn === 1) return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'w1', type: 'function', function: { name: 'write_file', arguments: JSON.stringify({ path: 'nota.txt', content: 'olá' }) } }] } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } };
    return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: `resposta ${turn}` } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } };
  });
  const home = tempHome();
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${fake.url}/v1` }] }));
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', OPENCODE_GO_API_KEY: '', OLLAMA_CLOUD_API_KEY: '', OPENROUTER_API_KEY: '' }));
  const { port, token } = consoleOf(home);

  // Chave guardada pela console: aparece só como origem.
  const secret = `canario-${Date.now()}-go`;
  await api(port, token, 'keys.set', { provider: 'opencode-go', key: secret });
  const prov = await request(port, 'POST', '/api/providers.status', { token });
  assert.equal(prov.body.includes(secret), false);
  assert.deepEqual((JSON.parse(prov.body).result as { provider: string; source: unknown }[]).find((p) => p.provider === 'opencode-go')?.source, { kind: 'keys' });

  const defaults = (await api(port, token, 'console.defaults')) as { workspace: string; routes: unknown[] };
  assert.ok(defaults.workspace.length > 0);
  const { run } = (await api(port, token, 'agent.run', { session: 'scon', task: 'escreva', workspace, interactive: true, effort: 'low' })) as { run: string };
  const ap = await until(async () => ((await api(port, token, 'approval.list')) as { id: string; session: string }[]).find((a) => a.session === 'scon'));
  await api(port, token, 'approval.resolve', { id: ap.id, decision: 'approve' });
  await until(async () => (((await api(port, token, 'run.get', { id: run })) as { state: string }).state === 'done' ? true : undefined));
  assert.equal(readFileSync(join(workspace, 'nota.txt'), 'utf8'), 'olá');
  const evs = (await api(port, token, 'session.events', { session: 'scon' })) as { kind: string; payload: { effort?: string } }[];
  assert.equal(evs.find((e) => e.kind === 'agent.step')?.payload.effort, 'low');

  const { run: run2 } = (await api(port, token, 'agent.run', { session: 'scon', task: 'e agora?', workspace, interactive: true, continueFrom: run })) as { run: string };
  await until(async () => (((await api(port, token, 'run.get', { id: run2 })) as { state: string }).state === 'done' ? true : undefined));
  await assert.rejects(api(port, token, 'agent.resume', { run: run2, workspace }), /só se retoma/);
  await fake.close();
});

test('console: uso da console conta como atividade (o dono ocioso não se desliga com ela aberta)', async () => {
  const home = tempHome();
  const o = await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', RBUDDY_IDLE_MS: '1500' });
  owners.push(o);
  const { port, token } = consoleOf(home);
  const t0 = Date.now();
  while (Date.now() - t0 < 4000) { await api(port, token, 'run.list'); await new Promise((r) => setTimeout(r, 300)); }
  assert.equal(o.exitCode, null, 'ainda no ar');
  const code = await new Promise<number | null>((r) => { if (o.exitCode !== null) r(o.exitCode); else o.once('exit', (c) => r(c)); });
  assert.equal(code, 0, 'sem a console, desliga');
});

test('console: arquivos da página não carregam nada de fora (sem CDN, sem script externo)', () => {
  const dir = join(import.meta.dirname, '..', 'console');
  for (const f of readdirSync(dir)) {
    const s = readFileSync(join(dir, f), 'utf8');
    assert.doesNotMatch(s, /(src|href)=["']https?:\/\//, `${f} carrega recurso externo`);
  }
});
