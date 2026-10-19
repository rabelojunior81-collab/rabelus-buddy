// SPEC 0002, critérios 5, 6, 7 e 11 (M1.5b): o harness escolhido na caixa da console nova. Pela própria console
// (HTTP, com token e contrato), a tarefa vai ao harness, a permissão chega como aprovação com o nome dele, e o pedido de
// login aparece com os métodos para o "Entrar". Na página: pílula de harness, sonda ao escolher, eventos do harness na
// conversa e cartão de aprovação com o ícone de quem pede.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consolePath } from '../src/console.ts';
import { CONSOLE_SCHEMAS } from '../src/contract.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });
const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');

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
async function consoleWith(env: NodeJS.ProcessEnv) {
  const reg = await fakeHttp(() => ({ json: REG }));
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, RBUDDY_CONSOLE_PORT: '0', FAKE_ACP_MODE: 'ok', ...env }));
  const { port, token } = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };
  const api = (method: string, params: unknown = {}) => new Promise<any>((resolve, reject) => {
    const data = JSON.stringify(params);
    const r = http.request({ host: '127.0.0.1', port, method: 'POST', path: `/api/${method}`, headers: { host: `127.0.0.1:${port}`, 'x-rbuddy-token': token, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c: string) => { b += c; });
      res.on('end', () => { const j = JSON.parse(b) as { result?: unknown; error?: { message: string } }; if (res.statusCode === 200) resolve(j.result); else reject(new Error(`${res.statusCode} ${j.error?.message}`)); });
    });
    r.on('error', reject); r.write(data); r.end();
  });
  return { api, workspace: mkdtempSync(join(tmpdir(), 'rbuddy-ws-')) };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
type Ev = { kind: string; payload: any };

test('pela console: a tarefa vai ao harness escolhido, a permissão vira aprovação com o nome dele, e a resposta volta (critérios 5, 6 e 11)', async () => {
  const { api, workspace } = await consoleWith({ FAKE_ACP_PROMPT: 'permission' });
  const { run } = await api('agent.run', { session: 'c1', task: 'edite o README', workspace, interactive: true, harness: 'opencode' });
  const ap = await until(async () => ((await api('approval.list')) as any[]).find((a) => a.session === 'c1'));
  assert.match(ap.action, /^Harness OpenCode: write_file README\.md$/);
  await api('approval.resolve', { id: ap.id, decision: 'approve' });
  await until(async () => ((await api('run.get', { id: run })).state === 'done' ? true : undefined));
  const ev = (await api('session.events', { session: 'c1' })) as Ev[];
  assert.match(ev.filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content, /Permissão: ok\./);
});

test('pela console: harness que pede login para a conversa com os métodos, e o Entrar faz o login (critérios 7 e 11)', async () => {
  const authFile = join(mkdtempSync(join(tmpdir(), 'rbuddy-auth-')), 'auth.json');
  const { api, workspace } = await consoleWith({ FAKE_ACP_MODE: 'auth', FAKE_ACP_AUTH_FILE: authFile });
  const { run } = await api('agent.run', { session: 'c2', task: 'oi', workspace, interactive: true, harness: 'opencode' });
  await until(async () => ((await api('run.get', { id: run })).state !== 'running' ? true : undefined));
  const req = ((await api('session.events', { session: 'c2' })) as Ev[]).find((e) => e.kind === 'harness.login.required')!.payload;
  assert.deepEqual(req.methods.map((m: { id: string }) => m.id), ['fake-login']);
  const r = await api('harness.login', { id: 'opencode', method: 'fake-login' });
  assert.equal(r.state, 'pronto');
});

// Funções puras da página.
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

test('cartão de aprovação: o harness que pede é achado pelo nome na ação, para mostrar o ícone dele (critério 6)', () => {
  const { approvalHarness } = pure<{ approvalHarness: (action: string, hs: { id: string; name: string }[]) => string | null }>(['approvalHarness']);
  const hs = [{ id: 'opencode', name: 'OpenCode' }, { id: 'codex-acp', name: 'Codex' }, { id: 'hermes', name: 'Hermes Agent' }];
  assert.equal(approvalHarness('Harness Codex: run_command npm install', hs), 'codex-acp');
  assert.equal(approvalHarness('Harness Hermes Agent: write_file a.md', hs), 'hermes');
  assert.equal(approvalHarness('write_file README.md', hs), null, 'aprovação do próprio Buddy');
  assert.equal(approvalHarness('Harness Desconhecido: x', hs), null);
});

test('estado do harness na pílula: a sonda vira uma palavra e um tom (critérios 3, 4 e 11)', () => {
  const { probeView } = pure<{ probeView: (r: { state: string }) => { key: string; tone: string } }>(['probeView']);
  assert.deepEqual(probeView({ state: 'pronto' }), { key: 'console.harness.state.pronto', tone: 'ok' });
  assert.deepEqual(probeView({ state: 'login' }), { key: 'console.harness.state.login', tone: 'warn' });
  assert.deepEqual(probeView({ state: 'aprovacao' }), { key: 'console.harness.state.aprovacao', tone: 'warn' });
  assert.deepEqual(probeView({ state: 'negado' }), { key: 'console.harness.state.negado', tone: 'bad' });
  assert.deepEqual(probeView({ state: 'falhou' }), { key: 'console.harness.state.falhou', tone: 'bad' });
  assert.deepEqual(probeView({ state: 'indisponivel' }), { key: 'console.harness.state.indisponivel', tone: 'bad' });
});

// Achados do ensaio com o OpenCode real (2026-10-19): "trabalha com cautela: modo build" era enganoso (a cautela do
// OpenCode vem do permission ask, e build não é cauteloso), e os estados das ferramentas apareciam em inglês.
test('postura dita como é: perguntar antes, somente leitura, ou só o modo, sem prometer cautela (critério 6)', () => {
  const { postureKey } = pure<{ postureKey: (p: { mode: string | null; config: string | null }) => string | null }>(['postureKey']);
  assert.equal(postureKey({ mode: 'build', config: 'permission ask' }), 'console.harness.postureAsk');
  assert.equal(postureKey({ mode: 'read-only', config: null }), 'console.harness.postureReadOnly');
  assert.equal(postureKey({ mode: 'agent', config: null }), 'console.harness.postureMode');
  assert.equal(postureKey({ mode: null, config: null }), null, 'sem postura conhecida, nada a dizer');
});

test('estado da ferramenta do harness em palavras do catálogo (critério 11)', () => {
  const { toolStatusKey } = pure<{ toolStatusKey: (s: string) => string | null }>(['toolStatusKey']);
  assert.equal(toolStatusKey('pending'), 'console.harness.status.pending');
  assert.equal(toolStatusKey('in_progress'), 'console.harness.status.in_progress');
  assert.equal(toolStatusKey('completed'), 'console.harness.status.completed');
  assert.equal(toolStatusKey('failed'), 'console.harness.status.failed');
  assert.equal(toolStatusKey('outra-coisa'), null);
});

// As chaves devolvidas pelas funções acima não passam pela varredura de t('…') da página: conferidas aqui.
test('as chaves de estado, postura e ferramenta existem nos dois idiomas (critério 28 do M0)', () => {
  const keys = [...['checking', 'pronto', 'login', 'aprovacao', 'negado', 'falhou', 'indisponivel'].map((s) => `console.harness.state.${s}`),
    'console.harness.postureAsk', 'console.harness.postureReadOnly', 'console.harness.postureMode',
    ...['pending', 'in_progress', 'completed', 'failed'].map((s) => `console.harness.status.${s}`)];
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as Record<string, unknown>;
    const get = (k: string) => k.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), cat);
    assert.deepEqual(keys.filter((k) => typeof get(k) !== 'string'), [], `${lang}: chaves ausentes`);
  }
});

test('página: pílula de harness com lista acessível, sonda ao escolher, login pelo Entrar, eventos do harness na conversa (critério 11)', () => {
  assert.match(PAGE, /id="hBtn"[^>]*aria-haspopup="listbox"[^>]*aria-expanded="false"/, 'pílula de harness');
  assert.match(PAGE, /id="hPop"[^>]*role="listbox"/, 'lista de harnesses');
  assert.ok(PAGE.includes("api('harness.probe', { id"), 'sonda ao escolher');
  assert.ok(PAGE.includes("api('harness.login', { id"), 'Entrar chama o login do harness');
  assert.match(PAGE, /params\.harness = /, 'a tarefa leva o harness escolhido');
  for (const k of ['harness.tool', 'harness.permission', 'harness.posture', 'harness.unasked', 'harness.error', 'harness.login.required']) assert.ok(PAGE.includes(`case '${k}':`), `a conversa mostra ${k}`);
  // Ensaio (2026-10-19): a conversa era desenhada antes de chegar a lista de harnesses e mostrava "opencode" no lugar
  // de "OpenCode"; quando a lista chega, a conversa é redesenhada com os nomes.
  assert.match(PAGE, /harnesses = r\.harnesses\.filter\(\(h\) => h\.found\);\s*lastFeedKey = '';/, 'a conversa refaz os nomes quando a lista de harnesses chega');
  // O contrato da console aceita o campo que a página manda.
  assert.ok('harness' in (CONSOLE_SCHEMAS['agent.run'] as unknown as { shape: Record<string, unknown> }).shape);
});
