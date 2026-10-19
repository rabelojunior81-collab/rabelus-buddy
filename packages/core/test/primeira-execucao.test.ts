// SPEC 0002, critério 4: primeira execução de harness que baixa código (npx, uvx) é aprovada pelo Pai, com pacote e
// versão exatos. Negada, nada roda; aprovada, a mesma versão não pergunta de novo; versão nova pergunta.
// Caso real que motivou a ordem: o Codex (codex-cli 0.163.0) não fala ACP direto; o caminho é o adaptador
// npx @agentclientprotocol/codex-acp, medido em 2026-10-18.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');

// PATH falso: um `codex` (o sinal de instalação) e um `npx` que anota a chamada e sobe o harness falso.
function fakePath(calls: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-npx-'));
  if (process.platform === 'win32') {
    writeFileSync(join(dir, 'codex.cmd'), '@echo off\r\n');
    writeFileSync(join(dir, 'npx.cmd'), `@echo off\r\necho %*>> "${calls}"\r\n"${process.execPath}" "${FAKE}"\r\n`);
  } else {
    writeFileSync(join(dir, 'codex'), '#!/bin/sh\n'); chmodSync(join(dir, 'codex'), 0o755);
    writeFileSync(join(dir, 'npx'), `#!/bin/sh\necho "$@" >> "${calls}"\nexec "${process.execPath}" "${FAKE}"\n`); chmodSync(join(dir, 'npx'), 0o755);
  }
  return dir;
}

test('primeira execução: pede aprovação com pacote@versão sem rodar nada; negada, nada roda; versão nova pergunta; aprovada, roda e não pergunta de novo (critério 4)', async () => {
  let version = '2.2.2';
  const reg = await fakeHttp(() => ({ json: { version: '1.0.0', agents: [{ id: 'codex-acp', name: 'Codex', version, description: 'ACP adapter for OpenAI Codex', license: 'Apache-2.0', distribution: { npx: { package: `@agentclientprotocol/codex-acp@${version}` } } }] } }));
  const home = tempHome();
  const calls = join(home, 'npx-chamadas.txt');
  owners.push(await spawnOwner(home, { PATH: fakePath(calls), FAKE_ACP_MODE: 'ok', RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json` }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<Record<string, any>>;

  // 1. Primeira vez: pedido de aprovação com o pacote exato; nada roda.
  const a1 = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(a1.state, 'aprovacao');
  assert.equal(a1.package, '@agentclientprotocol/codex-acp@2.2.2');
  const pend = (await ipc('approval.list')) as unknown as { id: string; action: string }[];
  const ap = pend.find((x) => x.id === a1.approval)!;
  assert.match(ap.action, /@agentclientprotocol\/codex-acp@2\.2\.2/);
  assert.match(ap.action, /Codex/);
  assert.equal(existsSync(calls), false, 'nada rodou antes da aprovação');
  // Pendente não duplica.
  assert.equal((await ipc('harness.probe', { id: 'codex-acp' })).approval, a1.approval);
  assert.equal(((await ipc('approval.list')) as unknown as unknown[]).length, 1);

  // 2. Negada: nada roda, e não volta a perguntar para esta versão.
  await ipc('approval.resolve', { id: a1.approval, decision: 'deny' });
  const neg = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(neg.state, 'negado');
  assert.equal(existsSync(calls), false, 'negada: nada rodou');
  assert.equal(((await ipc('approval.list')) as unknown as unknown[]).length, 0);

  // 3. Versão nova no registro: pergunta de novo.
  version = '2.2.3';
  await ipc('harness.list', { refresh: true });
  const a2 = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(a2.state, 'aprovacao');
  assert.equal(a2.package, '@agentclientprotocol/codex-acp@2.2.3');
  assert.notEqual(a2.approval, a1.approval);

  // 4. Aprovada: roda com o pacote exato e fica pronto; a mesma versão não pergunta de novo.
  await ipc('approval.resolve', { id: a2.approval, decision: 'approve' });
  const ok = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(ok.state, 'pronto');
  assert.match(readFileSync(calls, 'utf8'), /-y @agentclientprotocol\/codex-acp@2\.2\.3/);
  const again = await ipc('harness.probe', { id: 'codex-acp' });
  assert.equal(again.state, 'pronto');
  assert.equal(((await ipc('approval.list')) as unknown as unknown[]).length, 0, 'aprovada: não pergunta de novo');
  await reg.close();
});

// Achado do Pai (2026-10-18): aprovou o Codex e "não houve nenhuma entrega ou mudança". Aprovar agora roda a sonda
// na hora e devolve o resultado, que a console mostra no painel Aprovações.
test('aprovar a primeira execução roda a sonda na hora e devolve o resultado; negar devolve negado (critério 4, retorno visível)', async () => {
  const reg = await fakeHttp(() => ({ json: { version: '1.0.0', agents: [{ id: 'codex-acp', name: 'Codex', version: '2.2.2', description: 'x', license: 'Apache-2.0', distribution: { npx: { package: '@agentclientprotocol/codex-acp@2.2.2' } } }, { id: 'pi-acp', name: 'pi ACP', version: '0.0.34', description: 'x', license: 'MIT', distribution: { npx: { package: 'pi-acp@0.0.34' } } }] } }));
  const home = tempHome();
  const calls = join(home, 'npx-chamadas.txt');
  const dir = fakePath(calls);
  writeFileSync(join(dir, process.platform === 'win32' ? 'pi.cmd' : 'pi'), process.platform === 'win32' ? '@echo off\r\n' : '#!/bin/sh\n');
  if (process.platform !== 'win32') chmodSync(join(dir, 'pi'), 0o755);
  owners.push(await spawnOwner(home, { PATH: dir, FAKE_ACP_MODE: 'ok', RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json` }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<Record<string, any>>;
  const a = await ipc('harness.probe', { id: 'codex-acp' });
  const ok = await ipc('approval.resolve', { id: a.approval, decision: 'approve' });
  assert.equal(ok.state, 'approved');
  assert.deepEqual([ok.harness?.id, ok.harness?.name, ok.harness?.state], ['codex-acp', 'Codex', 'pronto']);
  const b = await ipc('harness.probe', { id: 'pi-acp' });
  const no = await ipc('approval.resolve', { id: b.approval, decision: 'deny' });
  assert.deepEqual([no.harness?.id, no.harness?.state], ['pi-acp', 'negado']);
  // Aprovação comum (não de harness) continua igual, sem resultado de harness.
  await reg.close();
});

test('a console mostra o resultado da sonda depois de aprovar, nos dois idiomas (retorno visível)', () => {
  const page = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(page, /r\.harness/);
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as { console: { approvals: Record<string, unknown> } };
    const h = cat.console.approvals.harness as Record<string, string>;
    for (const k of ['pronto', 'login', 'falhou', 'negado']) assert.equal(typeof h?.[k], 'string', `${lang}: console.approvals.harness.${k}`);
  }
});
