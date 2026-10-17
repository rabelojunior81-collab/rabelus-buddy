// Processo dono do núcleo (SPEC 0001, escopo 2; R5-1): único escritor do banco,
// servindo JSON-RPC 2.0 por linhas no endpoint local. Instância única pelo próprio
// endpoint: se alguém responde nele, já existe um dono.

import net from 'node:net';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { call } from '@rabelus-buddy/client/ipc';
import { openDatabase } from './db.ts';
import { EventLog } from './log.ts';
import { Domain, DomainError } from './domain.ts';
import { Budget, defaultWindows, type WindowDef } from './budget.ts';
import { Policy, type Scope, type Tool } from './policy.ts';
import { FsTools } from './tools/fs.ts';
import { CommandTool } from './tools/command.ts';
import { Agent, type AgentResult } from './agent.ts';
import { buildRoutes, credentialSource, loadConfig, removeKey, saveKey, type ProviderId } from './config.ts';
import { loadCredentials, logout, startLogin, SiwcAuthError, type PendingLogin } from './providers/siwc.ts';
import { dbPathFor, endpointFor } from './paths.ts';
import { startConsole, type ConsoleServer } from './console.ts';

// Janelas do orçamento: budget.json no diretório de estado, ou as padrão (ADR 0015).
function loadWindows(home: string): WindowDef[] {
  const file = join(home, 'budget.json');
  if (!existsSync(file)) return defaultWindows();
  return (JSON.parse(readFileSync(file, 'utf8')) as { windows: WindowDef[] }).windows;
}

export class AlreadyRunningError extends Error {
  readonly endpoint: string;
  constructor(endpoint: string) {
    super(`já existe um dono em ${endpoint}`);
    this.endpoint = endpoint;
  }
}

export interface Owner {
  endpoint: string;
  pid: number;
  closed: Promise<void>;
  close: () => Promise<void>;
}

type Handler = (params: Record<string, unknown>) => unknown;

async function someoneAnswers(endpoint: string): Promise<boolean> {
  try {
    await call(endpoint, 'daemon.status', {});
    return true;
  } catch {
    return false;
  }
}

export async function startOwner(home: string): Promise<Owner> {
  mkdirSync(home, { recursive: true });
  const endpoint = endpointFor(home);
  if (await someoneAnswers(endpoint)) throw new AlreadyRunningError(endpoint);
  // Socket Unix órfão de uma queda: ninguém respondeu, então pode ser removido.
  if (process.platform !== 'win32' && existsSync(endpoint)) unlinkSync(endpoint);

  const log = new EventLog(openDatabase(dbPathFor(home)));
  const domain = new Domain(log);
  const recovered = domain.recover();
  const budget = new Budget(log, { windows: loadWindows(home) });
  const startedAt = new Date().toISOString();
  let resolveClosed: () => void = () => {};
  const closed = new Promise<void>((r) => { resolveClosed = r; });
  const server = net.createServer();

  let consoleSrv: ConsoleServer | null = null;
  const close = (): Promise<void> => new Promise((resolve) => {
    void consoleSrv?.close();
    server.close(() => { log.db.close(); resolveClosed(); resolve(); });
    for (const s of sockets) s.destroy();
  });

  // Aprovação pelo IPC: o agente espera até alguém (CLI, outro terminal) resolver.
  const awaitApproval = async (a: { id: string }): Promise<'approve' | 'deny'> => {
    for (;;) {
      const st = domain.getApproval(a.id).state;
      if (st !== 'pending') return st === 'approved' ? 'approve' : 'deny';
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  // Um agente por pedido: workspace e credenciais podem mudar entre tarefas.
  // Parâmetros da execução vindos da console ou do IPC (SPEC 0001 rev. 5).
  const effort = (v: unknown): 'low' | 'medium' | 'high' | undefined => {
    if (v === undefined || v === null || v === '' || v === 'default') return undefined;
    if (v === 'low' || v === 'medium' || v === 'high') return v;
    throw new DomainError(-32602, `esforço inválido: ${String(v)}`);
  };
  const PROVIDERS: ProviderId[] = ['opencode-go', 'ollama-cloud', 'chatgpt', 'openrouter'];
  const route = (v: unknown): { provider: ProviderId; model: string } | undefined => {
    if (!v) return undefined;
    const r = v as { provider?: string; model?: string };
    if (!PROVIDERS.includes(r.provider as ProviderId) || !r.model) throw new DomainError(-32602, `rota inválida: ${String(r.provider)}/${String(r.model)}`);
    return { provider: r.provider as ProviderId, model: String(r.model) };
  };
  const keyProvider = (v: unknown): ProviderId => {
    if (v === 'opencode-go' || v === 'ollama-cloud' || v === 'openrouter') return v;
    throw new DomainError(-32602, `provedor sem chave de API: ${String(v)}`);
  };
  // Login do ChatGPT pelo núcleo: um por vez; o resultado fica no estado (nunca tokens no log).
  let login: PendingLogin | null = null;
  let loginError: string | null = null;

  const agentFor = (p: Record<string, unknown>): Agent => {
    const workspace = String(p.workspace ?? '');
    if (!workspace) throw new DomainError(-32602, 'workspace obrigatório');
    const policy = new Policy(log, { workspace });
    return new Agent({
      log, domain, policy, budget,
      fs: new FsTools(policy, { workspace }),
      cmd: new CommandTool(policy, { workspace }),
      routes: buildRoutes(home, loadConfig(home), process.env, route(p.route)),
      interactive: p.interactive === true,
      ...(effort(p.effort) ? { effort: effort(p.effort)! } : {}),
      awaitApproval,
    });
  };
  // Falha inesperada no laço: a execução para com motivo, sem mensagem de erro (pode carregar dados).
  const watch = (session: string, run: string, done: Promise<AgentResult>): void => {
    done.catch((e: unknown) => {
      log.append(session, 'run.error', { run, error: (e as Error)?.name ?? 'Error' });
      if (domain.getRun(run).state === 'running') domain.stopRun(run, 'internalError');
    });
  };

  const methods: Record<string, Handler> = {
    'agent.run': (p) => {
      const session = String(p.session);
      const agent = agentFor(p);
      const prior = p.continueFrom ? agent.transcript(session, String(p.continueFrom)) : undefined;
      const { run, done } = agent.begin(session, String(p.task), prior?.length ? { prior } : {});
      // Opções da execução ficam no log: a retomada usa o mesmo esforço e a mesma rota.
      log.append(session, 'run.options', { run, effort: effort(p.effort) ?? null, route: route(p.route) ?? null });
      watch(session, run, done);
      return { run };
    },
    'agent.resume': (p) => {
      const run = String(p.run);
      const r = domain.getRun(run);
      if (r.state !== 'interrupted' && r.state !== 'stopped') throw new DomainError(-32004, `execução ${run} está ${r.state}: só se retoma interrompida ou parada`, { id: run, state: r.state });
      const opts = log.events(r.session).filter((e) => e.kind === 'run.options' && (e.payload as { run?: string }).run === run).at(-1)?.payload as { effort?: string | null; route?: unknown } | undefined;
      watch(r.session, run, agentFor({ ...p, effort: p.effort ?? opts?.effort ?? undefined, route: p.route ?? opts?.route ?? undefined }).resume(r.session, run));
      return { run };
    },
    'run.list': () => domain.listRuns(),
    'providers.status': () => loadConfig(home).routes.map((r) => ({ provider: r.provider, model: r.model, source: credentialSource(home, r.provider, process.env) })),
    'keys.set': (p) => { const key = String(p.key ?? '').trim(); if (!key) throw new DomainError(-32602, 'chave vazia'); saveKey(home, keyProvider(p.provider), key); return { ok: true }; },
    'keys.remove': (p) => ({ removed: removeKey(home, keyProvider(p.provider)) }),
    'auth.chatgpt.start': async () => {
      login?.cancel();
      loginError = null;
      const pending = await startLogin({ home });
      login = pending;
      pending.done.then(() => { if (login === pending) login = null; }, (e: unknown) => { if (login === pending) { login = null; loginError = e instanceof SiwcAuthError ? e.code : 'error'; } });
      log.append('auth', 'auth.chatgpt.started', {});
      return { url: pending.url };
    },
    'auth.chatgpt.status': () => {
      const c = loadCredentials(home);
      return { loggedIn: Boolean(c?.refreshToken), planEnabled: c?.planEnabled ?? null, email: c?.email ?? null, pending: login !== null, error: loginError };
    },
    'auth.chatgpt.logout': async () => { login?.cancel(); login = null; return logout(home); },
    'policy.grant': (p) => ({ grant: new Policy(log, { workspace: home }).grant(String(p.scope) as Scope, { tool: String(p.tool) as Tool, pattern: String(p.pattern) }, { session: String(p.session) }) }),
    'daemon.status': () => ({ pid: process.pid, endpoint, startedAt, sessions: log.sessions().length, events: log.totalEvents(), recovered, ...(consoleSrv ? { console: { url: consoleSrv.url } } : {}) }),
    // Padrões da console: pasta de trabalho própria (nunca o repositório por acaso) e as rotas configuradas.
    'console.defaults': () => {
      const workspace = join(home, 'area-de-trabalho');
      mkdirSync(workspace, { recursive: true });
      return { workspace, routes: loadConfig(home).routes.map((r) => ({ provider: r.provider, model: r.model })) };
    },
    'daemon.stop': () => { setImmediate(() => { void close(); }); return { stopping: true }; },
    'event.append': (p) => log.append(String(p.session), String(p.kind), p.payload),
    'session.events': (p) => log.events(String(p.session)),
    'session.list': () => log.sessions(),
    'run.start': (p) => domain.startRun(String(p.session), String(p.task)),
    'run.finish': (p) => domain.finishRun(String(p.id)),
    'run.get': (p) => domain.getRun(String(p.id)),
    'effect.begin': (p) => domain.beginEffect(String(p.session), String(p.run), String(p.kind), String(p.key), String(p.target)),
    'effect.complete': (p) => domain.completeEffect(String(p.id), p.result),
    'effect.reconcile': (p) => domain.reconcileEffect(String(p.id), p.outcome === 'done' ? 'done' : 'not-done'),
    'effect.get': (p) => domain.getEffect(String(p.id)),
    'approval.request': (p) => domain.requestApproval(String(p.session), String(p.action)),
    'approval.resolve': (p) => domain.resolveApproval(String(p.id), p.decision === 'approve' ? 'approve' : 'deny'),
    'approval.get': (p) => domain.getApproval(String(p.id)),
    'approval.list': () => domain.pendingApprovals(),
    'budget.reserve': (p) => ({ reservation: budget.reserve(String(p.session), { provider: String(p.provider), model: String(p.model), estimateUsd: Number(p.estimateUsd) }) }),
    'budget.settle': (p) => ({ actual: budget.settle(String(p.reservation), (p.usage ?? null) as never, p.actualUsd === undefined ? undefined : Number(p.actualUsd)) }),
    'budget.release': (p) => { budget.release(String(p.reservation), String(p.reason ?? '')); return { released: true }; },
    'budget.exhausted': (p) => { budget.markExhausted(String(p.provider), p.model ? String(p.model) : null, Number(p.until), String(p.reason ?? '')); return { ok: true }; },
    'budget.status': () => budget.status(),
  };

  let lastActivity = Date.now();
  const sockets = new Set<net.Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      lastActivity = Date.now();
      buffer += chunk;
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let id: number | null = null;
        const fail = (e: unknown) => {
          const error = e instanceof DomainError ? { code: e.code, message: e.message, data: e.data } : { code: -32603, message: (e as Error).message };
          socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error })}\n`);
        };
        try {
          const req = JSON.parse(line) as { id: number; method: string; params?: Record<string, unknown> };
          id = req.id;
          const handler = methods[req.method];
          if (!handler) socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `método desconhecido: ${req.method}` } })}\n`);
          else {
            // Síncrono responde na hora (a ordem se mantém); assíncrono (login, logout) responde ao terminar.
            const out = handler(req.params ?? {});
            const reply = (result: unknown) => socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
            if (out instanceof Promise) out.then(reply, fail);
            else reply(out);
          }
        } catch (e) {
          fail(e);
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) => reject(e.code === 'EADDRINUSE' ? new AlreadyRunningError(endpoint) : e));
    server.listen({ path: endpoint, readableAll: false, writableAll: false }, () => resolve());
  });

  // Console web local (ADR 0017): mesma API, lista fechada de métodos; RBUDDY_CONSOLE=0 desliga.
  if (process.env.RBUDDY_CONSOLE !== '0') consoleSrv = await startConsole({ home, methods, touch: () => { lastActivity = Date.now(); } });

  // Ocioso se desliga (padrão 15 min; RBUDDY_IDLE_MS, 0 desliga): o dono sob demanda guardava para
  // sempre as variáveis de ambiente do primeiro terminal, e uma chave trocada não valia (2026-10-17).
  const idleMs = Number(process.env.RBUDDY_IDLE_MS ?? 15 * 60_000);
  if (idleMs > 0) {
    const timer = setInterval(() => {
      const running = domain.listRuns().some((r) => r.state === 'running');
      if (running) lastActivity = Date.now();
      else if (Date.now() - lastActivity >= idleMs) { clearInterval(timer); void close(); }
    }, Math.max(250, Math.min(idleMs / 4, 30_000)));
    timer.unref();
    void closed.then(() => clearInterval(timer));
  }

  return { endpoint, pid: process.pid, closed, close };
}
