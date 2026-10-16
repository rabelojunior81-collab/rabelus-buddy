// Execuções, efeitos externos e aprovações (SPEC 0001, escopos 1, 10 e 12; R5-5, R5-7).
// Tudo é evento no log; as tabelas proj_* são projeções reconstruíveis.
// Efeito externo: intenção → tentativa → recibo. Sem recibo depois de uma queda, o
// efeito fica "desconhecido" e bloqueia nova tentativa com a mesma identidade (key)
// até a reconciliação.

import { randomUUID } from 'node:crypto';
import type { Database } from './db.ts';
import { transaction } from './db.ts';
import type { EventLog } from './log.ts';

export const DOMAIN_SCHEMA = `
CREATE TABLE IF NOT EXISTS proj_runs (id TEXT PRIMARY KEY, session TEXT NOT NULL, task TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proj_effects (id TEXT PRIMARY KEY, session TEXT NOT NULL, run TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, target TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proj_approvals (id TEXT PRIMARY KEY, session TEXT NOT NULL, action TEXT NOT NULL, state TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS proj_effects_key ON proj_effects (key, state);`;

export const DOMAIN_PROJECTIONS = ['proj_runs', 'proj_effects', 'proj_approvals'];

// Códigos de erro do protocolo (JSON-RPC, faixa de aplicação).
export const ERR = { needsReconciliation: -32001, notUnknown: -32002, notFound: -32003, alreadyResolved: -32004 } as const;

export class DomainError extends Error {
  readonly code: number;
  readonly data: Record<string, unknown>;
  constructor(code: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

export interface Run { id: string; session: string; task: string; state: 'running' | 'done' | 'interrupted' }
export interface Effect { id: string; session: string; run: string; kind: string; key: string; target: string; state: 'pending' | 'attempting' | 'done' | 'unknown' | 'failed' }
export interface Approval { id: string; session: string; action: string; state: 'pending' | 'approved' | 'denied' }

type P = Record<string, unknown>;
const s = (v: unknown): string => String(v);

// Campos obrigatórios de cada evento de domínio: evento malformado não entra no log.
const REQUIRED: Record<string, string[]> = {
  'run.started': ['run', 'task'],
  'run.finished': ['run'],
  'run.interrupted': ['run'],
  'effect.intent': ['effect', 'run', 'kind', 'key', 'target'],
  'effect.attempt': ['effect'],
  'effect.receipt': ['effect'],
  'effect.unknown': ['effect'],
  'effect.reconciled': ['effect', 'outcome'],
  'approval.requested': ['approval', 'action'],
  'approval.resolved': ['approval', 'decision'],
};

export function validateDomainEvent(kind: string, payload: P): void {
  const missing = (REQUIRED[kind] ?? []).filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '');
  if (missing.length) throw new Error(`evento ${kind} malformado: faltam ${missing.join(', ')}`);
}

// Aplica um evento às projeções do domínio (chamado pelo log, inclusive no replay).
export function projectDomain(db: Database, session: string, kind: string, payload: P): void {
  switch (kind) {
    case 'run.started':
      db.prepare('INSERT INTO proj_runs (id, session, task, state) VALUES (?, ?, ?, ?)').run(s(payload.run), session, s(payload.task), 'running');
      break;
    case 'run.finished':
    case 'run.interrupted':
      db.prepare('UPDATE proj_runs SET state = ? WHERE id = ?').run(kind === 'run.finished' ? 'done' : 'interrupted', s(payload.run));
      break;
    case 'effect.intent':
      db.prepare('INSERT INTO proj_effects (id, session, run, kind, key, target, state) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(s(payload.effect), session, s(payload.run), s(payload.kind), s(payload.key), s(payload.target), 'pending');
      break;
    case 'effect.attempt':
    case 'effect.receipt':
    case 'effect.unknown': {
      const state = { 'effect.attempt': 'attempting', 'effect.receipt': 'done', 'effect.unknown': 'unknown' }[kind];
      db.prepare('UPDATE proj_effects SET state = ? WHERE id = ?').run(state, s(payload.effect));
      break;
    }
    case 'effect.reconciled':
      db.prepare('UPDATE proj_effects SET state = ? WHERE id = ?').run(payload.outcome === 'done' ? 'done' : 'failed', s(payload.effect));
      break;
    case 'approval.requested':
      db.prepare('INSERT INTO proj_approvals (id, session, action, state) VALUES (?, ?, ?, ?)').run(s(payload.approval), session, s(payload.action), 'pending');
      break;
    case 'approval.resolved':
      db.prepare('UPDATE proj_approvals SET state = ? WHERE id = ?').run(payload.decision === 'approve' ? 'approved' : 'denied', s(payload.approval));
      break;
    default:
      break;
  }
}

const newId = (prefix: string): string => `${prefix}-${randomUUID().slice(0, 8)}`;

export class Domain {
  readonly log: EventLog;
  constructor(log: EventLog) {
    this.log = log;
  }

  private get db(): Database { return this.log.db; }

  getRun(id: string): Run {
    const r = this.db.prepare('SELECT * FROM proj_runs WHERE id = ?').get(id) as Run | undefined;
    if (!r) throw new DomainError(ERR.notFound, `execução ${id} não existe`, { id });
    return r;
  }

  getEffect(id: string): Effect {
    const e = this.db.prepare('SELECT * FROM proj_effects WHERE id = ?').get(id) as Effect | undefined;
    if (!e) throw new DomainError(ERR.notFound, `efeito ${id} não existe`, { id });
    return e;
  }

  getApproval(id: string): Approval {
    const a = this.db.prepare('SELECT * FROM proj_approvals WHERE id = ?').get(id) as Approval | undefined;
    if (!a) throw new DomainError(ERR.notFound, `aprovação ${id} não existe`, { id });
    return a;
  }

  startRun(session: string, task: string): Run {
    const run = newId('run');
    this.log.append(session, 'run.started', { run, task });
    return this.getRun(run);
  }

  finishRun(id: string): Run {
    const r = this.getRun(id);
    this.log.append(r.session, 'run.finished', { run: id });
    return this.getRun(id);
  }

  beginEffect(session: string, run: string, kind: string, key: string, target: string): Effect {
    return transaction(this.db, () => {
      const unknown = this.db.prepare("SELECT id FROM proj_effects WHERE key = ? AND state = 'unknown'").get(key) as { id: string } | undefined;
      if (unknown) {
        throw new DomainError(ERR.needsReconciliation, `efeito desconhecido com a mesma identidade (${key}): reconciliar ${unknown.id} antes de tentar de novo`, { key, effect: unknown.id });
      }
      const effect = newId('eff');
      this.log.appendInTx(session, 'effect.intent', { effect, run, kind, key, target });
      this.log.appendInTx(session, 'effect.attempt', { effect });
      return this.getEffect(effect);
    });
  }

  completeEffect(id: string, result: unknown): Effect {
    const e = this.getEffect(id);
    this.log.append(e.session, 'effect.receipt', { effect: id, result });
    return this.getEffect(id);
  }

  reconcileEffect(id: string, outcome: 'done' | 'not-done'): Effect {
    const e = this.getEffect(id);
    if (e.state !== 'unknown') throw new DomainError(ERR.notUnknown, `só se reconcilia efeito desconhecido (${id} está ${e.state})`, { id, state: e.state });
    this.log.append(e.session, 'effect.reconciled', { effect: id, outcome });
    return this.getEffect(id);
  }

  requestApproval(session: string, action: string): Approval {
    const approval = newId('ap');
    this.log.append(session, 'approval.requested', { approval, action });
    return this.getApproval(approval);
  }

  resolveApproval(id: string, decision: 'approve' | 'deny'): Approval {
    return transaction(this.db, () => {
      const a = this.getApproval(id);
      if (a.state !== 'pending') throw new DomainError(ERR.alreadyResolved, `aprovação ${id} já está ${a.state}`, { id, state: a.state });
      this.log.appendInTx(a.session, 'approval.resolved', { approval: id, decision });
      return this.getApproval(id);
    });
  }

  pendingApprovals(): Approval[] {
    return this.db.prepare("SELECT * FROM proj_approvals WHERE state = 'pending' ORDER BY rowid").all() as unknown as Approval[];
  }

  // Retomada a partir do log (R5-7): execução em curso vira interrompida; efeito sem
  // recibo vira desconhecido. Aprovações pendentes continuam pendentes.
  recover(): { interrupted: number; unknown: number } {
    return transaction(this.db, () => {
      const runs = this.db.prepare("SELECT id, session FROM proj_runs WHERE state = 'running'").all() as unknown as { id: string; session: string }[];
      for (const r of runs) this.log.appendInTx(r.session, 'run.interrupted', { run: r.id });
      const effs = this.db.prepare("SELECT id, session FROM proj_effects WHERE state IN ('pending', 'attempting')").all() as unknown as { id: string; session: string }[];
      for (const e of effs) this.log.appendInTx(e.session, 'effect.unknown', { effect: e.id });
      return { interrupted: runs.length, unknown: effs.length };
    });
  }
}
