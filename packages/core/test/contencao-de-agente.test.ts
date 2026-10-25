// Agente de fora contido (M2.2; SPEC 0003, critério 3; decisão do Pai em 2026-10-25: o Codex primeiro). O processo
// inteiro do agente roda pela MXC, com o perfil da pasta de trabalho mais as pastas dele, e a rede só pelo proxy do
// núcleo: os domínios do provedor dele liberados de saída, o resto pelo cartão "rede". Só agente com perfil conhecido,
// e só na postura do Buddy (na postura "do agente", nada de contenção, pedido do Pai). Experimento real em
// 2026-10-25: o codex-acp contido conversou, criou arquivo na pasta e falhou ao escrever fora dela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentProfile, containedChild, containedLaunch, extendProfile, mxcContainment, netProxy, profileFor } from '../src/sandbox/index.ts';
import { promptTurn } from '../src/harness/session.ts';

test('perfil de agente: o Codex tem as pastas dele com escrita e os domínios do provedor; agente sem perfil não roda contido', () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-home-'));
  const env = { USERPROFILE: home, HOME: home, LOCALAPPDATA: join(home, 'AppData', 'Local') };
  const cx = agentProfile('codex-acp', env);
  assert.ok(cx);
  assert.ok(cx.readwrite.includes(join(home, '.codex')));
  assert.ok(cx.domains.includes('chatgpt.com'));
  assert.ok(cx.domains.includes('registry.npmjs.org'), 'o npx confere o pacote');
  assert.equal(agentProfile('opencode', env), undefined, 'OpenCode 2: serviço de fundo, sem perfil por enquanto');
  assert.equal(agentProfile('desconhecido', env), undefined);
});

test('processo contido se comporta como processo filho: fluxos, pid, saída com código e encerramento', async () => {
  let killed = 0;
  let finish: (r: { exitCode: number; timedOut: boolean }) => void = () => {};
  const fake = { id: 4242, standardInput: new PassThrough(), standardOutput: new PassThrough(), standardError: new PassThrough(), wait: () => new Promise<{ exitCode: number; timedOut: boolean }>((ok) => { finish = ok; }), kill: () => { killed++; }, dispose: () => {} };
  const child = containedChild(fake as never);
  assert.ok(child instanceof EventEmitter);
  assert.equal(child.pid, 4242);
  assert.equal(child.exitCode, null);
  const saida = new Promise<number | null>((ok) => child.on('exit', (c: number | null) => ok(c)));
  let lido = '';
  child.stdout!.on('data', (d) => { lido += d; });
  fake.standardOutput.write('oi');
  child.kill();
  assert.equal(killed, 1);
  finish({ exitCode: 7, timedOut: false });
  assert.equal(await saida, 7);
  assert.equal(child.exitCode, 7);
  assert.equal(lido, 'oi');
});

test('extendProfile: pastas do agente entram; "só listar" nunca cai dentro de uma pasta liberada', () => {
  const ws = mkdtempSync(join(tmpdir(), 'rbuddy-ext-'));
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-exth-'));
  const p = extendProfile(profileFor(ws, { env: { PATH: '' } }), { readwrite: [join(home, '.codex')] });
  assert.ok(p.readwrite.includes(join(home, '.codex')));
  assert.ok(p.enumerate.includes(home), 'a pasta acima da do agente pode ser listada');
  assert.ok(!p.enumerate.some((d) => d === join(home, '.codex') || d.startsWith(join(home, '.codex') + '\\') || d.startsWith(join(home, '.codex') + '/')));
});

test('MXC de verdade: um agente ACP contido conversa pelos fluxos; sem suporte, diz por quê', async () => {
  const c = mxcContainment();
  const st = await c.status();
  if (!st.ok) { assert.ok(typeof st.reason === 'string' && st.reason.length > 0); return; }
  const ws = mkdtempSync(join(tmpdir(), 'rbuddy-agcont-'));
  const fake = join(import.meta.dirname, 'fake-acp-agent.mjs');
  const px = await netProxy(async () => false);
  try {
    const p = profileFor(ws);
    // O agente falso mora no repositório e importa o SDK do ACP do node_modules: os dois entram só leitura, como o
    // pacote do codex-acp no cache do npm (o node lê o package.json das pastas acima do script).
    const repo = join(import.meta.dirname, '..', '..', '..');
    const ro = [join(repo, 'packages', 'core'), join(repo, 'node_modules')];
    const acima = (d: string) => { const o: string[] = []; let x = d; while (join(x, '..') !== x) { x = join(x, '..'); o.push(x); } return o; };
    const enumerate = [...new Set([...p.enumerate, ...ro.flatMap(acima)])].filter((d) => ![ws, ...p.readonly, ...ro].some((r) => d === r || d.startsWith(r + '\\') || d.startsWith(r + '/')));
    const launch = containedLaunch(c, { profile: { ...p, readonly: [...p.readonly, ...ro], enumerate }, net: { proxyUrl: px.url } });
    const r = await promptTurn({ cmd: process.execPath, args: [fake], env: { FAKE_ACP_MODE: 'ok' }, source: 'local', needsApproval: false }, { cwd: ws, task: 'oi', launch });
    assert.match(r.text, /\S/, 'respondeu pelo processo contido');
  } finally { await px.close(); }
});
