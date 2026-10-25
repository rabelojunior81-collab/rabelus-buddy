// Cliente ACP do núcleo (SPEC 0002, escopo 3; critério 3 nesta parte): como iniciar cada harness e a sonda de
// disponibilidade. O harness fala ACP por stdio; o SDK oficial (@agentclientprotocol/sdk) cuida do protocolo.
// Medido em 2026-10-18 nos harnesses do Pai: OpenCode 2.0.31, Hermes 0.22.2 e Copilot 1.0.97 respondem
// initialize com protocolVersion 1, agentInfo, capacidades e authMethods; "precisa de login" chega como
// auth_required (-32000) no session/new.

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { client, ndJsonStream, PROTOCOL_VERSION, type AuthMethod, type InitializeResponse } from '@agentclientprotocol/sdk';
import { scrub } from '../providers/adapters.ts';
import type { HarnessView } from './catalog.ts';

// Harness que já fala ACP direto pelo próprio executável instalado: usa o que está no computador do Pai, sem
// baixar outra cópia (a local pode ser mais nova que a do registro: OpenCode 2.0.31 × 1.19.3 em 2026-10-18).
// Confirmados por initialize real em 2026-10-18: opencode, copilot, hermes. Pelos argumentos do registro: gemini, goose.
export const LOCAL_ACP: Record<string, string[]> = {
  opencode: ['acp'], 'github-copilot-cli': ['--acp'], hermes: ['acp'], gemini: ['--acp'], goose: ['acp'],
};

export interface LaunchSpec { cmd: string; args: string[]; env: Record<string, string>; source: 'local' | 'npx' | 'uvx'; needsApproval: boolean; package?: string }

export function launchFor(v: HarnessView): LaunchSpec | null {
  const local = LOCAL_ACP[v.id];
  if (v.found && v.path && local) return { cmd: v.path, args: local, env: {}, source: 'local', needsApproval: false };
  // npx e uvx baixam código: a primeira execução de cada versão é aprovada pelo Pai (critério 4).
  if (v.launch.kind === 'npx') return { cmd: 'npx', args: ['-y', v.launch.package, ...v.launch.args], env: v.launch.env, source: 'npx', needsApproval: true, package: v.launch.package };
  if (v.launch.kind === 'uvx') return { cmd: 'uvx', args: [v.launch.package, ...v.launch.args], env: v.launch.env, source: 'uvx', needsApproval: true, package: v.launch.package };
  return null; // binário do registro (baixar e conferir o sha256) ou fora do registro e não instalado
}

// Pelo caminho do sistema, nunca pelo nome: com o PATH reduzido (ou alterado pelo usuário), "cmd.exe" não resolve.
const SYS32 = join(process.env.SystemRoot ?? process.env.windir ?? 'C:\\Windows', 'System32');
const CMD = process.env.ComSpec ?? join(SYS32, 'cmd.exe');
const TASKKILL = join(SYS32, 'taskkill.exe');

const winArg = (a: string) => (a === '' || /[\s"]/.test(a) ? `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"` : a);

// No Windows, .cmd e os lançadores do npm passam pelo cmd.exe. windowsHide cria o console já oculto (nunca janela),
// e os filhos o herdam; nada de processo desligado do console (achado do Pai, 2026-10-18).
export function spawnHarness(spec: LaunchSpec, cwd: string): ChildProcess {
  const env = { ...process.env, ...spec.env };
  if (process.platform === 'win32') {
    const viaShell = /\.(cmd|bat)$/i.test(spec.cmd) || !/[\\/]/.test(spec.cmd);
    if (viaShell) {
      const line = [winArg(spec.cmd), ...spec.args.map(winArg)].join(' ');
      return spawn(CMD, ['/d', '/s', '/c', `"${line}"`], { cwd, env, windowsHide: true, windowsVerbatimArguments: true, stdio: ['pipe', 'pipe', 'pipe'] });
    }
    return spawn(spec.cmd, spec.args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  }
  // Grupo próprio no Unix, para encerrar a árvore inteira (o npx inicia outro node).
  return spawn(spec.cmd, spec.args, { cwd, env, detached: true, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
}

export function killTree(child: ChildProcess): void {
  // Processo contido (M2.2): quem encerra é a MXC, pela árvore inteira do contêiner.
  if ((child as ChildProcess & { contained?: boolean }).contained) { if (child.exitCode === null) child.kill(); return; }
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') { try { execFileSync(TASKKILL, ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch { /* já saiu */ } }
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* já saiu */ } } }
}

export interface ProbeResult {
  state: 'pronto' | 'login' | 'falhou';
  reason?: string;
  agent?: { name: string; version?: string };
  image: boolean;
  authMethods: { id: string; name: string; type?: string }[];
  pid?: number;
  ms: number;
}

type Conn = ReturnType<ReturnType<typeof client>['connect']>;
type Init = InitializeResponse;
interface AcpCtx { conn: Conn; race: <T>(p: Promise<T>) => Promise<T>; init: Init; pid: number | undefined }
// Recusa que deve chegar a quem chamou como está (não é falha do harness): passa por withAcp sem virar motivo.
export class HarnessRefusal extends Error {}
export const agentOf = (init: Init) => (init.agentInfo ? { name: init.agentInfo.name, ...(init.agentInfo.version ? { version: init.agentInfo.version } : {}) } : undefined);

// Abre o harness, faz o initialize e roda `body`, com tempo-limite; a conexão fecha e a árvore de processos é encerrada
// no fim. Falha do harness (não iniciou, saiu, calou) vem como Error com o motivo legível e sem segredo.
async function withAcp<T>(spec: LaunchSpec, cwd: string, timeoutMs: number, body: (ctx: AcpCtx) => Promise<T>): Promise<T> {
  let child: ChildProcess;
  try { child = spawnHarness(spec, cwd); } catch (e) { throw new Error(`não foi possível iniciar: ${(e as Error).message}`); }
  let stderr = '';
  child.stderr?.on('data', (d) => { stderr = (stderr + String(d)).slice(-2000); });
  const lastLine = () => scrub(stderr.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? '');
  const ended = new Promise<never>((_, no) => {
    child.on('error', (e) => no(new Error(`não foi possível iniciar: ${e.message}`)));
    child.on('exit', (code, signal) => no(new Error(`saiu com código ${code ?? signal}${lastLine() ? `: ${lastLine()}` : ''}`)));
  });
  ended.catch(() => { /* tratado na corrida */ });
  let timer: NodeJS.Timeout | undefined;
  const limit = new Promise<never>((_, no) => { timer = setTimeout(() => no(new Error(`tempo-limite de ${Math.round(timeoutMs / 1000)} s sem resposta`)), timeoutMs); });
  limit.catch(() => { /* tratado na corrida */ });
  const race = <T>(p: Promise<T>) => Promise.race([p, ended, limit]);

  const conn = client({ name: 'rabelus-buddy' }).connect(ndJsonStream(Writable.toWeb(child.stdin!) as WritableStream<Uint8Array>, Readable.toWeb(child.stdout!) as ReadableStream<Uint8Array>));
  conn.closed.catch(() => { /* fim da conexão */ });
  try {
    const init = await race(conn.agent.request('initialize', { protocolVersion: PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } }));
    return await body({ conn, race, init, pid: child.pid });
  } catch (e) {
    if (e instanceof HarnessRefusal) throw e;
    let why = (e as Error).message;
    // A conexão fecha antes de o sistema avisar a saída: espera a saída para dar o motivo de verdade.
    if (/connection closed/i.test(why)) why = await Promise.race([ended.catch((x: Error) => x.message), new Promise<string>((ok) => setTimeout(() => ok(why), 2000))]);
    throw new Error(scrub(why));
  } finally {
    clearTimeout(timer);
    try { conn.close(); } catch { /* já fechada */ }
    killTree(child);
    for (let i = 0; i < 60 && child.exitCode === null && child.signalCode === null; i++) await new Promise((ok) => setTimeout(ok, 50));
  }
}

const isAuthRequired = (e: unknown) => (e as { code?: number }).code === -32000;
// Tipo do método de login: "terminal" é o único com campo `type` no ACP; o padrão (sem `type`) é o do próprio agente.
const typeOf = (m: AuthMethod): string | undefined => ('type' in m && typeof m.type === 'string' ? m.type : undefined);
// Métodos que o Buddy pode oferecer ao Pai: os do tipo terminal rodam o harness num terminal interativo, que o ACP
// proíbe passar ao authenticate e o Pai não usa (o produto é um agente com UX/UI).
export const loginMethods = (init: Init) => (init.authMethods ?? []).filter((m) => typeOf(m) !== 'terminal').map((m) => ({ id: m.id, name: m.name }));

// Sonda: initialize e session/new (numa pasta de trabalho), com tempo-limite; a sessão de teste é fechada quando o
// harness permite. Nunca lança: falha vem como estado com o motivo.
// Limite padrão de 30 s: o Hermes real levou 14 s para ficar pronto (2026-10-18).
export async function probeHarness(spec: LaunchSpec, { cwd, timeoutMs = 30_000 }: { cwd: string; timeoutMs?: number }): Promise<ProbeResult> {
  const t0 = Date.now();
  const out: ProbeResult = { state: 'falhou', image: false, authMethods: [], ms: 0 };
  try {
    await withAcp(spec, cwd, timeoutMs, async ({ conn, race, init, pid }) => {
      out.pid = pid;
      out.agent = agentOf(init);
      out.image = Boolean(init.agentCapabilities?.promptCapabilities?.image);
      out.authMethods = (init.authMethods ?? []).map((m) => ({ id: m.id, name: m.name, ...(typeOf(m) ? { type: typeOf(m) } : {}) }));
      try {
        const s = await race(conn.agent.request('session/new', { cwd, mcpServers: [] }));
        if (init.agentCapabilities?.sessionCapabilities?.close) await race(conn.agent.request('session/close', { sessionId: s.sessionId })).catch(() => {});
        out.state = 'pronto';
      } catch (e) {
        if (isAuthRequired(e)) { out.state = 'login'; out.reason = 'o harness pede login (auth_required)'; }
        else throw e;
      }
    });
  } catch (e) {
    out.state = 'falhou';
    out.reason = (e as Error).message;
  }
  out.ms = Date.now() - t0;
  return out;
}

export interface LoginResult { state: 'pronto' | 'login' | 'falhou'; reason?: string; agent?: { name: string; version?: string } }

// Login do harness (SPEC 0002, critério 7): authenticate com o método escolhido; o harness abre o navegador e guarda a
// própria credencial, que nunca passa por aqui. Confere com session/new. Limite padrão de 5 min: o Pai entra no
// navegador. Método desconhecido ou de terminal: HarnessRefusal, antes do authenticate.
export async function loginHarness(spec: LaunchSpec, { cwd, methodId, timeoutMs = 300_000 }: { cwd: string; methodId: string; timeoutMs?: number }): Promise<LoginResult> {
  try {
    return await withAcp(spec, cwd, timeoutMs, async ({ conn, race, init }): Promise<LoginResult> => {
      const agent = agentOf(init);
      const m = (init.authMethods ?? []).find((x) => x.id === methodId);
      if (!m) throw new HarnessRefusal(`método de login desconhecido: ${methodId}`);
      if (typeOf(m) === 'terminal') throw new HarnessRefusal(`o método "${m.name}" abre um terminal: o Buddy não faz login por terminal`);
      try { await race(conn.agent.request('authenticate', { methodId })); }
      catch (e) {
        // Resposta de erro do harness (login recusado, cancelado): continua precisando de login. Saída ou silêncio: falhou.
        if (typeof (e as { code?: unknown }).code !== 'number') throw e;
        return { state: 'login', reason: scrub((e as Error).message).slice(0, 300), ...(agent ? { agent } : {}) };
      }
      try {
        const s = await race(conn.agent.request('session/new', { cwd, mcpServers: [] }));
        if (init.agentCapabilities?.sessionCapabilities?.close) await race(conn.agent.request('session/close', { sessionId: s.sessionId })).catch(() => {});
        return { state: 'pronto', ...(agent ? { agent } : {}) };
      } catch (e) {
        if (isAuthRequired(e)) return { state: 'login', reason: 'o harness continua pedindo login depois do authenticate', ...(agent ? { agent } : {}) };
        throw e;
      }
    });
  } catch (e) {
    if (e instanceof HarnessRefusal) throw e;
    return { state: 'falhou', reason: (e as Error).message };
  }
}
