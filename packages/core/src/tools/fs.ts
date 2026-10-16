// Ferramentas de arquivo do agente (SPEC 0001, escopo 6; R5-3, R5-8).
// Leitura registra o hash; escrita só passa com a política e com compare-and-set:
// se o arquivo mudou desde a última leitura (humano mexeu), a escrita é recusada.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Policy } from '../policy.ts';

const hash = (content: string): string => createHash('sha256').update(content).digest('hex');

export type ToolResult<T> = ({ ok: true } & T) | { ok: false; reason: string };

export class FsTools {
  readonly policy: Policy;
  readonly workspace: string;

  constructor(policy: Policy, { workspace }: { workspace: string }) {
    this.policy = policy;
    this.workspace = resolve(workspace);
  }

  private gate(session: string, tool: 'read_file' | 'write_file' | 'list_dir', target: string, ctx: { interactive: boolean }): string | null {
    this.policy.observeCall(session, { tool, target });
    const d = this.policy.decide({ session, tool, target }, ctx);
    return d.effect === 'allow' ? null : d.effect === 'ask' ? 'needsApproval' : d.reason;
  }

  readFile(session: string, target: string, ctx: { interactive: boolean }): { ok: boolean; content?: string; reason?: string } {
    const denied = this.gate(session, 'read_file', target, ctx);
    if (denied) return { ok: false, reason: denied };
    const abs = resolve(this.workspace, target);
    const content = readFileSync(abs, 'utf8');
    this.policy.log.append(session, 'file.read', { path: this.policy.relative(target), hash: hash(content) });
    return { ok: true, content };
  }

  listDir(session: string, target: string, ctx: { interactive: boolean }): ToolResult<{ entries: string[] }> {
    const denied = this.gate(session, 'list_dir', target, ctx);
    if (denied) return { ok: false, reason: denied };
    return { ok: true, entries: readdirSync(resolve(this.workspace, target)) };
  }

  writeFile(session: string, target: string, content: string, ctx: { interactive: boolean }): ToolResult<{ hash: string }> {
    const denied = this.gate(session, 'write_file', target, ctx);
    if (denied) return { ok: false, reason: denied };
    const abs = resolve(this.workspace, target);
    const rel = this.policy.relative(target) ?? target;
    if (existsSync(abs)) {
      const last = this.policy.log.db.prepare('SELECT hash FROM proj_reads WHERE session = ? AND path = ?').get(session, rel) as { hash: string } | undefined;
      if (!last) return { ok: false, reason: 'file.notReadBeforeWrite' };
      if (hash(readFileSync(abs, 'utf8')) !== last.hash) return { ok: false, reason: 'file.changedSinceRead' };
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    const h = hash(content);
    this.policy.log.append(session, 'file.written', { path: rel, hash: h });
    return { ok: true, hash: h };
  }
}
