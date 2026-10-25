// Rodador do spike de contenção do M2 (SPEC 0003): a mesma bateria (12 fugas, 10 legítimos) sem contenção (base),
// dentro do MXC e dentro do sandbox-runtime. As bibliotecas NÃO entram na árvore do repositório (o sandbox-runtime traz
// alertas altos sem correção): vêm de uma pasta à parte, `--deps <pasta com node_modules>`.
//   node scripts/spike-m2/rodar.mjs --deps <pasta> --base <pasta de trabalho> [--so base,mxc,srt] [--saida <arquivo.json>]
// Nada aqui pede administrador: o sandbox-runtime no Windows sem o preparo feito é registrado como "sem preparo".
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, cpSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { tmpdir, homedir, platform, release } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DEPS = resolve(arg('deps', 'workspace/spike-m2'));
const BASE = resolve(arg('base', join(tmpdir(), `rbuddy-spike-${Date.now()}`)));
const SO = arg('so', 'base,mxc,srt').split(',');
const SAIDA = arg('saida', join(BASE, 'resultado.json'));
const CASOS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];
const ALLOWED = ['registry.npmjs.org'];
const which = (c) => execSync(platform() === 'win32' ? `where ${c}` : `command -v ${c}`, { encoding: 'utf8' }).split(/\r?\n/)[0].trim();

// ---------- Cenário ----------
const ws = join(BASE, 'ws'), fora = join(BASE, 'fora'), bin = join(BASE, 'bin'), hostTemp = tmpdir();
function cenario() {
  rmSync(BASE, { recursive: true, force: true });
  for (const d of [ws, fora, bin]) mkdirSync(d, { recursive: true });
  writeFileSync(join(fora, 'segredo.txt'), 'segredo de fora');
  writeFileSync(join(ws, '.env'), 'CHAVE=canario');
  writeFileSync(join(ws, 't.test.mjs'), "import { test } from 'node:test';\ntest('um', () => {});\n");
  execSync('git init -q && git -c user.email=s@s -c user.name=s add t.test.mjs && git -c user.email=s@s -c user.name=s commit -qm base', { cwd: ws, shell: true });
  cpSync(join(import.meta.dirname, 'casos.mjs'), join(bin, 'casos.mjs'));
}
const npmCli = join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'npm', 'bin', 'npm-cli.js');
const git = which('git');
const params = (extra = {}) => { const f = join(bin, 'caminhos.json'); writeFileSync(f, JSON.stringify({ ws, fora, home: homedir(), hostTemp, git, npmCli, ...extra })); return f; };
const limpar = () => { for (const f of [join(fora, 'escrito-de-dentro.txt'), join(fora, 'orfao.txt'), join(ws, '.git', 'escrito-de-dentro'), join(hostTemp, 'rbuddy-spike-fuga.txt'), join(ws, 'a.txt')]) rmSync(f, { force: true }); if (existsSync(join(ws, 'env-renomeado'))) rmSync(join(ws, 'env-renomeado')); writeFileSync(join(ws, '.env'), 'CHAVE=canario'); };

// ---------- Proxy com lista de domínios (para o MXC, que filtra rede por IP e aceita um proxy) ----------
function proxy() {
  const log = [];
  const srv = createServer((_q, r) => { r.writeHead(405); r.end(); });
  srv.on('connect', (req, sock) => {
    const [host, port] = req.url.split(':');
    const ok = ALLOWED.includes(host);
    log.push({ host, ok });
    if (!ok) { sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const up = connect(Number(port), host, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.pipe(sock); sock.pipe(up); });
    up.on('error', () => sock.destroy());
    sock.on('error', () => up.destroy());
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, log, close: () => srv.close() })));
}

// ---------- Execução de um caso ----------
const lineOf = (out) => { try { return JSON.parse(out.trim().split(/\r?\n/).filter((l) => l.startsWith('{')).at(-1)); } catch { return null; } };
function sh(cmd, env = {}) {
  return new Promise((ok) => {
    const t0 = performance.now();
    // Roda a partir da pasta de trabalho: de uma pasta negada, o node nem descobre onde está (achado da CI no macOS).
    const c = spawn(cmd, { shell: true, cwd: ws, env: { ...process.env, ...env } });
    let out = '', err = '';
    c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (err += d));
    const kill = setTimeout(() => c.kill(), 30_000);
    c.on('close', (code) => { clearTimeout(kill); ok({ code, out, err, ms: performance.now() - t0 }); });
  });
}
const q = (s) => `"${s}"`;
const cmdOf = (id, file) => `${q(process.execPath)} ${q(join(bin, 'casos.mjs'))} ${id} ${q(file)}`;
const SEGREDO = { RBUDDY_SPIKE_SEGREDO: 'canario-do-ambiente' };

async function bateria(nome, runOne) {
  limpar();
  const linhas = [];
  for (const id of CASOS) {
    const r = await runOne(id);
    const l = lineOf(r.out);
    // Sem a linha do caso, a contenção nem chegou a rodar o comando: é erro, nunca "contida" (achado do primeiro ensaio).
    linhas.push({ id, feito: l ? l.feito : null, detalhe: l ? l.detalhe : (r.err || r.out).trim().slice(0, 200), ms: Math.round(r.ms), code: r.code });
  }
  await new Promise((x) => setTimeout(x, 2500));
  const orfao = existsSync(join(fora, 'orfao.txt'));
  const e10 = linhas.find((x) => x.id === 'E10');
  // Escrita "feita" lá dentro só é fuga se o arquivo existir aqui fora: a contenção pode dar uma pasta própria por
  // cima do caminho (o bubblewrap faz isso com a temporária; suspeita da CI no Linux).
  for (const [cid, f] of [['E4', join(fora, 'escrito-de-dentro.txt')], ['E5', join(ws, '.git', 'escrito-de-dentro')], ['E11', join(hostTemp, 'rbuddy-spike-fuga.txt')]]) {
    const l = linhas.find((x) => x.id === cid);
    if (l.feito === true && !existsSync(f)) { l.feito = false; l.detalhe = 'escreveu numa cópia privada; nada chegou aqui fora'; }
  }
  if (e10.feito !== null) { e10.feito = orfao; e10.detalhe = orfao ? 'o processo solto escreveu fora' : 'o processo solto não escreveu fora'; }
  const fugas = linhas.filter((x) => x.id.startsWith('E'));
  const legit = linhas.filter((x) => x.id.startsWith('L'));
  return { nome, linhas, erros: linhas.filter((x) => x.feito === null).length, contidas: fugas.filter((x) => x.feito === false).length, fugas: fugas.length, legitimosOk: legit.filter((x) => x.feito).length, legitimos: legit.length, msMedioLegitimo: Math.round(legit.reduce((a, x) => a + x.ms, 0) / legit.length) };
}

// ---------- Adaptadores ----------
const req = createRequire(join(DEPS, 'package.json'));
const resultado = { quando: new Date().toISOString(), host: { platform: platform(), release: release(), node: process.version }, baterias: [], notas: [] };

cenario();
const file = params();
if (SO.includes('base')) resultado.baterias.push(await bateria('base (sem contenção)', (id) => sh(cmdOf(id, file), SEGREDO)));

if (SO.includes('mxc')) {
  try {
    const m = await import(pathToFileURL(req.resolve('@microsoft/mxc-sdk/v1')).href);
    const sup = m.getPlatformSupport();
    resultado.notas.push({ mxc: { suportado: sup.isSupported, nivel: sup.isolationTier, metodos: sup.availableMethods, motivo: sup.reason } });
    if (!sup.isSupported) throw new Error(`sem suporte: ${sup.reason}`);
    const px = await proxy();
    const fileM = params({ proxy: px.url });
    const ro = [bin, dirname(process.execPath), dirname(dirname(git)), dirname(dirname(dirname(npmCli))), join(ws, '.git')];
    // O node resolve o caminho real do script e consulta cada pasta acima dele; sem poder listá-las, cai com EPERM
    // (achado do ensaio). enumeratePaths libera só a listagem dessas pastas, não o conteúdo.
    const acima = (p) => { const out = []; let d = p; while (dirname(d) !== d) { d = dirname(d); out.push(d); } return out; };
    // A pasta de trabalho e o que está dentro dela ficam de fora: "só listar" nela rebaixa a escrita (achado do ensaio).
    const enumerar = [...new Set([...ro, ws].flatMap(acima))].filter((d) => d !== ws && !d.startsWith(ws + '\\') && !d.startsWith(ws + '/'));
    const t0 = performance.now();
    const bat = await bateria('MXC', async (id) => {
      const t = performance.now();
      try {
        const r = await m.run({
          command: cmdOf(id, fileM),
          workingDirectory: ws,
          ...(platform() === 'win32' ? { containment: { type: 'processcontainer', config: { filesystem: { enumeratePaths: enumerar } } } } : {}),
          filesystem: { readwritePaths: [ws], readonlyPaths: ro, deniedPaths: [join(ws, '.env')] },
          // O ProcessContainer só aceita o proxy com a entrada da rede local liberada (achado: "networkProxy requires
          // network.ingress.default='allow'"); a saída continua negada.
          // Cada backend quer a entrada de um jeito (achados da CI): o Seatbelt também exige entrada liberada junto com o
          // loopback do host; o bubblewrap recusa as duas, porque o loopback dele é de outro namespace.
          network: { egress: { default: 'deny' }, ...(platform() === 'linux' ? {} : { ingress: { default: 'allow', hostLoopback: 'allow' } }), runtimeConfig: { networkProxy: px.url } },
          // Com a interface desligada, o node.exe não inicializa (0xC0000142, achado do ensaio); área de transferência e
          // injeção de teclado continuam negadas, porque o MXC nega o que não é declarado.
          ui: { disable: false },
          environment: { HTTPS_PROXY: px.url },
          inheritDefaultEnvironment: true,
          timeoutMs: 30_000,
        });
        return { code: r.exitCode, out: r.stdout, err: r.stderr + (r.warnings?.length ? ` avisos: ${JSON.stringify(r.warnings)}` : ''), ms: performance.now() - t };
      } catch (e) { return { code: -1, out: '', err: `${e.code ?? ''} ${e.message}`, ms: performance.now() - t }; }
    });
    bat.msTotal = Math.round(performance.now() - t0);
    bat.proxy = px.log;
    px.close();
    resultado.baterias.push(bat);
  } catch (e) { resultado.notas.push({ mxcErro: String(e.message ?? e) }); }
}

if (SO.includes('srt')) {
  try {
    const srt = await import(pathToFileURL(req.resolve('@anthropic-ai/sandbox-runtime')).href);
    const { SandboxManager } = srt;
    // No Windows, o auxiliar srt-win.exe vem no pacote e precisa ser apontado (achado do ensaio).
    const windows = platform() === 'win32' ? { windows: { srtWin: { path: srt.VENDORED_SRT_WIN_EXE } } } : {};
    const t0 = performance.now();
    const perguntados = [];
    await SandboxManager.initialize({
      ...windows,
      network: { allowedDomains: ALLOWED, deniedDomains: [] },
      // O mesmo perfil fechado do MXC: a pasta do usuário negada, com o que as ferramentas precisam liberado. A pasta das
      // bibliotecas também, porque o auxiliar de seccomp do Linux mora nela (achado da CI no Linux), e as configurações
      // do git e do npm, que eles leem ao iniciar (achado da CI no macOS).
      filesystem: { denyRead: [fora, homedir(), join(ws, '.env')], allowRead: [ws, bin, DEPS, dirname(process.execPath), dirname(dirname(git)), dirname(dirname(dirname(npmCli))), join(homedir(), '.gitconfig'), join(homedir(), '.npmrc')], allowWrite: [ws], denyWrite: [join(ws, '.env'), join(ws, '.git')] },
    }, async (host) => { perguntados.push(host); return false; });
    const preparoMs = Math.round(performance.now() - t0);
    const bat = await bateria('sandbox-runtime', async (id) => sh(await SandboxManager.wrapWithSandbox(cmdOf(id, file)), SEGREDO));
    bat.preparoMs = preparoMs;
    bat.dominiosPerguntados = perguntados;
    await SandboxManager.reset();
    resultado.baterias.push(bat);
  } catch (e) { resultado.notas.push({ srtErro: String(e.message ?? e).slice(0, 600) }); }
}

writeFileSync(SAIDA, JSON.stringify(resultado, null, 2));
for (const b of resultado.baterias) console.log(`${b.nome}: fugas contidas ${b.contidas}/${b.fugas}; legítimos ok ${b.legitimosOk}/${b.legitimos}; erros ${b.erros}; ${b.msMedioLegitimo} ms por comando legítimo`);
for (const n of resultado.notas) console.log(JSON.stringify(n));
// Caso a caso, uma linha por caso: o log da CI é o que se lê de fora (o resumo do job não sai pela API).
for (const b of resultado.baterias) for (const l of b.linhas) console.log(`  ${b.nome} ${l.id} ${l.feito} ${l.ms}ms código ${l.code} ${String(l.detalhe).replace(/\s+/g, ' ').slice(0, 220)}`);
console.log(`resultado: ${SAIDA}`);
