// Contenção de execução (M2.1; SPEC 0003; ADR 0019): o comando roda contido pelo sistema, pela MXC
// (@microsoft/mxc-sdk): ProcessContainer no Windows, bubblewrap no Linux, Seatbelt no macOS.
// O perfil é o que o spike de 2026-10-25 mediu (docs/registros/2026-10-25T085733-0300-ensaio-do-spike-de-contencao-m2-0):
// - a pasta de trabalho com leitura e escrita; o .git e as áreas protegidas só leitura; segredos negados;
// - as pastas acima só para listar (o node resolve o caminho real e consulta cada uma), nunca a própria pasta, que
//   em "só listar" perde a escrita;
// - no Windows, a interface ligada: com ela desligada o node.exe não inicializa (0xC0000142);
// - rede negada, salvo pelo proxy do núcleo (M2.3): cada destino passa pela política, e o novo vira cartão "rede".
// A contenção só vale depois de confirmada por uma execução real (status); sem ela, o comando roda como antes.

import { readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect, type Socket } from 'node:net';
import { dirname, join, basename, delimiter, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import type { ExecResult } from '../tools/command.ts';

export interface Profile { readwrite: string[]; readonly: string[]; denied: string[]; enumerate: string[] }
export interface ContainmentStatus { ok: boolean; level?: string; reason?: string }
// Rede do comando contido: só pelo proxy do núcleo (sem isto, rede toda negada).
export interface NetAccess { proxyUrl: string }
export interface Containment {
  status(): Promise<ContainmentStatus>;
  run(command: string, cwd: string, profile: Profile, net?: NetAccess): Promise<ExecResult>;
}

// Proxy de rede do núcleo (M2.3): HTTP CONNECT em 127.0.0.1, porta livre. Cada destino passa por `decide` (a política,
// e o cartão quando é novo); liberado, o túnel abre do lado de fora; negado, 403. Pedido HTTP sem CONNECT é recusado
// (405): os clientes que respeitam HTTPS_PROXY usam CONNECT, e HTTP puro não sai.
export interface NetProxy { url: string; destinos(): { host: string; port: number; ok: boolean }[]; close(): Promise<void> }
export async function netProxy(decide: (host: string, port: number) => Promise<boolean>): Promise<NetProxy> {
  const destinos: { host: string; port: number; ok: boolean }[] = [];
  const sockets = new Set<Socket>();
  const srv = createServer((_q, r) => { r.writeHead(405); r.end(); });
  srv.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  srv.on('connect', async (req, sock: Socket) => {
    sock.on('error', () => sock.destroy());
    const m = /^\[?([^\]]+?)\]?:(\d+)$/.exec(String(req.url ?? ''));
    if (!m) { sock.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return; }
    const host = m[1]!.toLowerCase(), port = Number(m[2]);
    let ok = false;
    try { ok = await decide(host, port); } catch { ok = false; }
    destinos.push({ host, port, ok });
    if (!ok) { sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const up = connect(port, host, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.pipe(sock); sock.pipe(up); });
    sockets.add(up);
    up.on('close', () => sockets.delete(up));
    up.on('error', () => sock.destroy());
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  return {
    url: `http://127.0.0.1:${(srv.address() as { port: number }).port}`,
    destinos: () => [...destinos],
    close: () => new Promise<void>((ok) => { for (const s of sockets) s.destroy(); srv.close(() => ok()); }),
  };
}

// Os mesmos protegidos do motor de política (policy.ts, PROTECTED): pastas só leitura, arquivos de segredo negados.
const READ_ONLY_DIRS = ['.git', '.buddy-dev', 'archive'];
const SECRET = (name: string) => name.startsWith('.env') || name.endsWith('.pem') || name.endsWith('.key');
const SKIP = new Set(['node_modules', '.git']);
const MAX_DEPTH = 4;

function secretsUnder(dir: string, depth = 0, out: string[] = []): string[] {
  let entries: import('node:fs').Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name) && depth < MAX_DEPTH) secretsUnder(p, depth + 1, out); }
    else if (SECRET(e.name)) out.push(p);
  }
  return out;
}

const above = (p: string): string[] => { const out: string[] = []; let d = p; while (dirname(d) !== d) { d = dirname(d); out.push(d); } return out; };
const isDir = (p: string): boolean => { try { return statSync(p).isDirectory(); } catch { return false; } };
const inside = (p: string, root: string): boolean => p === root || p.startsWith(root + '\\') || p.startsWith(root + '/');

// O que os comandos precisam ler para rodar: o runtime do node e as pastas do PATH. No Windows, um programa em
// "bin" ou "cmd" entra com a raiz dele (o git em Git\cmd chama o que mora em Git\mingw64). No Linux e no macOS,
// as pastas do sistema de onde vêm as bibliotecas.
function runtimeDirs(workspace: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  const dirs = new Set<string>([dirname(process.execPath)]);
  for (const d of String(env.PATH ?? env.Path ?? '').split(platform === 'win32' ? ';' : delimiter)) {
    if (!d || !isAbsolute(d) || !isDir(d) || inside(d, workspace)) continue;
    dirs.add(d);
    const parent = dirname(d);
    if (platform === 'win32' && ['bin', 'cmd'].includes(basename(d).toLowerCase()) && dirname(parent) !== parent && !/program files( \(x86\))?$/i.test(parent)) dirs.add(parent);
  }
  if (platform !== 'win32') for (const d of ['/usr', '/lib', '/lib64', '/bin', '/etc']) if (isDir(d)) dirs.add(d);
  return [...dirs];
}

export function profileFor(workspace: string, { env = process.env, platform = process.platform }: { env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform } = {}): Profile {
  const protectedDirs = READ_ONLY_DIRS.map((d) => join(workspace, d)).filter(isDir);
  const readonly = [...runtimeDirs(workspace, env, platform), ...protectedDirs];
  return {
    readwrite: [workspace],
    readonly,
    denied: secretsUnder(workspace),
    enumerate: [...new Set([...readonly, workspace].flatMap(above))].filter((d) => !inside(d, workspace)),
  };
}

// Linha de comando dentro da contenção: a MXC executa a linha direto (sem shell), então o shell entra explícito.
const shellLine = (command: string, platform: NodeJS.Platform): string =>
  platform === 'win32' ? `cmd.exe /d /s /c "${command}"` : `/bin/sh -c '${command.replace(/'/g, `'\\''`)}'`;

type Mxc = typeof import('@microsoft/mxc-sdk/v1');

export function mxcContainment({ env = process.env, platform = process.platform, timeoutMs = 120_000 }: { env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform; timeoutMs?: number } = {}): Containment {
  let mxc: Promise<Mxc> | undefined;
  let checked: Promise<ContainmentStatus> | undefined;
  const load = () => (mxc ??= import('@microsoft/mxc-sdk/v1'));
  const exec = async (m: Mxc, command: string, cwd: string, p: Profile, net?: NetAccess): Promise<ExecResult> => {
    // Com proxy, cada backend quer a entrada de um jeito (achados do spike): ProcessContainer e Seatbelt exigem a
    // entrada liberada com o loopback do host; o bubblewrap recusa regras de entrada. A saída continua negada.
    const network = net
      ? { egress: { default: 'deny' as const }, ...(platform === 'linux' ? {} : { ingress: { default: 'allow' as const, hostLoopback: 'allow' as const } }), runtimeConfig: { networkProxy: net.proxyUrl } }
      : { egress: { default: 'deny' as const } };
    const r = await m.run({
      command: shellLine(command, platform),
      workingDirectory: cwd,
      filesystem: { readwritePaths: p.readwrite, readonlyPaths: p.readonly, deniedPaths: p.denied },
      network,
      ...(net ? { environment: { HTTPS_PROXY: net.proxyUrl, HTTP_PROXY: net.proxyUrl, https_proxy: net.proxyUrl, http_proxy: net.proxyUrl }, inheritDefaultEnvironment: true } : {}),
      ...(platform === 'win32' ? { ui: { disable: false }, containment: { type: 'processcontainer' as const, config: { filesystem: { enumeratePaths: p.enumerate } } } } : {}),
      timeoutMs,
    });
    return { code: r.timedOut ? 124 : r.exitCode ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  };
  const probe = async (): Promise<ContainmentStatus> => {
    if (/^(off|0|false|desligada)$/i.test(String(env.RBUDDY_CONTAINMENT ?? ''))) return { ok: false, reason: 'contenção desligada (RBUDDY_CONTAINMENT=off)' };
    try {
      const m = await load();
      const sup = m.getPlatformSupport();
      if (!sup.isSupported) return { ok: false, reason: `a contenção não roda nesta máquina: ${sup.reason || 'sem suporte'}` };
      // Confirmar com uma execução real: suporte declarado não é contenção funcionando (lição do spike).
      const ws = tmpdir();
      const r = await exec(m, `"${process.execPath}" -v`, ws, { readwrite: [], readonly: [dirname(process.execPath)], denied: [], enumerate: above(dirname(process.execPath)) });
      if (r.code !== 0 || !r.stdout.trim().startsWith('v')) return { ok: false, reason: `a contenção não confirmou: código ${r.code} ${r.stderr.trim().slice(0, 200)}` };
      return { ok: true, level: `mxc:${sup.isolationTier ?? sup.availableMethods?.[0] ?? platform}` };
    } catch (e) {
      return { ok: false, reason: `a contenção não carregou: ${String((e as Error).message ?? e).slice(0, 200)}` };
    }
  };
  return {
    status: () => (checked ??= probe()),
    run: async (command, cwd, profile, net) => exec(await load(), command, cwd, profile, net),
  };
}
