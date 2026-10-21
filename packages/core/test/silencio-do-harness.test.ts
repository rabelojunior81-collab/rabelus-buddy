// Harness em silêncio (B3): quando um harness fica mudo por dentro, o andamento mostra há quanto tempo ele não dá
// sinal (lastEventAt), e a console avisa e oferece parar. Na página, silentFor é a regra pura (só harness, a partir de 30 s).
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
const regs: { close: () => Promise<void> }[] = [];
after(async () => { for (const o of owners) await killHard(o); for (const r of regs) await r.close().catch(() => {}); });

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
function fakeOpencode(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-oc-'));
  if (process.platform === 'win32') writeFileSync(join(dir, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(dir, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(dir, 'opencode'), 0o755); }
  return dir;
}
const REG = { version: '1.0.0', agents: [
  { id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './opencode.exe', args: ['acp'] } } } },
] };
async function owner(env: NodeJS.ProcessEnv) {
  const reg = await fakeHttp(() => ({ json: REG }));
  regs.push(reg);
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, ...env }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  return { home, ipc, reg };
}
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

test('harness mudo: o andamento diz quando ele deu o último sinal; não avança enquanto ele fica calado; parar encerra (B3)', async () => {
  const { ipc, reg } = await owner({ FAKE_ACP_MODE: 'ok', FAKE_ACP_PROMPT: 'silent' });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const { run } = await ipc('agent.run', { session: 's6', task: 'fique mudo', workspace, harness: 'opencode' });
  const live = await until(async () => { const l = await ipc('run.live', { session: 's6' }); return l.running?.route ? l.running : undefined; });
  assert.equal(typeof live.lastEventAt, 'number');
  assert.ok(live.lastEventAt > 1.6e12, 'milissegundos desde a época (Date.now())');
  await new Promise((r) => setTimeout(r, 600));
  const again = (await ipc('run.live', { session: 's6' })).running;
  assert.equal(again.lastEventAt, live.lastEventAt, 'não avança com o harness mudo');
  await ipc('agent.stop', { session: 's6' });
  const r = await until(async () => { const x = await ipc('run.get', { id: run }); return x.state !== 'running' ? x : undefined; });
  assert.equal(r.state, 'stopped');
  const ev = (await ipc('session.events', { session: 's6' })) as { kind: string; payload: any }[];
  assert.equal(ev.find((e) => e.kind === 'run.stopped')!.payload.reason, 'userStopped');
  await reg.close();
});

test('página: silentFor conta os segundos de silêncio só para harness e a partir de 30 s (B3)', () => {
  const { silentFor } = pure<{ silentFor: (l: unknown, now: number) => number }>(['silentFor']);
  assert.equal(silentFor({ route: 'acp:opencode', lastEventAt: 0 }, 45000), 45);
  assert.equal(silentFor({ route: 'acp:opencode', lastEventAt: 0 }, 20000), 0, 'menos de 30 s não avisa');
  assert.equal(silentFor({ route: 'ollama-cloud/modelo', lastEventAt: 0 }, 45000), 0, 'rota do Buddy não é harness');
});

test('chaves do aviso de silêncio existem nos dois catálogos (B3)', () => {
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8'));
    assert.match(cat.console.harness.silent, /\{\{name\}\}.*\{\{seconds\}\}/, `${lang}: silent`);
    assert.equal(typeof cat.console.harness.silentStop, 'string', `${lang}: silentStop`);
  }
});

test('página: esperando a aprovação do Pai, o silêncio é dele, não do agente: sem aviso (ensaio de 2026-10-20)', () => {
  const { silentFor } = pure<{ silentFor: (l: unknown, now: number) => number }>(['silentFor']);
  assert.equal(silentFor({ route: 'acp:opencode', lastEventAt: 0, phase: 'approval' }, 45000), 0);
  assert.equal(silentFor({ route: 'acp:opencode', lastEventAt: 0, phase: 'thinking' }, 45000), 45);
});
