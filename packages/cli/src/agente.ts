// Comandos do agente na CLI (SPEC 0001, escopo 16): run, resume, status, log, providers e login por chave.
// O trabalho roda no dono; a CLI sobe o dono sob demanda, acompanha os eventos e pergunta as aprovações.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import readline from 'node:readline';
import type { I18n } from '@rabelus-buddy/client/i18n';
import { call, RpcError, RPC_ERR } from '@rabelus-buddy/client/ipc';
import { stateHome, endpointFor, loadConfig, hasCredential, saveKey, removeKey, type ProviderId } from '@rabelus-buddy/core';

export interface Io { out: (text: string) => void; err: (text: string) => void }
export type Prompt = (question: string, opts?: { hidden?: boolean }) => Promise<string>;
export interface AgentDeps { cwd?: string; interactive?: boolean; prompt?: Prompt }

interface Ev { seq: number; kind: string; payload: Record<string, unknown> }
interface Run { id: string; session: string; task: string; state: string }

const BIN = join(import.meta.dirname, '..', 'bin', 'rbuddy.mjs');
const KEY_PROVIDERS = ['opencode-go', 'ollama-cloud', 'openrouter'] as const;
export const isKeyProvider = (p: string | undefined): p is (typeof KEY_PROVIDERS)[number] => (KEY_PROVIDERS as readonly string[]).includes(p ?? '');

// Pergunta no terminal; com `hidden`, sem eco (chaves).
export const terminalPrompt: Prompt = (question, { hidden = false } = {}) => new Promise((resolve) => {
  if (!hidden || !process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a); });
    return;
  }
  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  let value = '';
  const onData = (ch: string) => {
    for (const c of ch) {
      if (c === '\r' || c === '\n') { stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n'); resolve(value); return; }
      if (c === '\u0003') { stdin.setRawMode(false); process.exit(130); }
      if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
      else value += c;
    }
  };
  stdin.on('data', onData);
});

async function answers(endpoint: string): Promise<boolean> {
  try { await call(endpoint, 'daemon.status', {}); return true; } catch { return false; }
}

// Dono sob demanda (escopo 2): se ninguém responde, sobe um em segundo plano e espera.
async function ensureOwner(env: NodeJS.ProcessEnv, io: Io, { t }: I18n): Promise<string | null> {
  const endpoint = endpointFor(stateHome(env));
  if (await answers(endpoint)) return endpoint;
  io.out(t('run.ownerStarting'));
  const child = spawn(process.execPath, [BIN, 'daemon', 'start'], { detached: true, stdio: 'ignore', env, windowsHide: true });
  child.unref();
  const t0 = Date.now();
  while (Date.now() - t0 < 15_000) {
    if (await answers(endpoint)) return endpoint;
    await new Promise((r) => setTimeout(r, 100));
  }
  io.err(t('run.ownerFailed'));
  return null;
}

// Uma linha do catálogo por evento relevante; a conversa (agent.message) nunca aparece.
function formatter({ t }: I18n): (e: Ev) => string | null {
  const routes = new Map<string, string>();
  return (e) => {
    const p = e.payload;
    switch (e.kind) {
      case 'run.started': return t('log.runStarted', { run: p.run });
      case 'run.finished': return t('log.runFinished', { run: p.run });
      case 'run.stopped': return t('log.runStopped', { run: p.run, reason: p.reason });
      case 'run.interrupted': return t('log.runInterrupted', { run: p.run });
      case 'run.resumed': return t('log.runResumed', { run: p.run });
      case 'agent.step': {
        const u = p.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        return t('log.step', { step: p.step, route: p.route, input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0 });
      }
      case 'budget.reserved': routes.set(String(p.reservation), `${String(p.provider)}/${String(p.model)}`); return null;
      case 'budget.settled': return t('log.settled', { amount: Number(p.actual ?? 0).toFixed(4), route: routes.get(String(p.reservation)) ?? '?' });
      case 'provider.error': return t('log.providerError', { route: p.route, code: p.code, message: p.message });
      case 'provider.switched': return t('log.switched', { from: p.from, to: p.to, reason: p.reason });
      case 'approval.requested': return t('log.approvalRequested', { action: p.action });
      case 'approval.resolved': return t('log.approvalResolved', { decision: t(p.decision === 'approve' ? 'log.approved' : 'log.denied') });
      case 'file.written': return t('log.fileWritten', { path: p.path });
      case 'command.ran': return t('log.commandRan', { command: p.command, code: p.code });
      case 'effect.unknown': return t('log.effectUnknown', { effect: p.effect });
      case 'effect.reconciled': return t('log.reconciled', { effect: p.effect, outcome: p.outcome });
      case 'context.compacted': return t('log.compacted', { before: p.before, after: p.after });
      default: return null;
    }
  };
}

const events = async (endpoint: string, session: string): Promise<Ev[]> => (await call(endpoint, 'session.events', { session })) as Ev[];

// Acompanha a execução: mostra os eventos novos e pergunta cada aprovação até o fim.
async function follow(endpoint: string, session: string, run: string, after: number, io: Io, i18n: I18n, deps: AgentDeps): Promise<number> {
  const { t } = i18n;
  const fmt = formatter(i18n);
  let last = after;
  const asked = new Set<string>();
  for (;;) {
    let evs: Ev[];
    // Dono fora do ar no meio: mensagem do catálogo e o caminho de volta, nunca stack trace.
    try { evs = await events(endpoint, session); } catch (e) {
      if (e instanceof RpcError) throw e;
      io.err(t('run.ownerLost', { run }));
      return 1;
    }
    for (const e of evs) {
      if (e.seq <= after) { if (e.kind === 'budget.reserved') fmt(e); continue; }
      if (e.seq <= last) continue;
      last = e.seq;
      const line = fmt(e);
      if (line) io.out(line);
      if (e.kind === 'approval.requested' && deps.interactive && !asked.has(String(e.payload.approval))) {
        asked.add(String(e.payload.approval));
        const a = await (deps.prompt ?? terminalPrompt)(t('run.ask', { action: e.payload.action }));
        const decision = a.trim().toLowerCase().startsWith(t('run.yes')) ? 'approve' : 'deny';
        try { await call(endpoint, 'approval.resolve', { id: e.payload.approval, decision }); } catch (err) { if (!(err instanceof RpcError && err.code === RPC_ERR.alreadyResolved)) throw err; }
      }
      const ended = (e.kind === 'run.finished' || e.kind === 'run.stopped') && e.payload.run === run;
      if (!ended) continue;
      if (e.kind === 'run.finished') {
        const reply = evs.filter((x) => x.kind === 'agent.message' && x.payload.run === run && (x.payload.message as { role: string }).role === 'assistant').at(-1);
        const text = (reply?.payload.message as { content?: string } | undefined)?.content;
        if (text) io.out(text);
        io.out(t('run.done', { run }));
        return 0;
      }
      io.err(t('run.stopped', { reason: e.payload.reason }));
      return 1;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function runCmd(task: string | undefined, env: NodeJS.ProcessEnv, io: Io, i18n: I18n, deps: AgentDeps): Promise<number> {
  const { t } = i18n;
  if (!task) { io.err(t('run.usage')); return 1; }
  const home = stateHome(env);
  if (!loadConfig(home).routes.some((r) => hasCredential(home, r.provider, env))) { io.err(t('run.noProvider')); return 1; }
  const endpoint = await ensureOwner(env, io, i18n);
  if (!endpoint) return 1;
  const session = `ses-${randomBytes(4).toString('hex')}`;
  const interactive = deps.interactive ?? Boolean(process.stdin.isTTY);
  const { run } = (await call(endpoint, 'agent.run', { session, task, workspace: deps.cwd ?? process.cwd(), interactive })) as { run: string };
  io.out(t('run.started', { run, session }));
  return follow(endpoint, session, run, 0, io, i18n, { ...deps, interactive });
}

export async function resumeCmd(runId: string | undefined, env: NodeJS.ProcessEnv, io: Io, i18n: I18n, deps: AgentDeps): Promise<number> {
  const { t } = i18n;
  if (!runId) { io.err(t('run.resumeUsage')); return 1; }
  const endpoint = await ensureOwner(env, io, i18n);
  if (!endpoint) return 1;
  let r: Run;
  try { r = (await call(endpoint, 'run.get', { id: runId })) as Run; } catch (e) {
    if (e instanceof RpcError && e.code === RPC_ERR.notFound) { io.err(t('run.notFound', { run: runId })); return 1; }
    throw e;
  }
  const interactive = deps.interactive ?? Boolean(process.stdin.isTTY);
  const after = (await events(endpoint, r.session)).at(-1)?.seq ?? 0;
  try {
    await call(endpoint, 'agent.resume', { run: runId, workspace: deps.cwd ?? process.cwd(), interactive });
  } catch (e) {
    if (e instanceof RpcError && e.code === RPC_ERR.alreadyResolved) { io.err(t('run.cannotResume', { run: runId, state: String(e.data.state) })); return 1; }
    throw e;
  }
  io.out(t('run.resumed', { run: runId }));
  return follow(endpoint, r.session, runId, after, io, i18n, { ...deps, interactive });
}

export async function statusCmd(env: NodeJS.ProcessEnv, io: Io, { t }: I18n): Promise<number> {
  const endpoint = endpointFor(stateHome(env));
  let st: { pid: number };
  try { st = (await call(endpoint, 'daemon.status', {})) as { pid: number }; } catch { io.err(t('daemon.notRunning')); return 1; }
  const runs = (await call(endpoint, 'run.list', {})) as Run[];
  io.out([t('status.header', { pid: st.pid, runs: runs.length }), ...runs.slice(-20).map((r) => t('status.run', { run: r.id, session: r.session, state: t(`status.state.${r.state}`) }))].join('\n'));
  return 0;
}

export async function logCmd(arg: string | undefined, env: NodeJS.ProcessEnv, io: Io, i18n: I18n): Promise<number> {
  const { t } = i18n;
  if (!arg) { io.err(t('log.usage')); return 1; }
  const endpoint = endpointFor(stateHome(env));
  if (!(await answers(endpoint))) { io.err(t('daemon.notRunning')); return 1; }
  let session = arg;
  if (arg.startsWith('run-')) {
    try { session = ((await call(endpoint, 'run.get', { id: arg })) as Run).session; } catch { io.err(t('run.notFound', { run: arg })); return 1; }
  }
  const fmt = formatter(i18n);
  const lines = (await events(endpoint, session)).map(fmt).filter((l): l is string => l !== null);
  io.out(lines.length ? lines.join('\n') : t('log.empty', { session }));
  return 0;
}

export function providersCmd(env: NodeJS.ProcessEnv, io: Io, { t }: I18n): number {
  const home = stateHome(env);
  const lines = loadConfig(home).routes.map((r, i) => t(hasCredential(home, r.provider, env) ? 'providers.ready' : 'providers.missing', { n: i + 1, route: `${r.provider}/${r.model}` }));
  io.out([t('providers.header'), ...lines].join('\n'));
  return 0;
}

export async function keyLogin(provider: ProviderId, env: NodeJS.ProcessEnv, io: Io, { t }: I18n, deps: AgentDeps): Promise<number> {
  const key = (await (deps.prompt ?? terminalPrompt)(t('keys.prompt', { provider }), { hidden: true })).trim();
  if (!key) { io.err(t('keys.empty')); return 1; }
  saveKey(stateHome(env), provider, key);
  io.out(t('keys.saved', { provider }));
  return 0;
}

export function keyLogout(provider: ProviderId, env: NodeJS.ProcessEnv, io: Io, { t }: I18n): number {
  io.out(t(removeKey(stateHome(env), provider) ? 'keys.removed' : 'keys.none', { provider }));
  return 0;
}
