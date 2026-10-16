// Log de eventos com projeções (SPEC 0001, escopo 4; R5-1, R5-7).
// O log é a fonte de verdade, append-only, com sequência contígua por sessão.
// As projeções são derivadas, atualizadas na mesma transação e reconstruíveis do log.

import { createHash } from 'node:crypto';
import { transaction, type Database } from './db.ts';
import { DOMAIN_SCHEMA, DOMAIN_PROJECTIONS, projectDomain, validateDomainEvent } from './domain.ts';

export interface LogEvent {
  id: number;
  session: string;
  seq: number;
  kind: string;
  payload: unknown;
  ts: string;
}

export interface SessionProjection {
  id: string;
  createdTs: string;
  lastSeq: number;
  lastKind: string;
  eventCount: number;
}

interface EventRow { id: number; session: string; seq: number; kind: string; payload: string; ts: string }
interface SessionRow { id: string; created_ts: string; last_seq: number; last_kind: string; event_count: number }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts TEXT NOT NULL,
  UNIQUE (session, seq)
);
CREATE TABLE IF NOT EXISTS proj_sessions (
  id TEXT PRIMARY KEY,
  created_ts TEXT NOT NULL,
  last_seq INTEGER NOT NULL,
  last_kind TEXT NOT NULL,
  event_count INTEGER NOT NULL
);`;

export class EventLog {
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    db.exec(SCHEMA);
    db.exec(DOMAIN_SCHEMA);
  }

  append(session: string, kind: string, payload: unknown, ts = new Date().toISOString()): LogEvent {
    return transaction(this.db, () => this.appendInTx(session, kind, payload, ts));
  }

  // Igual ao append, mas dentro de uma transação já aberta (vários eventos atômicos).
  appendInTx(session: string, kind: string, payload: unknown, ts = new Date().toISOString()): LogEvent {
    const row = this.db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM events WHERE session = ?').get(session) as { next: number };
    return this.insertRaw(session, row.next, kind, payload, ts);
  }

  // Inserção crua (sem transação própria): usada pelo append e pelos testes de integridade.
  insertRaw(session: string, seq: number, kind: string, payload: unknown, ts = new Date().toISOString()): LogEvent {
    validateDomainEvent(kind, (payload ?? {}) as Record<string, unknown>);
    const body = JSON.stringify(payload ?? null);
    const res = this.db.prepare('INSERT INTO events (session, seq, kind, payload, ts) VALUES (?, ?, ?, ?, ?)').run(session, seq, kind, body, ts);
    this.project({ session, seq, kind, ts, payload });
    return { id: Number(res.lastInsertRowid), session, seq, kind, payload, ts };
  }

  private project(e: { session: string; seq: number; kind: string; ts: string; payload: unknown }): void {
    this.db.prepare(`
      INSERT INTO proj_sessions (id, created_ts, last_seq, last_kind, event_count) VALUES (?, ?, ?, ?, 1)
      ON CONFLICT (id) DO UPDATE SET last_seq = excluded.last_seq, last_kind = excluded.last_kind, event_count = event_count + 1
    `).run(e.session, e.ts, e.seq, e.kind);
    projectDomain(this.db, e.session, e.kind, (e.payload ?? {}) as Record<string, unknown>);
  }

  events(session: string): LogEvent[] {
    const rows = this.db.prepare('SELECT id, session, seq, kind, payload, ts FROM events WHERE session = ? ORDER BY seq').all(session) as unknown as EventRow[];
    return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) as unknown }));
  }

  sessions(): SessionProjection[] {
    const rows = this.db.prepare('SELECT id, created_ts, last_seq, last_kind, event_count FROM proj_sessions ORDER BY id').all() as unknown as SessionRow[];
    return rows.map((r) => ({ id: r.id, createdTs: r.created_ts, lastSeq: r.last_seq, lastKind: r.last_kind, eventCount: r.event_count }));
  }

  totalEvents(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n;
  }

  dropProjections(): void {
    for (const t of ['proj_sessions', ...DOMAIN_PROJECTIONS]) this.db.exec(`DELETE FROM ${t}`);
  }

  rebuildProjections(): void {
    transaction(this.db, () => {
      this.dropProjections();
      const rows = this.db.prepare('SELECT session, seq, kind, ts, payload FROM events ORDER BY id').all() as unknown as { session: string; seq: number; kind: string; ts: string; payload: string }[];
      for (const r of rows) this.project({ ...r, payload: JSON.parse(r.payload) as unknown });
    });
  }

  projectionHash(): string {
    const domain = DOMAIN_PROJECTIONS.map((t) => this.db.prepare(`SELECT * FROM ${t} ORDER BY id`).all());
    return createHash('sha256').update(JSON.stringify([this.sessions(), domain])).digest('hex');
  }
}
