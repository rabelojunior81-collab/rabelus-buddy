import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createI18n } from '../../client/src/i18n.ts';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';

const BIN = join(import.meta.dirname, '..', '..', 'cli', 'bin', 'rbuddy.mjs');
const FLOOD = join(import.meta.dirname, 'fixtures', 'flood.ts');
const pt = createI18n('pt-BR');
const children: ChildProcess[] = [];
after(() => { for (const c of children) c.kill(); });

function env(home: string) {
  const e = { ...process.env, RBUDDY_HOME: home };
  delete e.RBUDDY_LANG;
  return e;
}

// Sobe o dono em primeiro plano e espera a linha de pronto.
function startOwner(home: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [BIN, 'daemon', 'start'], { env: env(home) });
    children.push(p);
    let out = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d: string) => { out += d; if (out.includes('\n')) resolve(p); });
    p.on('exit', (code) => reject(new Error(`dono saiu com ${code}: ${out}`)));
  });
}

function flood(home: string, sessionPrefix: string, n: number): Promise<{ errors: number; done: number }> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [FLOOD, sessionPrefix, String(n)], { env: env(home) });
    let out = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d: string) => { out += d; });
    p.on('exit', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`flood saiu com ${code}: ${out}`))));
  });
}

test('critério 1: duas CLIs × 1.000 comandos simultâneos; sem SQLITE_BUSY; sequência contígua por sessão', async () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-dono-'));
  await startOwner(home);
  const [a, b] = await Promise.all([flood(home, 'x', 1000), flood(home, 'y', 1000)]);
  assert.deepEqual([a.errors, b.errors], [0, 0]);
  assert.deepEqual([a.done, b.done], [1000, 1000]);
  const ep = endpointFor(home);
  const sessions = (await call(ep, 'session.list', {})) as { id: string; lastSeq: number; eventCount: number }[];
  assert.equal(sessions.length, 8, 'cada CLI usa 4 sessões');
  for (const s of sessions) {
    const evs = (await call(ep, 'session.events', { session: s.id })) as { seq: number }[];
    assert.deepEqual(evs.map((e) => e.seq), Array.from({ length: evs.length }, (_, i) => i + 1), `sessão ${s.id} com buraco`);
    assert.equal(s.lastSeq, evs.length);
  }
  await call(ep, 'daemon.stop', {});
});

test('critério 2: segundo dono recusa com mensagem do catálogo; o primeiro segue servindo', async () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-dono-'));
  await startOwner(home);
  const second = spawnSync(process.execPath, [BIN, 'daemon', 'start'], { env: env(home), encoding: 'utf8', timeout: 20_000 });
  assert.notEqual(second.status, 0);
  assert.equal(second.stderr.trim(), pt.t('daemon.alreadyRunning', { endpoint: endpointFor(home) }));
  const st = (await call(endpointFor(home), 'daemon.status', {})) as { pid: number };
  assert.ok(st.pid > 0);
  const status = spawnSync(process.execPath, [BIN, 'daemon', 'status'], { env: env(home), encoding: 'utf8', timeout: 20_000 });
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, new RegExp(`pid ${st.pid}`));
  const stop = spawnSync(process.execPath, [BIN, 'daemon', 'stop'], { env: env(home), encoding: 'utf8', timeout: 20_000 });
  assert.equal(stop.stdout.trim(), pt.t('daemon.stopped'));
});

test('sem dono no ar: status e stop dizem isso pelo catálogo, com saída 1', () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-dono-'));
  for (const cmd of ['status', 'stop']) {
    const r = spawnSync(process.execPath, [BIN, 'daemon', cmd], { env: env(home), encoding: 'utf8', timeout: 20_000 });
    assert.equal(r.status, 1);
    assert.equal(r.stderr.trim(), pt.t('daemon.notRunning'));
  }
});

test('socket Unix órfão de uma queda não impede o dono de subir (no Windows o pipe some com o processo)', async () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-dono-'));
  if (process.platform !== 'win32') writeFileSync(endpointFor(home), 'órfão');
  await startOwner(home);
  const st = (await call(endpointFor(home), 'daemon.status', {})) as { pid: number };
  assert.ok(st.pid > 0);
  await call(endpointFor(home), 'daemon.stop', {});
});
