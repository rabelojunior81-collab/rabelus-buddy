// Orçamento atômico por janela (SPEC 0001, escopo 9; R5-6; ADRs 0008, 0014, 0015).
// Antes de cada chamada, reserva-se a estimativa em todas as janelas do provedor/modelo;
// depois, liquida-se pelo usage real (ou libera-se, se a chamada não consumiu nada).
// O dono é o único escritor e as transações são síncronas: duas reservas nunca
// passam juntas por cima do mesmo saldo. Janelas são móveis (últimas N horas).
// Um erro de limite do provedor esgota a janela até o horário informado.

import { randomUUID } from 'node:crypto';
import { transaction, type Database } from './db.ts';
import { DomainError } from './domain.ts';
import type { EventLog } from './log.ts';
import { PRICES, type Price } from './prices.ts';

export interface WindowDef { id: string; provider: string; model: string | null; capacity: number | null; periodHours: number }
export interface Usage { input_tokens: number; cached_tokens: number; cache_write_tokens: number; output_tokens: number }
export interface WindowStatus extends WindowDef { used: number; exhaustedUntil: string | null }

export const BUDGET_ERROR = -32005;

export class BudgetError extends DomainError {
  readonly reason: 'capReached' | 'windowExhausted';
  constructor(reason: 'capReached' | 'windowExhausted', window: string, message: string) {
    super(BUDGET_ERROR, message, { reason, window });
    this.reason = reason;
  }
}

// Limites mensais por modelo no OpenCode Go (ficha assinaturas-de-agentes, 2026-10-15).
const GO_MONTHLY: Record<string, number> = {
  'gpt-6-luna': 15, 'gpt-5.6-luna': 15, 'claude-haiku-5-5': 15, 'kimi-k3': 15, 'glm-5.3': 15,
  'qwen3.8-max': 15, 'deepseek-v4.1-flash': 80, 'minimax-m3': 60,
};

export function defaultWindows(): WindowDef[] {
  const go = Object.entries(GO_MONTHLY).flatMap(([model, month]) => [
    { id: `go/${model}/5h`, provider: 'opencode-go', model, capacity: month * 0.2, periodHours: 5 },
    { id: `go/${model}/semana`, provider: 'opencode-go', model, capacity: month * 0.5, periodHours: 168 },
    { id: `go/${model}/mes`, provider: 'opencode-go', model, capacity: month, periodHours: 720 },
  ]);
  return [
    ...go,
    // Teto semanal do Sign in with ChatGPT: definido pelo usuário e só informado pelo provedor.
    { id: 'chatgpt/semana', provider: 'chatgpt', model: null, capacity: null, periodHours: 168 },
    // API paga: OpenRouter, teto do Pai (SPEC 0001; ADR 0015).
    { id: 'openrouter/mes', provider: 'openrouter', model: null, capacity: 20, periodHours: 720 },
  ];
}

// Custo pelo usage da Responses API (ficha bibliotecas-do-nucleo): o raciocínio já está em output_tokens.
export function costOf(u: Usage, p: Price): number {
  const plain = Math.max(0, u.input_tokens - u.cached_tokens - u.cache_write_tokens);
  return (plain * p.input + u.cached_tokens * p.cachedInput + u.cache_write_tokens * p.cacheWrite + u.output_tokens * p.output) / 1e6;
}

export const BUDGET_SCHEMA = `
CREATE TABLE IF NOT EXISTS proj_reservations (id TEXT PRIMARY KEY, session TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, windows TEXT NOT NULL, amount REAL NOT NULL, state TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS proj_exhausted (provider TEXT NOT NULL, model TEXT NOT NULL, until INTEGER NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (provider, model));`;
export const BUDGET_PROJECTIONS = ['proj_reservations', 'proj_exhausted'];

const REQUIRED: Record<string, string[]> = {
  'budget.reserved': ['reservation', 'provider', 'model', 'windows', 'estimate'],
  'budget.settled': ['reservation', 'actual'],
  'budget.released': ['reservation'],
  'budget.exhausted': ['provider', 'until'],
};

type P = Record<string, unknown>;

export function validateBudgetEvent(kind: string, payload: P): void {
  const missing = (REQUIRED[kind] ?? []).filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '');
  if (missing.length) throw new Error(`evento ${kind} malformado: faltam ${missing.join(', ')}`);
}

export function projectBudget(db: Database, session: string, kind: string, payload: P, ts: string): void {
  switch (kind) {
    case 'budget.reserved':
      db.prepare('INSERT INTO proj_reservations (id, session, provider, model, windows, amount, state, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(String(payload.reservation), session, String(payload.provider), String(payload.model), JSON.stringify(payload.windows), Number(payload.estimate), 'reserved', Date.parse(ts));
      break;
    case 'budget.settled':
      db.prepare("UPDATE proj_reservations SET amount = ?, state = 'settled' WHERE id = ?").run(Number(payload.actual), String(payload.reservation));
      break;
    case 'budget.released':
      db.prepare("UPDATE proj_reservations SET amount = 0, state = 'released' WHERE id = ?").run(String(payload.reservation));
      break;
    case 'budget.exhausted':
      db.prepare('INSERT INTO proj_exhausted (provider, model, until, reason) VALUES (?, ?, ?, ?) ON CONFLICT (provider, model) DO UPDATE SET until = excluded.until, reason = excluded.reason')
        .run(String(payload.provider), String(payload.model ?? '*'), Number(payload.until), String(payload.reason ?? ''));
      break;
    default:
      break;
  }
}

export class Budget {
  readonly log: EventLog;
  readonly windows: WindowDef[];
  private readonly now: () => number;

  constructor(log: EventLog, { windows = defaultWindows(), now = () => Date.now() }: { windows?: WindowDef[]; now?: () => number } = {}) {
    this.log = log;
    this.windows = windows;
    this.now = now;
  }

  private get db(): Database { return this.log.db; }
  private ts(): string { return new Date(this.now()).toISOString(); }

  private applicable(provider: string, model: string): WindowDef[] {
    return this.windows.filter((w) => w.provider === provider && (w.model === null || w.model === model));
  }

  used(windowId: string): number {
    const w = this.windows.find((x) => x.id === windowId);
    if (!w) return 0;
    const since = this.now() - w.periodHours * 3_600_000;
    const rows = this.db.prepare("SELECT windows, amount FROM proj_reservations WHERE state != 'released' AND ts >= ?").all(since) as unknown as { windows: string; amount: number }[];
    return rows.filter((r) => (JSON.parse(r.windows) as string[]).includes(windowId)).reduce((a, r) => a + r.amount, 0);
  }

  private exhaustedUntil(provider: string, model: string): number | null {
    const row = this.db.prepare("SELECT MAX(until) AS until FROM proj_exhausted WHERE provider = ? AND (model = ? OR model = '*')").get(provider, model) as { until: number | null };
    return row.until !== null && row.until > this.now() ? row.until : null;
  }

  reserve(session: string, { provider, model, estimateUsd }: { provider: string; model: string; estimateUsd: number }): string {
    return transaction(this.db, () => {
      const wins = this.applicable(provider, model);
      const until = this.exhaustedUntil(provider, model);
      if (until !== null) throw new BudgetError('windowExhausted', `${provider}/${model}`, `janela de ${provider}/${model} esgotada até ${new Date(until).toISOString()}`);
      for (const w of wins) {
        if (w.capacity === null) continue;
        if (this.used(w.id) + estimateUsd > w.capacity + 1e-9) throw new BudgetError('capReached', w.id, `janela ${w.id} sem saldo para US$ ${estimateUsd.toFixed(4)}`);
      }
      const reservation = `res-${randomUUID().slice(0, 8)}`;
      this.log.appendInTx(session, 'budget.reserved', { reservation, provider, model, windows: wins.map((w) => w.id), estimate: estimateUsd }, this.ts());
      return reservation;
    });
  }

  private reservation(id: string): { session: string; model: string; amount: number; state: string } {
    const r = this.db.prepare('SELECT session, model, amount, state FROM proj_reservations WHERE id = ?').get(id) as { session: string; model: string; amount: number; state: string } | undefined;
    if (!r) throw new DomainError(-32003, `reserva ${id} não existe`, { id });
    if (r.state !== 'reserved') throw new DomainError(-32004, `reserva ${id} já está ${r.state}`, { id, state: r.state });
    return r;
  }

  // Liquida pelo usage real. Sem preço conhecido para o modelo (e sem valor informado), vale a estimativa.
  settle(id: string, usage: Usage | null, actualUsd?: number): number {
    return transaction(this.db, () => {
      const r = this.reservation(id);
      const price = PRICES[r.model];
      const actual = actualUsd ?? (usage && price ? costOf(usage, price) : r.amount);
      this.log.appendInTx(r.session, 'budget.settled', { reservation: id, actual, usage }, this.ts());
      return actual;
    });
  }

  release(id: string, reason: string): void {
    transaction(this.db, () => {
      const r = this.reservation(id);
      this.log.appendInTx(r.session, 'budget.released', { reservation: id, reason }, this.ts());
    });
  }

  markExhausted(provider: string, model: string | null, until: number, reason: string): void {
    this.log.append('budget', 'budget.exhausted', { provider, model: model ?? '*', until, reason }, this.ts());
  }

  status(): WindowStatus[] {
    return this.windows.map((w) => {
      const until = this.exhaustedUntil(w.provider, w.model ?? '*');
      return { ...w, used: this.used(w.id), exhaustedUntil: until === null ? null : new Date(until).toISOString() };
    });
  }
}
