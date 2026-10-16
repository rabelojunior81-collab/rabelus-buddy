// Ferramenta de comando do agente (SPEC 0001, escopo 6; ADR 0009).
// Até o M2 (sandbox), nenhum comando roda sem aprovação explícita de uma vez.

import { spawnSync } from 'node:child_process';
import type { Policy } from '../policy.ts';

export interface ExecResult { code: number; stdout: string; stderr: string }
export type Exec = (command: string, cwd: string) => ExecResult;

const defaultExec: Exec = (command, cwd) => {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout: 120_000 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};

export class CommandTool {
  readonly policy: Policy;
  readonly workspace: string;
  private readonly exec: Exec;

  constructor(policy: Policy, { workspace, exec = defaultExec }: { workspace: string; exec?: Exec }) {
    this.policy = policy;
    this.workspace = workspace;
    this.exec = exec;
  }

  run(session: string, command: string, ctx: { interactive: boolean }): { ok: true; result: ExecResult } | { ok: false; reason: string } {
    this.policy.observeCall(session, { tool: 'run_command', target: command });
    const d = this.policy.decide({ session, tool: 'run_command', target: command }, ctx);
    if (d.effect !== 'allow') return { ok: false, reason: d.effect === 'ask' ? 'needsApproval' : d.reason };
    const result = this.exec(command, this.workspace);
    this.policy.log.append(session, 'command.ran', { command, code: result.code });
    return { ok: true, result };
  }
}
