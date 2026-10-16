// Prune de branches e merge governado.
//
// Ordem do Pai em 2026-10-16: o prune de branches é responsabilidade do buddy-dev,
// sempre, com verificação e enforcement; nenhuma branch sobrevive ao merge, e nada
// se perde (ADR 0004). Regras:
// - mergeada na main → removida (local e remota);
// - com PR aberto, atual, ou com trabalho recente → mantida;
// - não mergeada, sem PR, parada há mais de STALE_DAYS (ou arquivo pedido) → tag
//   anotada archive/<branch>-<carimbo> (a lápide, que preserva os commits) e remoção.

import { tryGit, git } from './git.mjs';

export const STALE_DAYS = 14;
const DAY = 86_400_000;

function refs(root, pattern) {
  const out = tryGit(root, 'for-each-ref', '--format=%(refname:short)|%(objectname)|%(committerdate:iso-strict)', pattern) ?? '';
  return out.split('\n').filter(Boolean).map((l) => { const [ref, sha, date] = l.split('|'); return { ref, sha, date }; });
}

export function classifyBranches(root, { now = new Date(), openPrHeads = new Set(), archive = new Set(), main = 'main', remote = 'origin' } = {}) {
  const current = tryGit(root, 'branch', '--show-current');
  const mainRef = tryGit(root, 'rev-parse', '--verify', '-q', `${remote}/${main}`) ? `${remote}/${main}` : main;
  const byName = new Map();
  for (const r of refs(root, 'refs/heads')) {
    if (r.ref === main) continue;
    byName.set(r.ref, { name: r.ref, local: r.sha, remote: null, date: r.date });
  }
  for (const r of refs(root, `refs/remotes/${remote}`)) {
    const name = r.ref.slice(remote.length + 1);
    if (name === main || name === 'HEAD' || r.ref === remote) continue;
    const b = byName.get(name) ?? { name, local: null, remote: null, date: r.date };
    b.remote = r.sha;
    if (!b.date || r.date > b.date) b.date = r.date;
    byName.set(name, b);
  }
  const merged = (sha) => sha && tryGit(root, 'merge-base', '--is-ancestor', sha, mainRef) !== null;
  return [...byName.values()].map((b) => {
    const isMerged = [b.local, b.remote].filter(Boolean).every(merged);
    const ageDays = Math.floor((now.getTime() - new Date(b.date).getTime()) / DAY);
    let action = 'manter';
    let reason;
    if (b.name === current) reason = 'branch atual';
    else if (isMerged) { action = 'remover'; reason = `mergeada em ${mainRef}`; }
    else if (openPrHeads.has(b.name)) reason = 'PR aberto';
    else if (archive.has(b.name)) { action = 'arquivar'; reason = 'arquivo pedido'; }
    else if (ageDays > STALE_DAYS) { action = 'arquivar'; reason = `sem PR e parada há ${ageDays} dias`; }
    else reason = `trabalho em andamento (${ageDays} dia(s), sem PR)`;
    return { ...b, merged: isMerged, ageDays, action, reason };
  });
}

export function pruneBranches(root, list, { stamp, reason = 'prune', remote = 'origin', dryRun = false } = {}) {
  const report = { removed: [], archived: [], kept: list.filter((b) => b.action === 'manter').map((b) => b.name) };
  for (const b of list.filter((x) => x.action !== 'manter')) {
    if (b.action === 'arquivar') {
      const sha = b.remote ?? b.local;
      const tag = `archive/${b.name}-${stamp}`;
      if (!dryRun) {
        git(root, '-c', 'user.name=buddy-dev', '-c', 'user.email=buddy-dev@rabelus.lab', 'tag', '-a', tag, sha, '-m', `Lápide da branch ${b.name}: ${b.reason}. ${reason}`);
        git(root, 'push', '-q', remote, `refs/tags/${tag}`);
      }
      report.archived.push({ name: b.name, tag, sha });
    } else report.removed.push(b.name);
    if (dryRun) continue;
    if (b.remote) tryGit(root, 'push', '-q', remote, '--delete', b.name);
    if (b.local) git(root, 'branch', '-D', b.name);
  }
  if (!dryRun) tryGit(root, 'fetch', '-q', '--prune', remote);
  return report;
}

// Pronto para mergear? (JSON de `gh pr view --json state,mergeable,mergeStateStatus,statusCheckRollup`)
export function mergeReadiness(pr) {
  const problems = [];
  if (pr.state !== 'OPEN') problems.push(`o PR não está aberto (${pr.state})`);
  if (pr.mergeable === 'CONFLICTING') problems.push('o PR tem conflito com a base');
  else if (pr.mergeable !== 'MERGEABLE') problems.push(`mergeabilidade ainda não calculada (${pr.mergeable})`);
  const checks = pr.statusCheckRollup ?? [];
  if (!checks.length) problems.push('nenhuma checagem de CI no PR');
  else if (!checks.every((c) => (c.conclusion ?? c.state) === 'SUCCESS')) problems.push('checagens de CI não estão todas verdes');
  return problems;
}
