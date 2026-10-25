// Rede por cartão (M2.3; SPEC 0003, critério 4; ADR 0012, web como rede). O comando contido só sai para a rede pelo
// proxy do núcleo. Cada destino passa pela política com a ferramenta "network": pergunta por padrão, concessão com
// os quatro escopos e curinga de domínio (*.npmjs.org), negação vence, Plano nega, Sem perguntas libera. O cartão
// "rede" chega ao Pai como os outros, e o proxy registra cada destino com a decisão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Policy } from '../src/policy.ts';
import { CommandTool } from '../src/tools/command.ts';
import { netProxy, profileFor, mxcContainment, type Containment } from '../src/sandbox/index.ts';

function setup(mode?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-rede-'));
  const ws = join(dir, 'ws');
  mkdirSync(ws, { recursive: true });
  const log = new EventLog(openDatabase(join(dir, 'n.db')));
  return { dir, ws, log, policy: new Policy(log, { workspace: ws, ...(mode ? { mode: mode as never } : {}) }) };
}
const tty = { interactive: true };
const net = (host: string, session = 's1') => ({ session, tool: 'network' as const, target: host });

test('política da rede: pergunta por padrão; concessão com curinga de domínio; negação vence', () => {
  const { policy } = setup();
  assert.equal(policy.decide(net('registry.npmjs.org'), tty).effect, 'ask');
  assert.equal(policy.decide(net('registry.npmjs.org'), { interactive: false }).effect, 'deny', 'sem ninguém para aprovar, nega');
  policy.grant('session', { tool: 'network', pattern: '*.npmjs.org' }, { session: 's1' });
  assert.equal(policy.decide(net('registry.npmjs.org'), tty).effect, 'allow');
  assert.equal(policy.decide(net('npmjs.org.evil.com'), tty).effect, 'ask', 'curinga não vaza para outro domínio');
  policy.addRule({ effect: 'deny', tool: 'network', pattern: 'registry.npmjs.org' });
  assert.equal(policy.decide(net('registry.npmjs.org'), tty).effect, 'deny', 'negação vence a concessão');
});

test('política da rede nos modos: Plano nega; Sem perguntas libera', () => {
  assert.equal(setup('plan').policy.decide(net('example.com'), tty).effect, 'deny');
  assert.equal(setup('yolo').policy.decide(net('example.com'), tty).effect, 'allow');
  assert.equal(setup('acceptEdits').policy.decide(net('example.com'), tty).effect, 'ask', 'aceitar edições não libera rede');
});

// Servidor de destino local (o proxy fala com ele do lado de fora; nada sai para a internet no teste).
async function upstream() {
  const s = createServer((_q, r) => { r.end('ok-do-destino'); });
  await new Promise<void>((ok) => s.listen(0, '127.0.0.1', ok));
  return { port: (s.address() as { port: number }).port, close: () => s.close() };
}
const viaProxy = (proxyUrl: string, host: string, port: number) => new Promise<number>((ok) => {
  const u = new URL(proxyUrl);
  const q = request({ host: u.hostname, port: u.port, method: 'CONNECT', path: `${host}:${port}` });
  q.on('connect', (res, sock) => { sock.destroy(); ok(res.statusCode ?? 0); });
  q.on('response', (res) => ok(res.statusCode ?? 0));
  q.on('error', () => ok(-1));
  q.end();
});

test('proxy: libera o destino decidido como permitido, nega o resto com 403, e diz quem pediu o quê', async () => {
  const up = await upstream();
  const pedidos: string[] = [];
  const px = await netProxy(async (host) => { pedidos.push(host); return host === '127.0.0.1'; });
  try {
    assert.equal(await viaProxy(px.url, '127.0.0.1', up.port), 200);
    assert.equal(await viaProxy(px.url, 'localhost', up.port), 403);
    assert.deepEqual(pedidos, ['127.0.0.1', 'localhost']);
    assert.deepEqual(px.destinos().map((d) => [d.host, d.ok]), [['127.0.0.1', true], ['localhost', false]]);
  } finally { await px.close(); up.close(); }
});

test('comando: o destino novo pergunta pelo cartão; aprovado nesta conversa, o mesmo destino não pergunta de novo', async () => {
  const { ws, policy, log } = setup();
  policy.grant('session', { tool: 'run_command', pattern: 'baixar' }, { session: 's1' });
  const up = await upstream();
  const status: number[] = [];
  // Contenção falsa: "roda" o comando fazendo dois CONNECT pelo proxy que recebe, como faria um npm contido.
  const fake: Containment = {
    status: async () => ({ ok: true, level: 'teste' }),
    run: async (_c, _w, _p, rede) => { for (let i = 0; i < 2; i++) status.push(await viaProxy(rede!.proxyUrl, '127.0.0.1', up.port)); return { code: 0, stdout: '', stderr: '' }; },
  };
  const cmd = new CommandTool(policy, { workspace: ws, containment: fake });
  const perguntas: string[] = [];
  const askNetwork = async (host: string) => { perguntas.push(host); policy.grant('session', { tool: 'network', pattern: host }, { session: 's1' }); return true; };
  const r = await cmd.run('s1', 'baixar', { interactive: true, askNetwork });
  up.close();
  assert.equal(r.ok, true);
  assert.deepEqual(status, [200, 200]);
  assert.deepEqual(perguntas, ['127.0.0.1'], 'uma pergunta só');
  const ev = log.events('s1').filter((e) => e.kind === 'network.request').map((e) => e.payload as { host: string; allowed: boolean });
  assert.deepEqual(ev.map((e) => [e.host, e.allowed]), [['127.0.0.1', true], ['127.0.0.1', true]]);
});

test('comando sem quem aprove: o destino novo é negado, e o comando segue', async () => {
  const { ws, policy } = setup();
  policy.grant('session', { tool: 'run_command', pattern: 'baixar' }, { session: 's1' });
  const up = await upstream();
  let st = 0;
  const fake: Containment = { status: async () => ({ ok: true, level: 'teste' }), run: async (_c, _w, _p, rede) => { st = await viaProxy(rede!.proxyUrl, '127.0.0.1', up.port); return { code: 0, stdout: '', stderr: '' }; } };
  const r = await new CommandTool(policy, { workspace: ws, containment: fake }).run('s1', 'baixar', { interactive: false });
  up.close();
  assert.equal(r.ok, true);
  assert.equal(st, 403);
});

test('MXC de verdade: o comando contido alcança o destino liberado pelo proxy e é barrado no negado', async () => {
  const c = mxcContainment();
  const st = await c.status();
  if (!st.ok) { assert.ok(typeof st.reason === 'string' && st.reason.length > 0); return; }
  const { ws } = setup();
  const up = await upstream();
  const px = await netProxy(async (host) => host === '127.0.0.1');
  const s = join(ws, 'conecta.mjs');
  writeFileSync(s, [
    "import { request } from 'node:http';",
    'const [host, port] = process.argv.slice(2);',
    'const u = new URL(process.env.HTTPS_PROXY);',
    "const q = request({ host: u.hostname, port: u.port, method: 'CONNECT', path: `${host}:${port}` });",
    "q.on('connect', (res) => { console.log(res.statusCode); process.exit(res.statusCode === 200 ? 0 : 2); });",
    "q.on('response', (res) => { console.log(res.statusCode); process.exit(2); });",
    "q.on('error', (e) => { console.log(e.code); process.exit(3); });",
    'q.end();',
  ].join('\n'));
  try {
    const p = profileFor(ws);
    const ok = await c.run(`"${process.execPath}" "${s}" 127.0.0.1 ${up.port}`, ws, p, { proxyUrl: px.url });
    assert.equal(ok.code, 0, ok.stdout + ok.stderr);
    const nao = await c.run(`"${process.execPath}" "${s}" localhost ${up.port}`, ws, p, { proxyUrl: px.url });
    assert.notEqual(nao.code, 0);
    // Com o proxy, o loopback do host fica liberado (Windows e macOS), mas só para o proxy: outro serviço local
    // (a console do Buddy, o serviço de fundo do OpenCode 2, um servidor de desenvolvimento) continua fora de alcance.
    // Achado da M2.2 (2026-10-25): sem isso, um agente contido poderia entregar o trabalho a um serviço de fora.
    const direto = join(ws, 'direto.mjs');
    writeFileSync(direto, "import { get } from 'node:http';\nget({ host: '127.0.0.1', port: Number(process.argv[2]), agent: false }, () => process.exit(0)).on('error', () => process.exit(1));\n");
    const servicoLocal = await c.run(`"${process.execPath}" "${direto}" ${up.port}`, ws, p, { proxyUrl: px.url });
    assert.notEqual(servicoLocal.code, 0, 'serviço local fora do alcance do comando contido');
  } finally { await px.close(); up.close(); }
});

test('console: o cartão "rede" tem texto nos dois idiomas', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(PAGE, /\(write_file\|archive\|run_command\|read_file\|list_dir\|delegate\|network\)/);
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8'));
    assert.ok(cat.console.approvals.tool.network, lang);
  }
});
