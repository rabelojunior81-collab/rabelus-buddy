// Regra do Pai (2026-10-18): servidor de conferência tem dono e fim. Registrado, reaproveitado, encerrado;
// nunca esquecido nem duplicado numa porta nova.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startServer, listServers, stopServers, serversOf, shellCommand } from '../lib/servers.mjs';

function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-srv-'));
  execFileSync('git', ['init', '-q', '-b', 'main', r]);
  return r;
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const get = async (port, path) => { const r = await fetch(`http://127.0.0.1:${port}${path}`); return { status: r.status, type: r.headers.get('content-type') ?? '', body: await r.text() }; };

test('serve: pasta servida em 127.0.0.1, com o tipo certo; a mesma pasta reaproveita o servidor (nunca outro numa porta nova)', async () => {
  const r = repo();
  const site = join(r, 'site');
  mkdirSync(site);
  writeFileSync(join(site, 'index.html'), '<h1>oi</h1>');
  writeFileSync(join(site, 'a.svg'), '<svg/>');
  const s1 = await startServer(r, { dir: site }, { session: 's1' });
  try {
    assert.equal(s1.reused, false);
    assert.ok(s1.port > 0);
    const home = await get(s1.port, '/');
    assert.equal(home.status, 200);
    assert.match(home.type, /text\/html/);
    assert.match(home.body, /oi/);
    assert.match((await get(s1.port, '/a.svg')).type, /image\/svg\+xml/);
    assert.equal((await get(s1.port, '/..%2F..%2Fetc')).status, 404, 'não sai da pasta servida');
    assert.equal((await get(s1.port, '/nao-existe.html')).status, 404);

    const s2 = await startServer(r, { dir: site }, { session: 's1' });
    assert.equal(s2.reused, true);
    assert.equal(s2.port, s1.port);
    assert.equal(s2.pid, s1.pid);
    assert.equal(listServers(r).length, 1);
  } finally {
    stopServers(r, { all: true });
  }
  assert.equal(alive(s1.pid), false, 'encerrado de verdade');
  assert.deepEqual(listServers(r), []);
});

test('serve: comando rastreado (núcleo de ensaio), por sessão; registro de processo morto some sozinho', async () => {
  const r = repo();
  const s = await startServer(r, { name: 'ensaio', cmd: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] }, { session: 's9' });
  try {
    assert.ok(alive(s.pid));
    assert.deepEqual(serversOf(r, 's9').map((x) => x.name), ['ensaio']);
    assert.deepEqual(serversOf(r, 'outra'), []);
  } finally {
    const stopped = stopServers(r, { session: 's9' });
    assert.deepEqual(stopped.map((x) => x.name), ['ensaio']);
  }
  assert.equal(alive(s.pid), false);

  // Processo que morreu por fora: o registro é limpo na próxima listagem.
  const t = await startServer(r, { name: 'curto', cmd: process.execPath, args: ['-e', 'setTimeout(() => {}, 200)'] }, { session: 's9' });
  await new Promise((ok) => setTimeout(ok, 1500));
  assert.equal(alive(t.pid), false);
  assert.deepEqual(listServers(r), []);
});

test('session end recusa encerrar com servidor da sessão rodando, e diz como encerrar', async () => {
  const r = repo();
  const bd = join(import.meta.dirname, '..', 'bd.mjs');
  const run = (...a) => { try { return { code: 0, out: execFileSync(process.execPath, [bd, ...a], { cwd: r, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; } };
  run('session', 'start', '--harness', 't', '--model', 'm', '--scope', 'teste');
  const sid = JSON.parse(run('session', 'status').out).sessions[0].id;
  const s = await startServer(r, { name: 'ensaio', cmd: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] }, { session: sid });
  try {
    const end = run('session', 'end', '--summary', 'x');
    assert.notEqual(end.code, 0);
    assert.match(end.out, /servidor/);
    assert.match(end.out, /bd serve --stop/);
    assert.match(run('serve', '--list').out, /ensaio/);
  } finally {
    stopServers(r, { all: true });
  }
  assert.equal(alive(s.pid), false);
});

test('serve --stop encerra a árvore inteira: o neto (ex.: núcleo de ensaio) morre junto', async () => {
  const r = repo();
  const pidFile = join(r, 'neto.pid');
  const script = `const { spawn } = require('node:child_process'); const fs = require('node:fs'); const c = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' }); fs.writeFileSync(${JSON.stringify(pidFile)}, String(c.pid)); setInterval(() => {}, 1000);`;
  // Pelo mesmo caminho do bd serve --cmd: o shell do sistema inicia o node, que inicia o neto.
  writeFileSync(join(r, 'pai.cjs'), script);
  const s = await startServer(r, { name: 'arvore', ...shellCommand(`"${process.execPath}" "${join(r, 'pai.cjs')}"`) }, { session: 'sa' });
  let neto = 0;
  for (let i = 0; i < 100 && !neto; i++) { await new Promise((ok) => setTimeout(ok, 50)); try { neto = Number(readFileSync(pidFile, 'utf8')); } catch { /* ainda não */ } }
  assert.ok(neto > 0 && alive(neto), 'o neto subiu');
  stopServers(r, { session: 'sa' });
  for (let i = 0; i < 60 && alive(neto); i++) await new Promise((ok) => setTimeout(ok, 50));
  assert.equal(alive(s.pid), false);
  assert.equal(alive(neto), false, 'o neto não fica órfão');
});
