// Peças comuns dos testes do núcleo: dono em processo filho, morte abrupta, CLI como processo.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const BIN = join(import.meta.dirname, '..', '..', 'cli', 'bin', 'rbuddy.mjs');

export const tempHome = (): string => mkdtempSync(join(tmpdir(), 'rbuddy-'));

export function envFor(home: string): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env, RBUDDY_HOME: home };
  delete e.RBUDDY_LANG;
  return e;
}

export function spawnOwner(home: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [BIN, 'daemon', 'start'], { env: envFor(home) });
    let out = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d: string) => { out += d; if (out.includes('\n')) resolve(p); });
    p.on('exit', (code) => reject(new Error(`dono saiu com ${code}: ${out}`)));
  });
}

// kill -9: SIGKILL no Unix, TerminateProcess no Windows. Espera o processo sumir.
export function killHard(p: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (p.exitCode !== null || p.signalCode !== null) return resolve();
    p.once('exit', () => resolve());
    p.kill('SIGKILL');
  });
}

export function cli(home: string, args: string[]) {
  return spawnSync(process.execPath, [BIN, ...args], { env: envFor(home), encoding: 'utf8', timeout: 30_000 });
}
