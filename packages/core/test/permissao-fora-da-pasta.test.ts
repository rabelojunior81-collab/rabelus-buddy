// Permissão de harness para arquivo FORA da pasta de trabalho. A política nega sozinha ("fora do workspace"); com o
// Pai na conversa (interativo), o pedido vira aprovação, com o caminho completo, e a decisão dele vale. Sem o Pai
// (não interativo), continua negado. Na console, a linha diz quem negou e por quê.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

// Arquivo numa pasta temporária diferente da pasta de trabalho: fora do workspace.
function outsideFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-fora-'));
  const file = join(dir, 'segredo.txt');
  writeFileSync(file, 'conteúdo fora da pasta');
  return file;
}

test('arquivo fora da pasta de trabalho, com o Pai na conversa: vira aprovação com o caminho; aprovada, vale (permissão fora da pasta)', async () => {
  const file = outsideFile();
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission', FAKE_ACP_PERM_PATH: file });
  const { run } = await ipc('agent.run', { session: 'f1', task: 'edite o arquivo', workspace, harness: 'opencode', interactive: true });
  const ap = await until(async () => ((await ipc('approval.list')) as any[]).find((a) => a.session === 'f1'));
  assert.match(ap.action, /fora da pasta de trabalho/);
  assert.ok(ap.action.includes(file), 'a aprovação mostra o caminho completo');
  await ipc('approval.resolve', { id: ap.id, decision: 'approve' });
  await finished(ipc, run);
  assert.equal((await ipc('run.get', { id: run })).state, 'done');
  const ev = (await ipc('session.events', { session: 'f1' })) as Ev[];
  assert.match(lastText(ev), /Permissão: ok\./);
  const perm = ev.find((e) => e.kind === 'harness.permission')!.payload;
  assert.equal(perm.outside, true);
  assert.equal(perm.decision, 'approve');
});

test('arquivo fora da pasta de trabalho, sem o Pai (não interativo): nenhuma aprovação, negado (permissão fora da pasta)', async () => {
  const file = outsideFile();
  const { ipc, workspace } = await owner({ FAKE_ACP_PROMPT: 'permission', FAKE_ACP_PERM_PATH: file });
  const { run } = await ipc('agent.run', { session: 'f2', task: 'edite o arquivo', workspace, harness: 'opencode', interactive: false });
  await finished(ipc, run);
  const aps = ((await ipc('approval.list')) as any[]).filter((a) => a.session === 'f2');
  assert.equal(aps.length, 0, 'nenhuma aprovação é criada');
  const ev = (await ipc('session.events', { session: 'f2' })) as Ev[];
  const perm = ev.find((e) => e.kind === 'harness.permission')!.payload;
  assert.equal(perm.decision, 'deny');
  assert.equal(perm.outside, true);
  assert.match(lastText(ev), /Permissão: no\./);
});

test('página da console: a linha de permissão diz quem negou e por quê (chaves deniedByPolicy e deniedByYou nos dois idiomas)', async () => {
  const page = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.ok(page.includes("t('console.harness.deniedByPolicy'"), 'a página usa a chave deniedByPolicy');
  assert.ok(page.includes("t('console.harness.deniedByYou'"), 'a página usa a chave deniedByYou');
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as any;
    assert.equal(typeof cat.console.harness.deniedByPolicy, 'string', `${lang}: deniedByPolicy`);
    assert.equal(typeof cat.console.harness.deniedByYou, 'string', `${lang}: deniedByYou`);
  }
});
