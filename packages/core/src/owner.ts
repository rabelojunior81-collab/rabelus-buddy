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
import { buildRoutes, loadConfig } from './config.ts';
import { dbPathFor, endpointFor } from './paths.ts';

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

  const close = (): Promise<void> => new Promise((resolve) => {
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
  const agentFor = (p: Record<string, unknown>): Agent => {
    const workspace = String(p.workspace ?? '');
    if (!workspace) throw new DomainError(-32602, 'workspace obrigatório');
    const policy = new Policy(log, { workspace });
    return new Agent({
      log, domain, policy, budget,
      fs: new FsTools(policy, { workspace }),
      cmd: new CommandTool(policy, { workspace }),
      routes: buildRoutes(home, loadConfig(home)),
      interactive: p.interactive === true,
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
      const { run, done } = agentFor(p).begin(session, String(p.task));
      watch(session, run, done);
      return { run };
    },
    'agent.resume': (p) => {
      const run = String(p.run);
      const r = domain.getRun(run);
      if (r.state !== 'interrupted' && r.state !== 'stopped') throw new DomainError(-32004, `execução ${run} está ${r.state}: só se retoma interrompida ou parada`, { id: run, state: r.state });
      watch(r.session, run, agentFor(p).resume(r.session, run));
      return { run };
    },
    'run.list': () => domain.listRuns(),
    'policy.grant': (p) => ({ grant: new Policy(log, { workspace: home }).grant(String(p.scope) as Scope, { tool: String(p.tool) as Tool, pattern: String(p.pattern) }, { session: String(p.session) }) }),
    'daemon.status': () => ({ pid: process.pid, endpoint, startedAt, sessions: log.sessions().length, events: log.totalEvents(), recovered }),
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

  const sockets = new Set<net.Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let id: number | null = null;
        try {
          const req = JSON.parse(line) as { id: number; method: string; params?: Record<string, unknown> };
          id = req.id;
          const handler = methods[req.method];
          if (!handler) socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `método desconhecido: ${req.method}` } })}\n`);
          else socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, result: handler(req.params ?? {}) })}\n`);
        } catch (e) {
          const error = e instanceof DomainError ? { code: e.code, message: e.message, data: e.data } : { code: -32603, message: (e as Error).message };
          socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error })}\n`);
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) => reject(e.code === 'EADDRINUSE' ? new AlreadyRunningError(endpoint) : e));
    server.listen({ path: endpoint, readableAll: false, writableAll: false }, () => resolve());
  });

  return { endpoint, pid: process.pid, closed, close };
}
