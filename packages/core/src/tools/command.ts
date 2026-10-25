// Ferramenta de comando do agente (SPEC 0001, escopo 6; ADR 0009).
// Nenhum comando roda sem aprovação explícita. Desde o M2.1 (SPEC 0003; ADR 0019), o comando aprovado roda contido
// pelo sistema quando a contenção está confirmada; sem ela, roda como antes, e o log diz por quê.

import { spawnSync } from 'node:child_process';
import type { Policy } from '../policy.ts';
import { profileFor, type Containment } from '../sandbox/index.ts';

export interface ExecResult { code: number; stdout: string; stderr: string }
export type Exec = (command: string, cwd: string) => ExecResult | Promise<ExecResult>;

const defaultExec: Exec = (command, cwd) => {
  // windowsHide: o núcleo roda desligado do console; sem isso, cada comando abriria uma janela no Windows.
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout: 120_000, windowsHide: true });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};

export class CommandTool {
  readonly policy: Policy;
  readonly workspace: string;
  private readonly exec: Exec;
  private readonly containment: Containment | undefined;

  constructor(policy: Policy, { workspace, exec = defaultExec, containment }: { workspace: string; exec?: Exec; containment?: Containment }) {
    this.policy = policy;
    this.workspace = workspace;
    this.exec = exec;
    this.containment = containment;
  }

  // O resultado diz se rodou contido: o modelo precisa saber que um "acesso negado" veio da contenção.
  async run(session: string, command: string, ctx: { interactive: boolean; observe?: boolean }): Promise<{ ok: true; result: ExecResult & { contained: boolean } } | { ok: false; reason: string }> {
    if (ctx.observe !== false) this.policy.observeCall(session, { tool: 'run_command', target: command });
    const d = this.policy.decide({ session, tool: 'run_command', target: command }, ctx);
    if (d.effect !== 'allow') return { ok: false, reason: d.effect === 'ask' ? 'needsApproval' : d.reason };
    const st = this.containment ? await this.containment.status() : { ok: false, reason: 'sem contenção configurada' };
    const result = st.ok
      ? await this.containment!.run(command, this.workspace, profileFor(this.workspace))
      : await this.exec(command, this.workspace);
    this.policy.log.append(session, 'command.ran', { command, code: result.code, contained: st.ok, ...(st.ok ? { containment: st.level } : { reason: st.reason }) });
    return { ok: true, result: { ...result, contained: st.ok } };
  }
}
