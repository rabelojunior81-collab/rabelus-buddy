// rbuddy run | status | log | resume | providers | login <chave> (SPEC 0001, escopo 16; critérios 23 e 26).
// Provedor: servidor HTTP falso no lugar do OpenCode Go (config.json). O dono sobe sob demanda.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, type Io } from '../src/main.ts';
import { createI18n } from '../../client/src/i18n.ts';
import { call } from '../../client/src/ipc.ts';
import { fakeHttp, type Captured } from '../../core/test/fake-http.ts';
import { endpointFor } from '../../core/src/paths.ts';
import { keysPath } from '../../core/src/config.ts';

const pt = createI18n('pt-BR').t;
const en = createI18n('en').t;
const homes: string[] = [];
after(async () => { for (const h of homes) { try { await call(endpointFor(h), 'daemon.stop', {}); } catch { /* já parado */ } } });

const chat = (message: Record<string, unknown>, finish: string) => ({ json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', ...message } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } });
const writeCall = (path: string, content: string) => chat({ content: null, tool_calls: [{ id: 'w1', type: 'function', function: { name: 'write_file', arguments: JSON.stringify({ path, content }) } }] }, 'tool_calls');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Linha do catálogo com as variáveis marcadas '*' livres: casa a linha inteira.
function line(t: typeof pt, key: string, vars: Record<string, unknown>): RegExp {
  const marked = t(key, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v === '*' ? '\u0000' : v])));
  return new RegExp(`^${marked.split('\u0000').map(escape).join('.+')}$`);
}

function capture(): Io & { lines: string[]; errs: string[] } {
  const lines: string[] = [];
  const errs: string[] = [];
  return { lines, errs, out: (s) => lines.push(...s.split('\n')), err: (s) => errs.push(...s.split('\n')) };
}

function setup(url: string) {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-cli-'));
  homes.push(home);
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-cli-ws-'));
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${url}/v1` }] }));
  const env = { ...process.env, RBUDDY_HOME: home, OPENCODE_GO_API_KEY: 'chave-falsa-cli' } as NodeJS.ProcessEnv;
  delete env.RBUDDY_LANG;
  return { home, workspace, env };
}

test('rbuddy run: sobe o dono, pede aprovação no terminal, escreve e termina; log mostra aprovação e consumo (critério 26 com provedor falso)', async () => {
  let turn = 0;
  const fake = await fakeHttp((c: Captured) => (c.path.endsWith('/chat/completions') ? (++turn === 1 ? writeCall('nota.txt', 'olá') : chat({ content: 'pronto' }, 'stop')) : { status: 404 }));
  const { home, workspace, env } = setup(fake.url);
  const io = capture();
  const asked: string[] = [];
  const code = await run(['run', 'escreva uma nota'], env, io, { cwd: workspace, interactive: true, prompt: async (q) => { asked.push(q); return 's'; } });
  assert.equal(code, 0, io.errs.join('\n'));
  assert.deepEqual(asked, [pt('run.ask', { action: 'write_file nota.txt' })]);
  assert.equal(readFileSync(join(workspace, 'nota.txt'), 'utf8'), 'olá');
  assert.ok(io.lines.includes('pronto'), 'a resposta final aparece');
  const session = /ses-[0-9a-f]{8}/.exec(io.lines.join('\n'))?.[0];
  const runId = /run-[0-9a-f]{8}/.exec(io.lines.join('\n'))?.[0];
  assert.ok(session && runId, 'sessão e execução aparecem na saída');
  assert.ok(io.lines.includes(pt('run.started', { run: runId, session })));
  assert.ok(io.lines.includes(pt('run.done', { run: runId })));

  // log: aprovação, consumo e escrita, pelo catálogo, sem o conteúdo da conversa.
  const lg = capture();
  assert.equal(await run(['log', session], env, lg, {}), 0);
  const text = lg.lines.join('\n');
  assert.match(text, new RegExp(escape(pt('log.approvalRequested', { action: 'write_file nota.txt' }))));
  assert.match(text, new RegExp(escape(pt('log.approvalResolved', { decision: pt('log.approved') }))));
  assert.equal(lg.lines.filter((l) => line(pt, 'log.settled', { amount: '*', route: 'opencode-go/kimi-k3' }).test(l)).length, 2, 'duas chamadas liquidadas');
  assert.match(text, new RegExp(escape(pt('log.fileWritten', { path: 'nota.txt' }))));
  assert.doesNotMatch(text, /escreva uma nota|pronto/, 'sem conteúdo da conversa no log');

  // status: o dono e a execução concluída; --lang en muda a saída.
  const st = capture();
  assert.equal(await run(['status'], env, st, {}), 0);
  assert.match(st.lines[0] ?? '', line(pt, 'status.header', { pid: '*', runs: '*' }));
  assert.ok(st.lines.includes(pt('status.run', { run: runId, session, state: pt('status.state.done') })));
  const stEn = capture();
  assert.equal(await run(['status', '--lang', 'en'], env, stEn, {}), 0);
  assert.match(stEn.lines[0] ?? '', line(en, 'status.header', { pid: '*', runs: '*' }));
  assert.ok(stEn.lines.includes(en('status.run', { run: runId, session, state: en('status.state.done') })));
  assert.notEqual(pt('status.state.done'), en('status.state.done'));
  await fake.close();
  void home;
});

test('rbuddy run sem terminal: aprovação negada pela política; a execução termina com a recusa devolvida ao modelo', async () => {
  let turn = 0;
  const fake = await fakeHttp((c: Captured) => (c.path.endsWith('/chat/completions') ? (++turn === 1 ? writeCall('x.txt', '1') : chat({ content: 'não deu' }, 'stop')) : { status: 404 }));
  const { workspace, env } = setup(fake.url);
  const io = capture();
  const code = await run(['run', 'tente escrever'], env, io, { cwd: workspace, interactive: false, prompt: async () => { throw new Error('não deveria perguntar'); } });
  assert.equal(code, 0, io.errs.join('\n'));
  assert.equal(existsSync(join(workspace, 'x.txt')), false);
  await fake.close();
});

test('rbuddy resume: execução parada por efeito desconhecido volta e termina; resume de execução concluída é recusado', async () => {
  let turn = 0;
  let fail = true;
  const fake = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    turn++;
    if (fail) return { status: 500, json: { error: { message: 'queda' } } };
    return chat({ content: 'fim' }, 'stop');
  });
  const { workspace, env } = setup(fake.url);
  const io = capture();
  const code = await run(['run', 'tarefa'], env, io, { cwd: workspace, interactive: false });
  assert.equal(code, 1, 'parou');
  const runId = /run-[0-9a-f]{8}/.exec(io.lines.join('\n'))?.[0];
  assert.ok(runId);
  assert.ok(io.errs.some((l) => l === pt('run.stopped', { reason: 'effect.unknown' })));
  fail = false;
  const r2 = capture();
  assert.equal(await run(['resume', runId], env, r2, { cwd: workspace, interactive: false }), 0, r2.errs.join('\n'));
  assert.ok(r2.lines.includes('fim'));
  assert.ok(r2.lines.includes(pt('run.done', { run: runId })));
  const r3 = capture();
  assert.equal(await run(['resume', runId], env, r3, { cwd: workspace, interactive: false }), 1);
  assert.deepEqual(r3.errs, [pt('run.cannotResume', { run: runId, state: 'done' })]);
  assert.ok(turn >= 2);
  await fake.close();
});

test('rbuddy login opencode-go: a chave entra pelo prompt sem eco, fica só do dono e nunca aparece na saída; providers mostra a ordem', async () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-cli-'));
  const env = { ...process.env, RBUDDY_HOME: home } as NodeJS.ProcessEnv;
  delete env.RBUDDY_LANG;
  for (const k of ['OPENCODE_GO_API_KEY', 'OLLAMA_CLOUD_API_KEY', 'OPENROUTER_API_KEY']) delete env[k];
  const io = capture();
  const secret = 'sk-canario-0123456789';
  let hidden: boolean | undefined;
  assert.equal(await run(['login', 'opencode-go'], env, io, { prompt: async (_q, opts) => { hidden = opts?.hidden; return secret; } }), 0);
  assert.equal(hidden, true, 'a chave é lida sem eco');
  assert.deepEqual(io.lines, [pt('keys.saved', { provider: 'opencode-go' })]);
  assert.equal(io.lines.join('').includes(secret), false);
  assert.equal(JSON.parse(readFileSync(keysPath(home), 'utf8'))['opencode-go'], secret);
  if (process.platform !== 'win32') assert.equal(statSync(keysPath(home)).mode & 0o777, 0o600);

  const pv = capture();
  assert.equal(await run(['providers'], env, pv, {}), 0);
  assert.deepEqual(pv.lines, [
    pt('providers.header'),
    pt('providers.ready', { n: 1, route: 'opencode-go/kimi-k3' }),
    pt('providers.missing', { n: 2, route: 'ollama-cloud/gpt-oss:20b' }),
    pt('providers.missing', { n: 3, route: 'chatgpt/gpt-6.1-sol' }),
    pt('providers.missing', { n: 4, route: 'openrouter/nvidia/nemotron-3.5-super-vl:free' }),
  ]);

  const lo = capture();
  assert.equal(await run(['logout', 'opencode-go'], env, lo, {}), 0);
  assert.deepEqual(lo.lines, [pt('keys.removed', { provider: 'opencode-go' })]);
  assert.equal(JSON.parse(readFileSync(keysPath(home), 'utf8'))['opencode-go'], undefined);

  const bad = capture();
  assert.equal(await run(['login', 'opencode-go'], env, bad, { prompt: async () => '' }), 1);
  assert.deepEqual(bad.errs, [pt('keys.empty')]);
});
