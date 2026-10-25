// Contenção de execução (M2.1; SPEC 0003, critérios 1, 2 e 5; ADR 0019, MXC). O comando do Buddy roda contido pelo
// sistema: lê e escreve só a pasta de trabalho, os caminhos protegidos ficam negados ou só leitura, e a rede fica
// negada. Sem contenção (máquina sem suporte, ou desligada), nada muda e o log diz por quê. O perfil vem do spike:
// pastas acima só para listar (sem a própria pasta), interface ligada no Windows para o node iniciar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Policy } from '../src/policy.ts';
import { CommandTool } from '../src/tools/command.ts';
import { profileFor, mxcContainment, type Containment } from '../src/sandbox/index.ts';

function cenario() {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-cont-'));
  const ws = join(dir, 'ws');
  mkdirSync(join(ws, '.git'), { recursive: true });
  mkdirSync(join(ws, 'a', 'b'), { recursive: true });
  mkdirSync(join(ws, 'node_modules', 'x'), { recursive: true });
  writeFileSync(join(ws, '.env'), 'CHAVE=canario');
  writeFileSync(join(ws, 'a', 'b', '.env.local'), 'X=1');
  writeFileSync(join(ws, 'k.pem'), 'chave');
  writeFileSync(join(ws, 'node_modules', 'x', '.env'), 'ignorado');
  return { dir, ws };
}

test('perfil: a pasta com leitura e escrita; protegidos negados ou só leitura; pastas acima só para listar', () => {
  const { ws } = cenario();
  const p = profileFor(ws, { env: { PATH: '' } });
  assert.deepEqual(p.readwrite, [ws]);
  for (const f of [join(ws, '.env'), join(ws, 'a', 'b', '.env.local'), join(ws, 'k.pem')]) assert.ok(p.denied.includes(f), f);
  assert.ok(!p.denied.includes(join(ws, 'node_modules', 'x', '.env')), 'node_modules não é varrido');
  assert.ok(p.readonly.includes(join(ws, '.git')), '.git só leitura');
  assert.ok(p.readonly.includes(dirname(process.execPath)), 'o runtime do node');
  assert.ok(p.enumerate.includes(dirname(ws)), 'a pasta acima pode ser listada');
  assert.ok(!p.enumerate.some((d) => d === ws || d.startsWith(ws + '\\') || d.startsWith(ws + '/')), 'nunca a própria pasta (rebaixa a escrita)');
});

// Achado da checagem real da M2.3: o comando contido achava o npm por um PATH diferente do que montou o perfil e caía
// em pasta não liberada. O perfil carrega o PATH que o montou, e o comando contido roda com ele.
test('perfil: carrega o PATH que o montou, para o comando contido achar programas só nas pastas liberadas', () => {
  const { ws } = cenario();
  const raiz = mkdtempSync(join(tmpdir(), 'rbuddy-bin-'));
  const p = profileFor(ws, { env: { PATH: raiz } });
  assert.equal(p.path, raiz);
  assert.ok(p.readonly.includes(raiz));
});

// Causa achada pelo log de auditoria na checagem real da M2.3: com uma pasta do PATH dentro de outra pasta liberada
// (o npm põe a node-gyp-bin dele no PATH), as pastas entre as duas entravam em "só listar" e perdiam a leitura.
test('perfil: nenhuma pasta dentro de outra liberada vira "só listar"', () => {
  const { ws } = cenario();
  const raiz = mkdtempSync(join(tmpdir(), 'rbuddy-npmg-'));
  const funda = join(raiz, 'node_modules', 'npm', 'bin');
  mkdirSync(funda, { recursive: true });
  const p = profileFor(ws, { env: { PATH: [raiz, funda].join(process.platform === 'win32' ? ';' : ':') } });
  assert.ok(p.readonly.includes(raiz));
  for (const d of [join(raiz, 'node_modules'), join(raiz, 'node_modules', 'npm'), funda]) assert.ok(!p.enumerate.includes(d), d);
  assert.ok(p.enumerate.includes(dirname(raiz)), 'acima da pasta liberada continua listável');
});

// Achado da segunda checagem real da M2.3: no Windows, o npm.cmd do Node entrega a execução ao npm global do usuário
// (%APPDATA%\npm) quando ele existe, mesmo fora do PATH do núcleo.
test('perfil: no Windows, a pasta global do npm do usuário entra só leitura, mesmo fora do PATH', () => {
  const { ws } = cenario();
  const appdata = mkdtempSync(join(tmpdir(), 'rbuddy-appdata-'));
  mkdirSync(join(appdata, 'npm'));
  const p = profileFor(ws, { env: { PATH: '', APPDATA: appdata }, platform: 'win32' });
  assert.ok(p.readonly.includes(join(appdata, 'npm')));
});

test('perfil: no Windows, a pasta de um programa em bin ou cmd entra com a raiz dele (o git chama o que mora ao lado)', () => {
  const { ws } = cenario();
  const raiz = mkdtempSync(join(tmpdir(), 'rbuddy-git-'));
  mkdirSync(join(raiz, 'cmd'), { recursive: true });
  const p = profileFor(ws, { env: { PATH: join(raiz, 'cmd') }, platform: 'win32' });
  assert.ok(p.readonly.includes(raiz));
});

const fake = (ok: boolean, calls: string[]): Containment => ({
  status: async () => (ok ? { ok: true, level: 'teste' } : { ok: false, reason: 'sem suporte nesta máquina' }),
  run: async (command) => { calls.push(command); return { code: 0, stdout: 'contido', stderr: '' }; },
});
function tool(containment?: Containment) {
  const { dir, ws } = cenario();
  const log = new EventLog(openDatabase(join(dir, 'n.db')));
  const policy = new Policy(log, { workspace: ws });
  const spawned: string[] = [];
  const cmd = new CommandTool(policy, { workspace: ws, exec: (c) => { spawned.push(c); return { code: 0, stdout: 'solto', stderr: '' }; }, ...(containment ? { containment } : {}) });
  return { cmd, policy, log, spawned };
}
const ran = (log: EventLog) => log.events('s1').filter((e) => e.kind === 'command.ran').map((e) => e.payload as Record<string, unknown>);

test('com contenção disponível, o comando aprovado roda contido, e o log diz isso', async () => {
  const calls: string[] = [];
  const { cmd, policy, log, spawned } = tool(fake(true, calls));
  policy.grant('once', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  const r = await cmd.run('s1', 'npm test', { interactive: false });
  assert.equal(r.ok && r.result.stdout, 'contido');
  // O modelo fica sabendo: sem isso, na checagem real, o Buddy especulou a causa de um "Acesso negado" da contenção.
  assert.equal(r.ok && r.result.contained, true);
  assert.deepEqual(calls, ['npm test']);
  assert.deepEqual(spawned, [], 'nada roda solto');
  assert.deepEqual(ran(log).map((p) => [p.contained, p.containment]), [[true, 'teste']]);
  // Auditoria: o log guarda com que perfil o comando rodou (achado da checagem real da M2.3: sem isso, não dava para
  // saber por que o npm era negado no núcleo e não fora dele).
  const perfil = ran(log)[0]!.profile as { readwrite: string[]; readonly: string[]; denied: number };
  assert.ok(Array.isArray(perfil.readonly) && perfil.readonly.length > 0);
  assert.equal(typeof perfil.denied, 'number');
});

test('sem contenção, nada muda: roda como antes, e o log diz por quê (critério 5)', async () => {
  const { cmd, policy, log, spawned } = tool(fake(false, []));
  policy.grant('once', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  const r = await cmd.run('s1', 'npm test', { interactive: false });
  assert.equal(r.ok && r.result.stdout, 'solto');
  assert.equal(r.ok && r.result.contained, false);
  assert.deepEqual(spawned, ['npm test']);
  assert.deepEqual(ran(log).map((p) => [p.contained, p.reason]), [[false, 'sem suporte nesta máquina']]);
});

// M2.4 (SPEC 0003, critério 6, aprovado pelo Pai em 2026-10-25; rotina rápida pedida por ele no mesmo dia): com a
// contenção confirmada, o comando dentro da pasta roda sem cartão; sem contenção, nada roda sem aprovação, como antes.
test('M2.4: contido, o comando roda sem cartão; sem contenção, nada roda sem aprovação', async () => {
  const calls: string[] = [];
  const contido = tool(fake(true, calls));
  const r = await contido.cmd.run('s1', 'npm test', { interactive: false });
  assert.equal(r.ok, true);
  assert.deepEqual([calls, contido.spawned], [['npm test'], []]);
  const solto = tool(fake(false, []));
  const r2 = await solto.cmd.run('s1', 'npm test', { interactive: false });
  assert.equal(r2.ok, false);
  assert.deepEqual(solto.spawned, [], 'sem contenção e sem concessão, nada roda');
});

test('M2.4: o modo Plano continua negando o comando, mesmo contido', async () => {
  const calls: string[] = [];
  const { dir, ws } = cenario();
  const log = new EventLog(openDatabase(join(dir, 'n.db')));
  const policy = new Policy(log, { workspace: ws, mode: 'plan' });
  const cmd = new CommandTool(policy, { workspace: ws, containment: fake(true, calls) });
  assert.equal((await cmd.run('s1', 'npm test', { interactive: true })).ok, false);
  assert.deepEqual(calls, []);
});

test('rede sob demanda: comando só de leitura local roda sem ligar a rede; o resto ganha o proxy', async () => {
  const redes: (string | undefined)[] = [];
  const c: Containment = { status: async () => ({ ok: true, level: 'teste' }), run: async (_c, _w, _p, net) => { redes.push(net?.proxyUrl); return { code: 0, stdout: '', stderr: '' }; } };
  const { cmd } = tool(c);
  await cmd.run('s1', 'git status', { interactive: false });
  await cmd.run('s1', 'npm install', { interactive: false });
  await cmd.run('s1', 'git status && curl https://x', { interactive: false });
  assert.equal(redes[0], undefined, 'git status: sem rede');
  assert.match(String(redes[1]), /^http:\/\/127\.0\.0\.1:\d+$/, 'npm install: com o proxy');
  assert.match(String(redes[2]), /^http:\/\/127\.0\.0\.1:\d+$/, 'encadeado nunca é "só leitura"');
});

test('a chave desliga: RBUDDY_CONTAINMENT=off deixa a contenção indisponível, com o motivo', async () => {
  const st = await mxcContainment({ env: { RBUDDY_CONTAINMENT: 'off' } }).status();
  assert.equal(st.ok, false);
  assert.match(String(st.reason), /desligada/);
});

test('MXC de verdade: dentro da pasta escreve; o .env, fora da pasta e a rede falham. Sem suporte, diz por quê', async () => {
  const c = mxcContainment();
  const st = await c.status();
  if (!st.ok) {
    assert.ok(typeof st.reason === 'string' && st.reason.length > 0, 'sem contenção, o motivo vem por escrito');
    return;
  }
  const { dir, ws } = cenario();
  const fora = join(dir, 'fora.txt');
  const s = join(ws, 'caso.mjs');
  writeFileSync(s, [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "import { connect } from 'node:net';",
    'const [o, a] = process.argv.slice(2);',
    "if (o === 'w') writeFileSync(a, 'x');",
    "if (o === 'r') readFileSync(a, 'utf8');",
    "if (o === 'n') { const k = connect(443, '1.1.1.1'); k.setTimeout(4000, () => process.exit(3)); k.on('connect', () => process.exit(0)); k.on('error', () => process.exit(4)); }",
  ].join('\n'));
  const p = profileFor(ws);
  const node = (args: string) => `"${process.execPath}" "${s}" ${args}`;
  const dentro = await c.run(node(`w "${join(ws, 'dentro.txt')}"`), ws, p);
  assert.equal(dentro.code, 0, dentro.stderr);
  assert.equal(readFileSync(join(ws, 'dentro.txt'), 'utf8'), 'x');
  assert.notEqual((await c.run(node(`r "${join(ws, '.env')}"`), ws, p)).code, 0, '.env negado');
  // Fora da pasta, o que vale é nada chegar aqui fora. No Windows e no macOS a escrita falha; no Linux, o bubblewrap
  // dá ao comando uma /tmp privada, e a escrita "funciona" numa cópia que some (achado do spike e da CI de 2026-10-25).
  const escritaFora = await c.run(node(`w "${fora}"`), ws, p);
  if (process.platform !== 'linux') assert.notEqual(escritaFora.code, 0, 'fora da pasta');
  assert.equal(existsSync(fora), false, 'e nada chegou aqui fora');
  assert.notEqual((await c.run(node('n'), ws, p)).code, 0, 'rede negada');
});
