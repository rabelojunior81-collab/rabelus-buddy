// Autoverificação (regra do Pai, 2026-10-18: "fundacional"): o que eu faço entra no barramento no momento do fato,
// e o código vai para commit e push a cada passo. Origem: a auditoria achou 53 commits de código sem nenhum
// registro substantivo em 14 sessões (15 a 18/10). Usado pelo bd post, pela CI e pelo gancho Stop do Claude Code.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tryGit } from './git.mjs';
import { surfaceGaps } from './surfaces.mjs';
import { checkPath } from './names.mjs';
import { findOrphans } from './orfaos.mjs';
import { checkClaims } from './claims.mjs';

export const SUBSTANTIVE = new Set(['decisao', 'pesquisa', 'erro', 'aprendizado', 'correcao', 'feat', 'ferramenta', 'processo', 'doc']);
const CODE = /^(packages|scripts|\.github|locales)\/|^package(-lock)?\.json$/;
const WINDOW_AFTER = 2 * 60_000; // o registro pode vir logo depois do commit do mesmo passo
const FIRST_BEFORE = 2 * 3_600_000; // para o primeiro commit de código da branch

function events(root) {
  const dir = join(root, '.buddy-dev/bus/ledger');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; } })
    .filter((e) => e && SUBSTANTIVE.has(e.type)).map((e) => ({ ...e, t: Date.parse(e.utc ?? e.ts) }));
}

function branchCommits(root, base) {
  const out = tryGit(root, 'log', `${base}..HEAD`, '--no-merges', '--reverse', '--abbrev=7', '--format=@%h|%cI|%s', '--name-only') ?? '';
  const list = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) { const [hash, iso, ...s] = line.slice(1).split('|'); list.push({ hash, t: Date.parse(iso), subject: s.join('|'), files: [] }); }
    else if (line.trim() && list.length) list.at(-1).files.push(line.trim());
  }
  return list;
}

// Commits de código da branch sem registro substantivo entre o commit de código anterior e ele (ou sem registro
// atrasado que cite o hash).
export function unrecordedCommits(root, { base = 'origin/main' } = {}) {
  const ev = events(root);
  const miss = [];
  let prev = null;
  for (const c of branchCommits(root, base).filter((x) => x.files.some((f) => CODE.test(f)))) {
    const from = prev ?? c.t - FIRST_BEFORE;
    const ok = ev.some((e) => (e.t > from && e.t <= c.t + WINDOW_AFTER) || `${e.summary ?? ''} ${(e.refs ?? []).join(' ')}`.includes(c.hash));
    if (!ok) miss.push({ hash: c.hash, subject: c.subject, when: new Date(c.t).toISOString() });
    prev = c.t;
  }
  return miss;
}

export function selfCheck(root, { base = 'origin/main', now = new Date(), session = null } = {}) {
  const block = [];
  const warn = [];
  for (const m of unrecordedCommits(root, { base })) block.push(`commit de código sem registro no barramento: ${m.hash} ${m.subject.slice(0, 90)}`);
  // A saída do git chega aparada: a primeira linha perde o espaço do código de estado. Tira o código pelo padrão.
  const dirty = (tryGit(root, 'status', '--porcelain') ?? '').split('\n').filter(Boolean).map((l) => l.replace(/^\s*\S{1,2}\s+/, '')).filter((f) => !f.startsWith('.buddy-dev/bus/ledger/'));
  if (dirty.length) block.push(`${dirty.length} arquivo(s) alterado(s) sem commit: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? '…' : ''}`);
  const branch = tryGit(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  const ahead = tryGit(root, 'rev-list', '--count', '@{u}..HEAD');
  if (ahead === null) {
    if (branch && branch !== 'main' && Number(tryGit(root, 'rev-list', '--count', `${base}..HEAD`) ?? 0) > 0) block.push(`branch ${branch} sem upstream: commits sem push`);
  } else if (Number(ahead) > 0) block.push(`${ahead} commit(s) sem push`);
  if (session) {
    const mine = events(root).filter((e) => e.session === session).map((e) => e.t);
    const last = mine.length ? Math.max(...mine) : null;
    const min = last === null ? null : Math.floor((now.getTime() - last) / 60_000);
    if (min !== null && min > 30) warn.push(`${min} min sem registro substantivo na sessão ${session}: registre decisão, pesquisa, erro ou aprendizado no momento do fato`);
  }
  return { block, warn };
}

// Antes de cada commit (gancho .githooks/pre-commit): as checagens rápidas. Achado de 2026-10-18: commitei com o
// bd surfaces reprovando, porque a checagem e o commit iam no mesmo comando.
export function preCommitProblems(root, { base = 'origin/main' } = {}) {
  const out = [];
  out.push(...surfaceGaps(root, { base }).map((g) => `superfícies: ${g}`));
  out.push(...(tryGit(root, 'ls-files') ?? '').split('\n').filter(Boolean).flatMap(checkPath).map((p) => `nome: ${p}`));
  out.push(...findOrphans(root).map((p) => `órfão ou quebrado: ${p}`));
  out.push(...checkClaims(root, { base }).problems.map((p) => `claim: ${p}`));
  return out;
}

// O worktree usa os ganchos versionados do repositório (garantido pelo bd pre).
export function ensureHooksPath(root) {
  if ((tryGit(root, 'config', 'core.hooksPath') ?? '') === '.githooks') return false;
  tryGit(root, 'config', 'core.hooksPath', '.githooks');
  return true;
}

// Gancho Stop: com pendência, barra o fim da resposta e diz o porquê; já continuando por ele, só avisa (sem laço).
export function hookDecision(check, input = {}) {
  const lines = [...check.block, ...check.warn];
  if (!lines.length) return null;
  const text = `Autoverificação (regra do Pai, 2026-10-18): ${lines.join(' | ')}. Corrija agora: registre no barramento (bd session log), faça commit e push, e só então termine.`;
  if (check.block.length && !input.stop_hook_active) return { decision: 'block', reason: text };
  return { hookSpecificOutput: { hookEventName: 'Stop', additionalContext: text } };
}
