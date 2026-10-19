// SPEC 0002, critério 7: autenticação do próprio agente (M1.2e, só no núcleo; o "Entrar" na tela é da M1.5 e o login
// do Pai num harness real, do ensaio da M1.6, por decisão do Pai em 2026-10-19). Com auth_required, o núcleo diz
// quais métodos o harness oferece e chama authenticate com o escolhido; o harness abre o navegador e guarda a própria
// credencial, que nunca passa pelo núcleo nem pelo log. Método do tipo terminal não vai ao authenticate (o ACP proíbe,
// e o Pai não faz nada por terminal).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor, dbPathFor } from '../src/paths.ts';
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
const SECRET = 'credencial-do-harness-fake-7f3a9c';
async function owner(env: NodeJS.ProcessEnv = {}) {
  const reg = await fakeHttp(() => ({ json: REG }));
  const home = tempHome();
  const authFile = join(mkdtempSync(join(tmpdir(), 'rbuddy-auth-')), 'auth.json');
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, FAKE_ACP_MODE: 'auth', FAKE_ACP_AUTH_FILE: authFile, ...env }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  return { ipc, home, authFile, workspace: mkdtempSync(join(tmpdir(), 'rbuddy-ws-')) };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
const finished = (ipc: (m: string, p?: Record<string, unknown>) => Promise<any>, run: string) =>
  until(async () => ((await ipc('run.get', { id: run })).state !== 'running' ? true : undefined));

test('conversa com harness que pede login: para por needsLogin e diz os métodos que ele oferece, sem os de terminal (critério 7)', async () => {
  const { ipc, workspace } = await owner({ FAKE_ACP_TERMINAL_AUTH: '1' });
  const { run } = await ipc('agent.run', { session: 'l1', task: 'oi', workspace, harness: 'opencode' });
  await finished(ipc, run);
  const ev = (await ipc('session.events', { session: 'l1' })) as Ev[];
  assert.equal(ev.find((e) => e.kind === 'run.stopped')!.payload.reason, 'needsLogin');
  const req = ev.find((e) => e.kind === 'harness.login.required')!.payload;
  assert.equal(req.id, 'opencode');
  assert.deepEqual(req.methods, [{ id: 'fake-login', name: 'Login with Fake' }]);
});

test('entrar: o núcleo chama authenticate, o harness fica pronto e a conversa seguinte roda; a credencial nunca passa pelo núcleo (critério 7)', async () => {
  const { ipc, home, authFile, workspace } = await owner();
  const r = await ipc('harness.login', { id: 'opencode', method: 'fake-login' });
  assert.equal(r.state, 'pronto');
  assert.ok(existsSync(authFile), 'quem guarda a credencial é o harness');
  const { run } = await ipc('agent.run', { session: 'l2', task: 'oi', workspace, harness: 'opencode' });
  await finished(ipc, run);
  assert.equal((await ipc('run.get', { id: run })).state, 'done');
  const ev = (await ipc('session.events', { session: 'harness' })) as Ev[];
  assert.deepEqual(ev.filter((e) => e.kind === 'harness.login').map((e) => [e.payload.id, e.payload.method, e.payload.state]), [['opencode', 'fake-login', 'pronto']]);
  // Nenhum rastro da credencial no banco do núcleo.
  assert.equal(readFileSync(dbPathFor(home)).includes(Buffer.from(SECRET)), false);
});

test('login recusado no navegador: volta "login" com o motivo, e nada fica pronto (critério 7)', async () => {
  const { ipc } = await owner({ FAKE_ACP_AUTH_FAIL: '1' });
  const r = await ipc('harness.login', { id: 'opencode', method: 'fake-login' });
  assert.equal(r.state, 'login');
  assert.match(r.reason, /recusado/);
});

// O harness precisa iniciar para declarar os métodos (initialize); a recusa vem antes do authenticate.
test('método do tipo terminal é recusado antes do authenticate; método desconhecido também (critério 7)', async () => {
  const { ipc } = await owner({ FAKE_ACP_TERMINAL_AUTH: '1' });
  await assert.rejects(ipc('harness.login', { id: 'opencode', method: 'fake-terminal' }), /terminal/);
  await assert.rejects(ipc('harness.login', { id: 'opencode', method: 'nao-existe' }), /método de login desconhecido/);
  assert.equal(((await ipc('session.events', { session: 'harness' })) as Ev[]).filter((e) => e.kind === 'harness.login').length, 0);
});
