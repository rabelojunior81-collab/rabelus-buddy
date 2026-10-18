// Servidores de conferência com dono e fim (regra do Pai, 2026-10-18): todo servidor que o buddy-dev inicia
// para conferir uma página ou ensaiar o núcleo fica registrado no diretório comum do git (visto por todos os
// worktrees), é reaproveitado para a mesma pasta ou o mesmo nome, e é encerrado ao fim da sessão.
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { commonDir } from './git.mjs';

const STATIC = join(import.meta.dirname, 'static-server.mjs');
const dir = (root) => { const d = join(commonDir(root), 'buddy-bus', 'servers'); mkdirSync(d, { recursive: true }); return d; };
// Vivo de verdade: no Unix, um filho encerrado e ainda não recolhido (zumbi) responde ao sinal 0, mas já morreu.
export function isAlive(pid) {
  try { process.kill(pid, 0); } catch (e) { return e.code === 'EPERM'; }
  try {
    if (process.platform === 'linux') return readFileSync(`/proc/${pid}/stat`, 'utf8').replace(/^.*\)\s*/, '')[0] !== 'Z';
    if (process.platform === 'darwin') return !execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim().startsWith('Z');
  } catch { return false; }
  return true;
}
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Servidores vivos; o registro de quem morreu por fora some aqui.
export function listServers(root) {
  const d = dir(root);
  const out = [];
  for (const f of readdirSync(d).filter((n) => n.endsWith('.json'))) {
    let s;
    try { s = JSON.parse(readFileSync(join(d, f), 'utf8')); } catch { continue; }
    if (isAlive(s.pid)) out.push(s);
    else for (const x of [f, f.replace(/\.json$/, '.log')]) { try { unlinkSync(join(d, x)); } catch { /* já foi */ } }
  }
  return out.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export const serversOf = (root, session) => listServers(root).filter((s) => s.session === session);

// Comando de linha (bd serve --cmd) pelo shell do sistema, como uma pessoa o digitaria.
// No Windows a linha vai intacta, entre um par de aspas que o /s do cmd.exe remove (caminhos com espaço).
export const shellCommand = (line) => (process.platform === 'win32' ? { cmd: 'cmd.exe', args: ['/d', '/s', '/c', `"${line}"`], verbatim: true } : { cmd: 'sh', args: ['-c', line] });

export async function startServer(root, spec, { session = null } = {}) {
  const served = spec.dir ? resolve(spec.dir) : null;
  const name = spec.name ?? (served ? basename(served) : basename(spec.cmd ?? 'cmd'));
  // Reaproveitar: a mesma pasta (ou o mesmo nome de comando) nunca ganha um segundo servidor.
  const same = listServers(root).find((s) => (served ? s.dir === served : !s.dir && s.name === name));
  if (same) return { ...same, reused: true };

  const d = dir(root);
  const id = `srv-${randomBytes(3).toString('hex')}`;
  const log = join(d, `${id}.log`);
  const fd = openSync(log, 'a');
  const [cmd, args] = served ? [process.execPath, [STATIC, served, String(spec.port ?? 0)]] : [spec.cmd, spec.args ?? []];
  const child = spawn(cmd, args, { detached: true, stdio: ['ignore', fd, fd], windowsHide: true, windowsVerbatimArguments: Boolean(spec.verbatim), cwd: spec.cwd ?? root });
  child.unref();
  closeSync(fd);

  let port = spec.port ?? null;
  if (served) {
    const t0 = Date.now();
    for (;;) {
      const m = /porta (\d+)/.exec(existsSync(log) ? readFileSync(log, 'utf8') : '');
      if (m) { port = Number(m[1]); break; }
      if (Date.now() - t0 > 5000 || !isAlive(child.pid)) { try { process.kill(child.pid); } catch { /* já saiu */ } throw new Error(`servidor de ${served} não subiu: ${readFileSync(log, 'utf8').slice(0, 200)}`); }
      await new Promise((ok) => setTimeout(ok, 50));
    }
  }
  const entry = { id, name, pid: child.pid, port, dir: served, cmd: served ? null : [cmd, ...args].join(' '), session, startedAt: new Date().toISOString(), log };
  writeFileSync(join(d, `${id}.json`), `${JSON.stringify(entry, null, 2)}\n`);
  return { ...entry, reused: false };
}

// Encerra por id, por pasta, por sessão ou todos; espera o processo sumir.
export function stopServers(root, { id, dir: served, session, all = false } = {}) {
  const target = served ? resolve(served) : null;
  const pick = listServers(root).filter((s) => all || (id && s.id === id) || (target && s.dir === target) || (session && s.session === session));
  for (const s of pick) {
    // A árvore inteira: o shell, o núcleo de ensaio que ele iniciou e o que mais vier abaixo.
    if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ } }
    else { try { process.kill(-s.pid, 'SIGTERM'); } catch { try { process.kill(s.pid); } catch { /* já saiu */ } } }
    for (let i = 0; i < 60 && isAlive(s.pid); i++) nap(50);
    for (const x of [`${s.id}.json`, `${s.id}.log`]) { try { unlinkSync(join(dir(root), x)); } catch { /* já foi */ } }
  }
  return pick;
}
