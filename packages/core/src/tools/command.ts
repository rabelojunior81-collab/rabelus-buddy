// Ferramenta de comando do agente (SPEC 0001, escopo 6; ADR 0009).
// Nenhum comando roda sem aprovação explícita. Desde o M2.1 (SPEC 0003; ADR 0019), o comando aprovado roda contido
// pelo sistema quando a contenção está confirmada; sem ela, roda como antes, e o log diz por quê.

import { spawnSync } from 'node:child_process';
import { localCommand, type Policy } from '../policy.ts';
import { netProxy, profileFor, type Containment } from '../sandbox/index.ts';

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
  // askNetwork (M2.3): o cartão "rede" para um destino que a política manda perguntar; sem ele, o destino novo é negado.
  async run(session: string, command: string, ctx: { interactive: boolean; observe?: boolean; askNetwork?: (host: string) => Promise<boolean> }): Promise<{ ok: true; result: ExecResult & { contained: boolean } } | { ok: false; reason: string }> {
    if (ctx.observe !== false) this.policy.observeCall(session, { tool: 'run_command', target: command });
    const st = this.containment ? await this.containment.status() : { ok: false, reason: 'sem contenção configurada' };
    const d = this.policy.decide({ session, tool: 'run_command', target: command, contained: st.ok }, ctx);
    if (d.effect !== 'allow') return { ok: false, reason: d.effect === 'ask' ? 'needsApproval' : d.reason };
    let result: ExecResult;
    let profile: ReturnType<typeof profileFor> | undefined;
    if (st.ok) {
      profile = profileFor(this.workspace);
      // Rede sob demanda (M2.4): comando só de leitura e local roda sem ligar a rede (cerca de 270 ms a menos no Windows).
      if (localCommand(command)) result = await this.containment!.run(command, this.workspace, profile);
      else {
        // A rede do comando contido só sai pelo proxy; cada destino passa pela política e fica no log.
        const px = await netProxy(async (host, port) => {
          const nd = this.policy.decide({ session, tool: 'network', target: host }, ctx);
          const allowed = nd.effect === 'allow' || (nd.effect === 'ask' && ctx.askNetwork ? await ctx.askNetwork(host) : false);
          this.policy.log.append(session, 'network.request', { host, port, allowed, reason: nd.effect === 'ask' ? (allowed ? 'aprovação humana' : 'negado') : nd.reason });
          return allowed;
        });
        try { result = await this.containment!.run(command, this.workspace, profile, { proxyUrl: px.url }); }
        finally { await px.close(); }
      }
    } else result = await this.exec(command, this.workspace);
    this.policy.log.append(session, 'command.ran', { command, code: result.code, contained: st.ok, ...(st.ok ? { containment: st.level, profile: { readwrite: profile!.readwrite, readonly: profile!.readonly, denied: profile!.denied.length } } : { reason: st.reason }) });
    return { ok: true, result: { ...result, contained: st.ok } };
  }
}
