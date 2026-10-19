// SPEC 0002, critério 10: contrato tipado da console. Todo método de CONSOLE_METHODS tem esquema; entrada
// inválida volta 400 com mensagem clara e não chega ao núcleo (nenhum evento novo no log).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { consolePath, CONSOLE_METHODS } from '../src/console.ts';
import { CONSOLE_SCHEMAS, checkParams } from '../src/contract.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

function post(port: number, token: string, method: string, raw: string): Promise<{ status: number; body: { result?: unknown; error?: { code: number; message: string } } }> {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, method: 'POST', path: `/api/${method}`, headers: { host: `127.0.0.1:${port}`, 'x-rbuddy-token': token, 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) } }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(b) as never }));
    });
    r.on('error', reject);
    r.write(raw);
    r.end();
  });
}

test('contrato: todo método da console tem esquema, e nenhum esquema sobra (critério 10)', () => {
  assert.deepEqual(Object.keys(CONSOLE_SCHEMAS).sort(), [...CONSOLE_METHODS].sort());
});

test('contrato: cada chamada literal da página cabe no esquema do método (critério 10)', () => {
  const page = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const calls = [...page.matchAll(/api\('([a-z.]+)'(?:,\s*\{([^}]*)\})?\)/g)];
  assert.ok(calls.length >= 15, `chamadas achadas: ${calls.length}`);
  for (const [, method, body] of calls) {
    assert.ok((CONSOLE_METHODS as readonly string[]).includes(method!), `${method} fora da lista`);
    const keys = (body ?? '').split(',').map((s) => s.trim().split(':')[0]!.trim()).filter(Boolean);
    const shape = (CONSOLE_SCHEMAS[method as keyof typeof CONSOLE_SCHEMAS] as unknown as { shape: Record<string, unknown> }).shape;
    for (const k of keys) assert.ok(k in shape, `${method}: a página manda "${k}", que o esquema não conhece`);
  }
  // agent.run é montado em partes na página: os campos que ela usa estão todos no esquema.
  const run = (CONSOLE_SCHEMAS['agent.run'] as unknown as { shape: Record<string, unknown> }).shape;
  for (const k of ['session', 'task', 'workspace', 'interactive', 'effort', 'route', 'continueFrom']) assert.ok(k in run, `agent.run sem ${k}`);
});

test('contrato: a checagem pura diz o campo e o motivo, em português (critério 10)', () => {
  const ok = checkParams('agent.run', { session: 's1', task: 'oi', workspace: '/tmp/w', interactive: true, effort: 'low', route: { provider: 'chatgpt', model: 'gpt-6.1' } });
  assert.equal(ok.ok, true);
  const missing = checkParams('agent.run', { session: 's1', workspace: '/tmp/w' });
  assert.equal(missing.ok, false);
  assert.match(!missing.ok ? missing.message : '', /task: obrigatório/);
  const bad = checkParams('approval.resolve', { id: 'a1', decision: 'talvez' });
  assert.match(!bad.ok ? bad.message : '', /decision: deve ser um de: approve, deny/);
  const extra = checkParams('run.list', { foo: 1 });
  assert.match(!extra.ok ? extra.message : '', /campo desconhecido: foo/);
  const route = checkParams('agent.run', { session: 's', task: 't', workspace: 'w', route: { provider: 'acme', model: 'x' } });
  assert.match(!route.ok ? route.message : '', /route\.provider: deve ser um de/);
  const key = checkParams('keys.set', { provider: 'chatgpt', key: 'k' });
  assert.match(!key.ok ? key.message : '', /provider: deve ser um de: opencode-go, ollama-cloud, openrouter/);
  const empty = checkParams('agent.steer', { session: 's', text: 3 });
  assert.match(!empty.ok ? empty.message : '', /text: esperado texto/);
  const notObj = checkParams('run.list', [1, 2]);
  assert.match(!notObj.ok ? notObj.message : '', /esperado um objeto/);
});

// M1.5c: os oito níveis que os provedores declaram passam pelo contrato; outro valor continua recusado.
test('contrato: agent.run aceita os níveis de esforço declarados pelos provedores (M1.5c)', () => {
  for (const effort of ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra', 'default']) {
    assert.equal(checkParams('agent.run', { session: 's', task: 't', workspace: 'w', effort }).ok, true, effort);
  }
  assert.equal(checkParams('agent.run', { session: 's', task: 't', workspace: 'w', effort: 'altíssimo' }).ok, false);
});

// M1.2e: o "Entrar" da console nova (M1.5) chama harness.login com o harness e o método; nada além disso passa.
test('contrato: harness.login aceita só o harness e o método de login (critérios 7 e 10)', () => {
  assert.equal(checkParams('harness.login', { id: 'opencode', method: 'opencode-login' }).ok, true);
  const missing = checkParams('harness.login', { id: 'opencode' });
  assert.match(!missing.ok ? missing.message : '', /method: obrigatório/);
  const extra = checkParams('harness.login', { id: 'opencode', method: 'm', token: 'x' });
  assert.match(!extra.ok ? extra.message : '', /campo desconhecido: token/);
  const badId = checkParams('harness.login', { id: '../x', method: 'm' });
  assert.equal(badId.ok, false);
});

test('contrato: entrada inválida pela console volta 400, código -32602, e nada entra no log (critério 10)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const { port, token } = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };
  const events = async () => ((await call(endpointFor(home), 'daemon.status', {})) as { events: number }).events;
  const before = await events();
  const cases: [string, string, RegExp][] = [
    ['agent.run', JSON.stringify({ session: 's1', workspace: home }), /task: obrigatório/],
    ['agent.run', JSON.stringify({ session: 's1', task: 'oi', workspace: home, effort: 'turbo' }), /effort/],
    ['agent.run', JSON.stringify({ session: 's1', task: 'oi', workspace: home, route: { provider: 'acme', model: 'x' } }), /route\.provider/],
    ['approval.resolve', JSON.stringify({ id: 'a1', decision: 'talvez' }), /decision/],
    ['keys.set', JSON.stringify({ provider: 'chatgpt', key: 'k' }), /provider/],
    ['session.events', JSON.stringify({ session: 42 }), /session: esperado texto/],
    ['run.list', JSON.stringify({ foo: 1 }), /campo desconhecido: foo/],
    ['run.list', '[1,2]', /esperado um objeto/],
    ['run.list', '{quebrado', /JSON inválido/],
  ];
  for (const [method, raw, re] of cases) {
    const r = await post(port, token, method, raw);
    assert.equal(r.status, 400, `${method} ${raw}`);
    assert.equal(r.body.error?.code, -32602, `${method} ${raw}`);
    assert.match(r.body.error?.message ?? '', re, `${method} ${raw}`);
  }
  assert.equal(await events(), before, 'nenhum evento novo no log');
  // A mesma chamada, válida, passa: o contrato não barra o uso legítimo.
  const ok = await post(port, token, 'run.list', '{}');
  assert.equal(ok.status, 200);
});
