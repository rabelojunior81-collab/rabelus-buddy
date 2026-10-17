// Claim antes de editar documento vivo (AGENTS §2 e §3). Até 2026-10-17 a regra não tinha mecanismo,
// e uma sessão inteira editou plano, SPEC e STATUS sem nenhum claim no ledger.
// Reprova: documento vivo alterado na branch (commit ou árvore) sem claim registrado no ledger da branch.
// Avisa: claim registrado depois da primeira edição (fica declarado, não escondido).
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tryGit } from './git.mjs';

const LIVING = [
  /^\.buddy-dev\/(STATUS|MEMORY)\.md$/,
  /^docs\/50-planos\/.+\/PLANO\.md$/,
  /^docs\/40-specs\/[^/]+\/(SPEC|TESTES)\.md$/,
  /^docs\/30-governanca\/validacoes\.json$/,
  /^AGENTS\.md$/,
  /^README(\.en)?\.md$/,
  /^CHANGELOG\.md$/,
  /^docs\/ROADMAP[^/]*\.md$/,
];
export const isLiving = (f) => LIVING.some((re) => re.test(f));

const lines = (s) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

export function checkClaims(root, { base = 'origin/main' } = {}) {
  const committed = lines(tryGit(root, 'diff', '--name-only', `${base}...HEAD`));
  // Sem trim (o git() do projeto corta a saída): as duas primeiras colunas do porcelain são o estado (' M', '??').
  let porcelain = '';
  try { porcelain = execFileSync('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }); } catch { /* fora de um repositório */ }
  const tree = porcelain.split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''));
  const changed = [...new Set([...committed, ...tree])];

  // Claims do ledger trazidos pela branch (commitados ou ainda na árvore).
  const claims = new Map();
  for (const f of changed.filter((x) => /^\.buddy-dev\/bus\/ledger\/.+-claim\.json$/.test(x))) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    try {
      const e = JSON.parse(readFileSync(p, 'utf8'));
      if (e.type !== 'claim' || !e.summary) continue;
      const prev = claims.get(e.summary);
      if (!prev || Date.parse(e.utc ?? e.ts) < Date.parse(prev.utc ?? prev.ts)) claims.set(e.summary, e);
    } catch { /* entrada ilegível não vale como claim */ }
  }

  const problems = [];
  const late = [];
  for (const f of changed.filter(isLiving).sort()) {
    const c = claims.get(f);
    if (!c) { problems.push(`${f} alterado sem bd claim nesta branch`); continue; }
    // Primeira edição commitada na branch; edição só na árvore é posterior ao claim por definição.
    const first = lines(tryGit(root, 'log', '--reverse', '--format=%cI', `${base}..HEAD`, '--', f))[0];
    if (first && Date.parse(first) < Date.parse(c.utc ?? c.ts)) late.push(`${f}: claim às ${c.ts}, depois da primeira edição (${first})`);
  }
  return { problems, late };
}
