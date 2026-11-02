// Rotinas agendadas do GitHub (`schedule`): a última execução de cada workflow, para o início da sessão (bd pre).
// Achado de 2026-11-02: a CI semanal falhou em 26/10 e ninguém viu por uma semana.
import { execFileSync } from 'node:child_process';

// Puro: das execuções (mais novas primeiro ou não), a última agendada de cada workflow, com o veredito.
export function scheduledVerdicts(runs) {
  const last = new Map();
  for (const r of runs.filter((x) => x.event === 'schedule')) {
    const cur = last.get(r.workflowName);
    if (!cur || r.createdAt > cur.createdAt) last.set(r.workflowName, r);
  }
  return [...last.values()].sort((a, b) => a.workflowName.localeCompare(b.workflowName)).map((r) => {
    const quando = r.createdAt.slice(0, 10);
    if (r.status !== 'completed') return { workflow: r.workflowName, ok: true, text: `rotina ${r.workflowName} rodando (${quando})` };
    const ok = r.conclusion === 'success';
    return { workflow: r.workflowName, ok, text: ok ? `rotina ${r.workflowName} passou em ${quando}` : `rotina ${r.workflowName} falhou em ${quando} (${r.conclusion}): veja gh run list --workflow "${r.workflowName}"` };
  });
}

// Lê as últimas execuções pelo gh; sem gh ou sem rede, devolve null (o bd pre diz que não conferiu).
export function scheduledRuns(root) {
  try {
    const out = execFileSync('gh', ['run', 'list', '--limit', '40', '--json', 'workflowName,event,status,conclusion,createdAt'], { cwd: root, encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out);
  } catch { return null; }
}
