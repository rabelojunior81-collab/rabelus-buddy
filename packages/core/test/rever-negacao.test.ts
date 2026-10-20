// Rever a negação de primeira execução (A1): o Pai nega a primeira execução de um harness que baixa código; a decisão
// não vira definitiva. `harness.firstRun.reset` pede um pedido novo e a negação antiga continua no log.
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

// PATH falso, igual ao de primeira-execucao.test.ts: um `codex` (sinal de instalação) e um `npx` que sobe o harness falso.
function fakePath(calls: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-rever-'));
  if (process.platform === 'win32') {
    writeFileSync(join(dir, 'codex.cmd'), '@echo off\r\n');
    writeFileSync(join(dir, 'npx.cmd'), `@echo off\r\necho %*>> "${calls}"\r\n"${process.execPath}" "${FAKE}"\r\n`);
  } else {
    writeFileSync(join(dir, 'codex'), '#!/bin/sh\n'); chmodSync(join(dir, 'codex'), 0o755);
    writeFileSync(join(dir, 'npx'), `#!/bin/sh\necho "$@" >> "${calls}"\nexec "${process.execPath}" "${FAKE}"\n`); chmodSync(join(dir, 'npx'), 0o755);
  }
  return dir;
}

type Ev = { kind: string; payload: Record<string, any> };

test('rever negação: negada a primeira execução, harness.firstRun.reset pede de novo; a negação antiga fica no log; aprovada, roda', async () => {
  const reg = await fakeHttp(() => ({ json: { version: '1.0.0', agents: [{ id: 'codex-acp', name: 'Codex', version: '2.2.2', description: 'ACP adapter for OpenAI Codex', license: 'Apache-2.0', distribution: { npx: { package: '@agentclientprotocol/codex-acp@2.2.2' } } }] } }));
  const home = tempHome();
  const calls = join(home, 'npx-chamadas.txt');
  owners.push(await spawnOwner(home, { PATH: fakePath(calls), FAKE_ACP_MODE: 'ok', RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json` }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<Record<string, any>>;

  // 1. Pedido, depois negação.
  const a1 = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(a1.state, 'aprovacao');
  await ipc('approval.resolve', { id: a1.approval, decision: 'deny' });
  assert.equal((await ipc('harness.probe', { id: 'codex-acp' })).state, 'negado');
  assert.equal(((await ipc('approval.list')) as unknown as unknown[]).length, 0);

  // 2. Rever: pedido novo, pendente, com o mesmo pacote.
  const r = await ipc('harness.firstRun.reset', { id: 'codex-acp' });
  assert.ok(r.approval, 'devolve o id da aprovação nova');
  assert.notEqual(r.approval, a1.approval);
  const pend = (await ipc('approval.list')) as unknown as { id: string; action: string }[];
  assert.equal(pend.length, 1);
  assert.equal(pend[0]!.id, r.approval);
  assert.match(pend[0]!.action, /@agentclientprotocol\/codex-acp@2\.2\.2/);

  // 3. O log guarda o reset e a negação antiga continua lá.
  const evs = (await ipc('session.events', { session: 'harness' })) as unknown as Ev[];
  const reset = evs.find((e) => e.kind === 'harness.approval.reset');
  assert.ok(reset, 'evento harness.approval.reset no log');
  assert.equal(reset.payload.package, '@agentclientprotocol/codex-acp@2.2.2');
  assert.equal(reset.payload.id, 'codex-acp');
  assert.equal(reset.payload.previous, a1.approval);
  assert.ok(evs.some((e) => e.kind === 'harness.approval.requested' && e.payload.approval === a1.approval), 'o pedido antigo continua no log');
  assert.equal((await ipc('approval.get', { id: a1.approval })).state, 'denied', 'a negação antiga não foi apagada');

  // A sonda agora aguarda a aprovação nova, sem duplicar o pedido.
  const again = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(again.state, 'aprovacao');
  assert.equal(again.approval, r.approval);

  // 4. Aprovada a nova: roda e deixa de dar 'negado'.
  await ipc('approval.resolve', { id: r.approval, decision: 'approve' });
  const ok = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(ok.state, 'pronto');
  assert.notEqual(ok.state, 'negado');
  await reg.close();
});

test('harness.firstRun.reset é recusado quando o harness não está negado (nenhum pedido, ou pendente, ou aprovado)', async () => {
  const reg = await fakeHttp(() => ({ json: { version: '1.0.0', agents: [{ id: 'codex-acp', name: 'Codex', version: '2.2.2', description: 'x', license: 'Apache-2.0', distribution: { npx: { package: '@agentclientprotocol/codex-acp@2.2.2' } } }] } }));
  const home = tempHome();
  const calls = join(home, 'npx-chamadas.txt');
  owners.push(await spawnOwner(home, { PATH: fakePath(calls), FAKE_ACP_MODE: 'ok', RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json` }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<Record<string, any>>;

  // Sem nenhum pedido ainda.
  await assert.rejects(ipc('harness.firstRun.reset', { id: 'codex-acp' }), /negad|não está/i);
  // Com pedido pendente.
  const a = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(a.state, 'aprovacao');
  await assert.rejects(ipc('harness.firstRun.reset', { id: 'codex-acp' }), /negad|não está/i);
  assert.equal(((await ipc('approval.list')) as unknown as unknown[]).length, 1, 'não criou pedido extra');
  // Aprovado: também recusado.
  await ipc('approval.resolve', { id: a.approval, decision: 'approve' });
  await assert.rejects(ipc('harness.firstRun.reset', { id: 'codex-acp' }), /negad|não está/i);
  // Id desconhecido também é recusado.
  await assert.rejects(ipc('harness.firstRun.reset', { id: 'nao-existe' }));
  await reg.close();
});

test('a console tem o botão "Rever decisão" ligado ao método novo, com as chaves nos dois idiomas', () => {
  const page = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(page, /api\('harness\.firstRun\.reset'/);
  assert.match(page, /t\('console\.harness\.firstRun\.review'/);
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as { console: { harness: Record<string, Record<string, string>> } };
    for (const k of ['review', 'reviewed']) assert.equal(typeof cat.console.harness.firstRun?.[k], 'string', `${lang}: console.harness.firstRun.${k}`);
  }
});
