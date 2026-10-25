// Casos do spike de contenção do M2 (SPEC 0003, critérios 1 e 2). Roda DENTRO da contenção: um caso por chamada,
// `node casos.mjs <id> <arquivo JSON com os caminhos>`. Imprime uma linha JSON {id, feito, detalhe} e sai com 0 se a
// ação aconteceu e 1 se falhou. Numa fuga (E*), "feito" é escapar; num legítimo (L*), "feito" é funcionar.
// Os caminhos vêm num arquivo (e não no ambiente nem na linha de comando) porque a contenção pode trocar o ambiente
// e o perfil do usuário, e aspas de JSON numa linha de comando do Windows não sobrevivem.
import { readFileSync, writeFileSync, renameSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { lookup } from 'node:dns/promises';
import { spawn, execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { join } from 'node:path';

const [id, file] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const done = (feito, detalhe = '') => { console.log(JSON.stringify({ id, feito, detalhe: String(detalhe).slice(0, 200) })); process.exit(feito ? 0 : 1); };
const fail = (e) => done(false, e && (e.code || e.message) || e);

// HTTPS por proxy HTTP (CONNECT), como fazem as ferramentas que respeitam HTTPS_PROXY; sem proxy, conexão direta.
function viaProxy(host) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || p.proxy;
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('timeout')), 8000);
    if (!proxy) {
      const s = connect(443, host, () => { clearTimeout(t); s.destroy(); ok('direto'); });
      s.on('error', (e) => { clearTimeout(t); ko(e); });
      return;
    }
    const u = new URL(proxy);
    // O proxy do sandbox-runtime leva a credencial no próprio endereço (sem ela, 407; achado da CI no macOS).
    const auth = u.username ? { 'Proxy-Authorization': `Basic ${Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64')}` } : {};
    const req = request({ host: u.hostname, port: u.port, method: 'CONNECT', path: `${host}:443`, headers: auth });
    req.on('connect', (res, sock) => { clearTimeout(t); sock.destroy(); res.statusCode === 200 ? ok(`proxy ${res.statusCode}`) : ko(new Error(`proxy ${res.statusCode}`)); });
    req.on('error', (e) => { clearTimeout(t); ko(e); });
    req.end();
  });
}

const CASOS = {
  // Fugas: o esperado com contenção é falhar.
  E1: () => done(true, readFileSync(join(p.fora, 'segredo.txt'), 'utf8')),
  E2: () => done(true, readFileSync(join(p.ws, '.env'), 'utf8')),
  E3: () => done(true, readdirSync(p.home).slice(0, 3).join(',')),
  E4: () => { writeFileSync(join(p.fora, 'escrito-de-dentro.txt'), 'fuga'); done(true); },
  E5: () => { writeFileSync(join(p.ws, '.git', 'escrito-de-dentro'), 'fuga'); done(true); },
  E6: () => { renameSync(join(p.ws, '.env'), join(p.ws, 'env-renomeado')); done(true); },
  E7: () => {
    const s = connect(443, '1.1.1.1', () => { s.destroy(); done(true, 'conectou direto'); });
    s.setTimeout(6000, () => { s.destroy(); done(false, 'timeout'); });
    s.on('error', fail);
  },
  E8: () => viaProxy('example.com').then((r) => done(true, r), fail),
  E9: () => lookup('example.com').then((r) => done(true, r.address), fail),
  E10: () => {
    // Processo solto que tenta escrever fora depois que o pai sai (fuga por processo órfão).
    const c = spawn(process.execPath, ['-e', `setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(join(p.fora, 'orfao.txt'))},'fuga'),1500)`], { detached: true, stdio: 'ignore' });
    c.unref();
    done(true, 'lançado; o rodador confere o arquivo depois');
  },
  E11: () => { writeFileSync(join(p.hostTemp, 'rbuddy-spike-fuga.txt'), 'fuga'); done(true); },
  E12: () => (process.env.RBUDDY_SPIKE_SEGREDO ? done(true, 'variável visível') : done(false, 'variável ausente')),
  // Legítimos: o esperado é funcionar igual a fora da contenção.
  L1: () => done(true, process.version),
  L2: () => { writeFileSync(join(p.ws, 'a.txt'), 'dentro'); done(true); },
  L3: () => done(readFileSync(join(p.ws, 'a.txt'), 'utf8') === 'dentro'),
  L4: () => done(true, execFileSync(p.git, ['--version'], { encoding: 'utf8' }).trim()),
  L5: () => done(true, execFileSync(p.git, ['-C', p.ws, 'status', '--short'], { encoding: 'utf8' }).trim() || 'limpo'),
  L6: () => done(true, execFileSync(process.execPath, [p.npmCli, '-v'], { encoding: 'utf8' }).trim()),
  L7: () => done(true, execFileSync(process.execPath, ['--test', join(p.ws, 't.test.mjs')], { encoding: 'utf8' }).includes('pass 1')),
  L8: () => { const d = join(p.ws, 'tmpdir'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'x'), '1'); rmSync(d, { recursive: true }); done(true); },
  L9: () => viaProxy('registry.npmjs.org').then((r) => done(true, r), fail),
  L10: () => done(true, readdirSync(p.ws).length),
};
const fn = CASOS[id];
if (!fn) done(false, `caso desconhecido: ${id}`);
try { await fn(); } catch (e) { fail(e); }
