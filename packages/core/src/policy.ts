// Motor de política do núcleo (SPEC 0001, escopo 5; ADR 0009; R3).
// Avaliação deny → ask → allow, com a negação vencendo sempre. Concessões com escopo
// (uma vez, sessão, projeto), caminhos protegidos que nada libera, ask sem terminal
// vira deny, detecção de laço e modelos que treinam com os dados negados por padrão.
// Toda decisão, regra e concessão é evento no log (auditoria).

import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve, sep, posix, basename } from 'node:path';
import { transaction, type Database } from './db.ts';
import type { EventLog } from './log.ts';

export type Tool = 'read_file' | 'list_dir' | 'write_file' | 'archive' | 'run_command' | 'model.use';
export type Effect = 'allow' | 'ask' | 'deny';
export type Scope = 'once' | 'session' | 'project';

export interface Action { session: string; tool: Tool; target: string }
export interface Decision { effect: Effect; reason: string }
export interface Rule { effect: Effect; tool: Tool; pattern: string }

// Caminhos que nenhuma regra ou concessão libera (ADR 0009; R3).
export const PROTECTED = ['.git/', '.buddy-dev/', 'archive/', '.env*', '*.pem', '*.key'];
// Modelos do OpenCode Go que treinam com os dados (ficha assinaturas-de-agentes; ADR 0014).
export const TRAINING_MODELS = ['gemini-4-argon-contributor', 'muse-spark-1.3-contributor', 'muse-spark-1.2-contributor'];
const FS_TOOLS: Tool[] = ['read_file', 'list_dir', 'write_file', 'archive'];
const LOOP_LIMIT = 3;
const RULES_SESSION = 'policy';

export const POLICY_SCHEMA = `
CREATE TABLE IF NOT EXISTS proj_rules (id TEXT PRIMARY KEY, effect TEXT NOT NULL, tool TEXT NOT NULL, pattern TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proj_grants (id TEXT PRIMARY KEY, scope TEXT NOT NULL, session TEXT NOT NULL, tool TEXT NOT NULL, pattern TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proj_loop (session TEXT PRIMARY KEY, sig TEXT NOT NULL, count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS proj_paused (session TEXT PRIMARY KEY, paused INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS proj_reads (session TEXT NOT NULL, path TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY (session, path));`;

export const POLICY_PROJECTIONS = ['proj_rules', 'proj_grants', 'proj_loop', 'proj_paused', 'proj_reads'];

const POLICY_REQUIRED: Record<string, string[]> = {
  'policy.rule.added': ['rule', 'effect', 'tool', 'pattern'],
  'policy.grant.created': ['grant', 'scope', 'tool', 'pattern'],
  'policy.grant.consumed': ['grant'],
  'policy.decision': ['tool', 'target', 'effect', 'reason'],
  'tool.called': ['sig'],
  'file.read': ['path', 'hash'],
  'file.written': ['path', 'hash'],
};

type P = Record<string, unknown>;
const s = (v: unknown): string => String(v);

export function validatePolicyEvent(kind: string, payload: P): void {
  const missing = (POLICY_REQUIRED[kind] ?? []).filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '');
  if (missing.length) throw new Error(`evento ${kind} malformado: faltam ${missing.join(', ')}`);
}

export function projectPolicy(db: Database, session: string, kind: string, payload: P): void {
  switch (kind) {
    case 'policy.rule.added':
      db.prepare('INSERT INTO proj_rules (id, effect, tool, pattern) VALUES (?, ?, ?, ?)').run(s(payload.rule), s(payload.effect), s(payload.tool), s(payload.pattern));
      break;
    case 'policy.grant.created':
      db.prepare('INSERT INTO proj_grants (id, scope, session, tool, pattern, state) VALUES (?, ?, ?, ?, ?, ?)')
        .run(s(payload.grant), s(payload.scope), session, s(payload.tool), s(payload.pattern), 'active');
      break;
    case 'policy.grant.consumed':
      db.prepare("UPDATE proj_grants SET state = 'consumed' WHERE id = ?").run(s(payload.grant));
      break;
    case 'tool.called': {
      const cur = db.prepare('SELECT sig, count FROM proj_loop WHERE session = ?').get(session) as { sig: string; count: number } | undefined;
      const count = cur && cur.sig === payload.sig ? cur.count + 1 : 1;
      db.prepare('INSERT INTO proj_loop (session, sig, count) VALUES (?, ?, ?) ON CONFLICT (session) DO UPDATE SET sig = excluded.sig, count = excluded.count').run(session, s(payload.sig), count);
      break;
    }
    case 'session.paused':
    case 'session.resumed':
      db.prepare('INSERT INTO proj_paused (session, paused) VALUES (?, ?) ON CONFLICT (session) DO UPDATE SET paused = excluded.paused').run(session, kind === 'session.paused' ? 1 : 0);
      if (kind === 'session.resumed') db.prepare('DELETE FROM proj_loop WHERE session = ?').run(session);
      break;
    case 'file.read':
    case 'file.written':
      db.prepare('INSERT INTO proj_reads (session, path, hash) VALUES (?, ?, ?) ON CONFLICT (session, path) DO UPDATE SET hash = excluded.hash').run(session, s(payload.path), s(payload.hash));
      break;
    default:
      break;
  }
}

// Glob mínimo: ** casa qualquer coisa, * casa um segmento sem barra; o resto é literal.
export function globToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? '';
    if (c === '*' && pattern[i + 1] === '*') { re += '.*'; i++; }
    else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const matches = (pattern: string, target: string): boolean => globToRegExp(pattern).test(target);

export function isProtected(rel: string): boolean {
  const segs = rel.split('/');
  const name = basename(rel);
  return segs.includes('.git') || segs.includes('.buddy-dev') || segs[0] === 'archive' || name.startsWith('.env') || name.endsWith('.pem') || name.endsWith('.key');
}

export class Policy {
  readonly log: EventLog;
  readonly workspace: string;

  constructor(log: EventLog, { workspace }: { workspace: string }) {
    this.log = log;
    this.workspace = resolve(workspace);
  }

  private get db(): Database { return this.log.db; }

  // Caminho relativo ao workspace, em formato posix; null se estiver fora.
  relative(target: string): string | null {
    const rel = relative(this.workspace, resolve(this.workspace, target));
    if (rel.startsWith('..') || isAbsolute(rel)) return null;
    return rel.split(sep).join(posix.sep);
  }

  addRule(rule: Rule): void {
    this.log.append(RULES_SESSION, 'policy.rule.added', { rule: `rule-${randomUUID().slice(0, 8)}`, ...rule });
  }

  grant(scope: Scope, { tool, pattern }: { tool: Tool; pattern: string }, { session }: { session: string }): string {
    const grant = `gr-${randomUUID().slice(0, 8)}`;
    this.log.append(session, 'policy.grant.created', { grant, scope, tool, pattern });
    return grant;
  }

  observeCall(session: string, call: { tool: string; target: string }): { paused: boolean } {
    return transaction(this.db, () => {
      this.log.appendInTx(session, 'tool.called', { sig: `${call.tool} ${call.target}`, tool: call.tool, target: call.target });
      const cur = this.db.prepare('SELECT count FROM proj_loop WHERE session = ?').get(session) as { count: number };
      if (cur.count >= LOOP_LIMIT && !this.isPaused(session)) this.log.appendInTx(session, 'session.paused', { reason: 'loop', limit: LOOP_LIMIT });
      return { paused: this.isPaused(session) };
    });
  }

  resume(session: string): void {
    this.log.append(session, 'session.resumed', {});
  }

  isPaused(session: string): boolean {
    return (this.db.prepare('SELECT paused FROM proj_paused WHERE session = ?').get(session) as { paused: number } | undefined)?.paused === 1;
  }

  private base(a: Action, target: string): { effect: Effect; scopes: Scope[]; rulesApply: boolean } {
    switch (a.tool) {
      case 'read_file':
      case 'list_dir':
        return { effect: 'allow', scopes: [], rulesApply: true };
      case 'write_file':
      case 'archive':
        return { effect: 'ask', scopes: ['once', 'session', 'project'], rulesApply: true };
      case 'run_command':
        // Até o M2 (sandbox), comando só com aprovação explícita de uma vez (ADR 0009).
        return { effect: 'ask', scopes: ['once'], rulesApply: false };
      case 'model.use':
        return TRAINING_MODELS.includes(target)
          ? { effect: 'ask', scopes: ['project'], rulesApply: false }
          : { effect: 'allow', scopes: [], rulesApply: true };
      default:
        return { effect: 'deny', scopes: [], rulesApply: false };
    }
  }

  decide(a: Action, { interactive }: { interactive: boolean }): Decision {
    return transaction(this.db, () => {
      const d = this.evaluate(a, interactive);
      this.log.appendInTx(a.session, 'policy.decision', { tool: a.tool, target: a.target, effect: d.effect, reason: d.reason });
      return d;
    });
  }

  private evaluate(a: Action, interactive: boolean): Decision {
    if (this.isPaused(a.session)) return { effect: 'deny', reason: 'sessionPaused' };
    let target = a.target;
    if (FS_TOOLS.includes(a.tool)) {
      const rel = this.relative(a.target);
      if (rel === null) return { effect: 'deny', reason: 'fora do workspace' };
      if (isProtected(rel)) return { effect: 'deny', reason: 'caminho protegido' };
      target = rel;
    }
    const base = this.base(a, target);
    const rules = base.rulesApply
      ? (this.db.prepare('SELECT effect, pattern FROM proj_rules WHERE tool = ?').all(a.tool) as unknown as { effect: Effect; pattern: string }[]).filter((r) => matches(r.pattern, target))
      : [];
    if (rules.some((r) => r.effect === 'deny') || base.effect === 'deny') return { effect: 'deny', reason: 'regra' };
    if (base.effect === 'allow') return { effect: 'allow', reason: 'padrão' };
    if (rules.some((r) => r.effect === 'allow')) return { effect: 'allow', reason: 'regra' };

    const grants = (this.db.prepare("SELECT id, scope, session, pattern FROM proj_grants WHERE tool = ? AND state = 'active' ORDER BY rowid").all(a.tool) as unknown as { id: string; scope: Scope; session: string; pattern: string }[])
      .filter((g) => base.scopes.includes(g.scope) && matches(g.pattern, target) && (g.scope === 'project' || g.session === a.session));
    const g = grants.find((x) => x.scope === 'project') ?? grants.find((x) => x.scope === 'session') ?? grants.find((x) => x.scope === 'once');
    if (g) {
      if (g.scope === 'once') this.log.appendInTx(a.session, 'policy.grant.consumed', { grant: g.id });
      return { effect: 'allow', reason: `concessão ${g.scope}` };
    }
    if (a.tool === 'model.use') return { effect: 'deny', reason: 'modelo treina com os dados: exige concessão de projeto' };
    if (!interactive) return { effect: 'deny', reason: 'nonInteractive' };
    return { effect: 'ask', reason: 'aprovação humana' };
  }
}
