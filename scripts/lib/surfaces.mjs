// Superfícies: o que muda num lugar precisa chegar aos lugares que dependem dele.
//
// Em 2026-10-15 o Pai notou que eu evoluía o projeto sem atualizar todas as superfícies
// (README com "Fase 0", STATUS com ADR "proposta" já aceita, carimbos "Atualizado em"
// de ontem em arquivos editados hoje). As checagens abaixo pegam a parte mecânica dessas
// lacunas; o mapa evento → superfícies fica em docs/30-governanca/SUPERFICIES.md.

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { formats } from './time.mjs';
import { join } from 'node:path';
import { tryGit } from './git.mjs';
import { currentSession } from './bus.mjs';

const POR = /(\*\*Atualizado em:\*\* [^ ]+ \(`bd now --verify`\) · \*\*Por:\*\* )[^\s|]+/;

const read = (root, p) => readFileSync(join(root, p), 'utf8');
const ls = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir), { withFileTypes: true }) : []);
const stateWord = (s) => (s ?? '').trim().toLowerCase().match(/^(aceita|proposta|substitu[ií]da|rejeitada|obsoleta)/)?.[1] ?? (s ?? '').trim();

// 1. Todo documento que tem índice aparece no índice (e a ADR com o mesmo estado).
export function indexGaps(root) {
  const gaps = [];
  const idx = (dir) => (existsSync(join(root, dir, 'README.md')) ? read(root, `${dir}/README.md`) : '');

  const kb = idx('docs/20-conhecimento');
  for (const f of ls(root, 'docs/20-conhecimento')) {
    if (f.isFile() && f.name.endsWith('.md') && f.name !== 'README.md' && !kb.includes(`(./${f.name})`)) {
      gaps.push(`docs/20-conhecimento/${f.name} fora do índice (docs/20-conhecimento/README.md)`);
    }
  }

  const adrIdx = idx('docs/60-decisoes');
  for (const f of ls(root, 'docs/60-decisoes')) {
    const m = f.name.match(/^(\d{4})-.*\.md$/);
    if (!f.isFile() || !m) continue;
    const row = adrIdx.split('\n').find((l) => l.includes(`(./${f.name})`));
    if (!row) { gaps.push(`docs/60-decisoes/${f.name} fora do índice (docs/60-decisoes/README.md)`); continue; }
    const fileState = stateWord(read(root, `docs/60-decisoes/${f.name}`).match(/^status:\s*(.+)$/m)?.[1]);
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    const rowState = stateWord(cells.at(-1));
    if (fileState && rowState !== fileState) {
      gaps.push(`ADR ${m[1]}: índice diz "${rowState}", a ADR diz "${fileState}"`);
    }
  }

  const specIdx = idx('docs/40-specs');
  for (const d of ls(root, 'docs/40-specs')) {
    if (d.isDirectory() && existsSync(join(root, 'docs/40-specs', d.name, 'SPEC.md')) && !specIdx.includes(d.name)) {
      gaps.push(`docs/40-specs/${d.name} fora do índice (docs/40-specs/README.md)`);
    }
  }

  const resIdx = idx('docs/10-pesquisa');
  for (const d of ls(root, 'docs/10-pesquisa')) {
    if (d.isDirectory() && /^rev-/.test(d.name) && !resIdx.includes(`${d.name}/`)) {
      gaps.push(`docs/10-pesquisa/${d.name} fora do índice (docs/10-pesquisa/README.md)`);
    }
  }
  return gaps;
}

// Documentos vivos: onde o estado presente é afirmado. Registros, diário, changelog,
// ledger, arquivo e proveniência são história e não entram.
const HISTORY = /^(docs\/registros\/|docs\/00-proveniencia\/|docs\/10-pesquisa\/|archive\/|\.buddy-dev\/(diario|bus)\/|\.buddy-dev\/(CHANGELOG|LEARNING-CURVE|GENESIS)\.md$|CHANGELOG\.md$|docs\/60-decisoes\/)/;

function livingDocs(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of ls(root, dir)) {
      const p = dir ? `${dir}/${e.name}` : e.name;
      // .claude/worktrees: cópias de trabalho dos subagentes (piloto de paralelismo), não documentos deste checkout.
      if (e.isDirectory()) { if (!['node_modules', '.git', 'workspace'].includes(e.name) && p !== '.claude/worktrees') walk(p); }
      else if (e.name.endsWith('.md') && !HISTORY.test(p)) out.push(p);
    }
  };
  walk('');
  return out;
}

// 2. ADR aceita não pode continuar citada como "proposta" no estado presente.
export function staleProposals(root) {
  const accepted = ls(root, 'docs/60-decisoes')
    .map((f) => f.name.match(/^(\d{4})-.*\.md$/) && f)
    .filter(Boolean)
    .filter((f) => stateWord(read(root, `docs/60-decisoes/${f.name}`).match(/^status:\s*(.+)$/m)?.[1]) === 'aceita')
    .map((f) => f.name.slice(0, 4));
  const gaps = [];
  for (const p of livingDocs(root)) {
    const text = read(root, p);
    for (const n of accepted) {
      // "ADR 0013, proposta", "ADR 0013 (proposta" e "[ADR 0013](link longo) proposta".
      const re = new RegExp(`ADR[\\s\\[]*${n}\\]?(\\([^)]*\\))?[^\\n|]{0,16}?propost`, 'i');
      // A linha da main no STATUS cita o título do último merge, que é histórico (lacuna de 2026-10-25).
      const hit = text.split('\n').find((l) => re.test(l) && !/~~/.test(l) && !/^\|\s*`main`\s*\|/.test(l));
      if (hit) gaps.push(`${p}: ADR ${n} citada como proposta, mas está aceita → "${hit.trim().slice(0, 90)}"`);
    }
  }
  return gaps;
}

// 3. "Atualizado em" não fica atrás do último commit do arquivo nem no futuro.
const STAMP = /\*\*Atualizado em:\*\*\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})/;
export const STAMP_TOLERANCE_H = 6;

export function stampProblems(root, { now = new Date() } = {}) {
  const gaps = [];
  for (const p of livingDocs(root)) {
    const m = read(root, p).match(STAMP);
    if (!m) continue;
    const stamp = new Date(m[1]);
    if (stamp.getTime() > now.getTime() + 5 * 60_000) { gaps.push(`${p}: "Atualizado em" ${m[1]} está no futuro`); continue; }
    // Alterado e não commitado conta como editado agora (lacuna de 2026-10-17: o carimbo velho do
    // PLANO passou no bd surfaces local, antes do commit, e só reprovou na CI).
    const dirty = Boolean(tryGit(root, 'status', '--porcelain', '--', p));
    const last = dirty ? now.toISOString() : tryGit(root, 'log', '-1', '--format=%cI', '--', p);
    if (last && new Date(last).getTime() - stamp.getTime() > STAMP_TOLERANCE_H * 3_600_000) {
      gaps.push(`${p}: "Atualizado em" ${m[1]} desatualizado (${dirty ? 'alterado e não commitado' : `último commit do arquivo: ${last}`})`);
    }
  }
  return gaps;
}

// 4a. Reescreve a linha da `main` e a contagem de PRs do STATUS pelo próprio git (evolução de 2026-10-18: depois de
//     cada merge a linha ficava atrasada e o gancho pre-commit barrava o commit). Devolve true se mudou algo.
// O **Por:** do carimbo vira o id da sessão aberta deste worktree (`session`, ou a sessão do barramento). Sem sessão,
// mantém o valor antigo e empurra um aviso em `warnings` (lacuna de 2026-10-20: o Por dizia que outra sessão tinha escrito).
export function syncStatusMain(root, { base = 'origin/main', session, warnings = [] } = {}) {
  const p = join(root, '.buddy-dev/STATUS.md');
  if (!existsSync(p)) return false;
  const hash = tryGit(root, 'rev-parse', '--short=7', base);
  const subject = tryGit(root, 'log', '-1', '--format=%s', base) ?? '';
  const pr = /^Merge #(\d+)/.exec(subject)?.[1];
  if (!hash || !pr) return false;
  const short = subject.replace(/\s*\(CI verde\)\s*$/, '').replace(/\s*\([^()]*\)\s*$/, '').slice(0, 90);
  const s = readFileSync(p, 'utf8');
  const out = s
    .replace(/^\| `main` \| `[0-9a-f]{7,40}` \([^\n]*\), CI verde \|$/m, `| \`main\` | \`${hash}\` (${short}), CI verde |`)
    .replace(/^\| PRs mergeados \| #1–#\d+,/m, `| PRs mergeados | #1–#${pr},`);
  const sid = session ?? currentSession(root)?.id ?? null;
  if (!sid && POR.test(out)) warnings.push('sem sessão aberta: o Por não foi trocado');
  if (out === s) return false;
  const stamped = out
    .replace(/\*\*Atualizado em:\*\* [^ ]+ \(`bd now --verify`\)/, `**Atualizado em:** ${formats().iso} (\`bd now --verify\`)`)
    .replace(POR, (_, pre) => (sid ? `${pre}${sid}` : _));
  writeFileSync(p, stamped);
  return true;
}

// 4. A `main` registrada no STATUS fica no máximo 1 commit de primeiro pai atrás da base.
export function statusMainLag(root, { statusText, base = 'origin/main' } = {}) {
  const text = statusText ?? (existsSync(join(root, '.buddy-dev/STATUS.md')) ? read(root, '.buddy-dev/STATUS.md') : '');
  const hash = text.match(/\|\s*`main`\s*\|\s*`([0-9a-f]{7,40})`/)?.[1];
  if (!hash) return { problem: null };
  if (!tryGit(root, 'cat-file', '-e', `${hash}^{commit}`) && tryGit(root, 'cat-file', '-t', hash) !== 'commit') {
    return { problem: `STATUS: main \`${hash}\` não existe no histórico` };
  }
  let baseRef = tryGit(root, 'merge-base', 'HEAD', base) ?? tryGit(root, 'rev-parse', base);
  if (!baseRef) return { problem: null };
  // Na main, logo depois de um merge, o próprio merge não conta (ele não pode citar a si mesmo): a medida
  // parte do primeiro pai, a mesma base que o PR enxergou (lacuna de 2026-10-18: a CI da main reprovava todo merge).
  if (baseRef === tryGit(root, 'rev-parse', 'HEAD') && tryGit(root, 'rev-parse', '--verify', '-q', 'HEAD^2')) baseRef = tryGit(root, 'rev-parse', 'HEAD^1') ?? baseRef;
  const lag = Number(tryGit(root, 'rev-list', '--first-parent', '--count', `${hash}..${baseRef}`) ?? 0);
  return { lag, problem: lag > 1 ? `STATUS: main \`${hash}\` está ${lag} commit(s) de primeiro pai atrás de ${base}; atualize o STATUS` : null };
}

// 5. Sub-fase concluída no plano chega ao produto: está no CHANGELOG.md da raiz, e a última
//    concluída aparece no Estado do README.md e do README.en.md (lacuna de 2026-10-16: M0.6b,
//    M0.6e e M0.7a mergeadas sem entrar no CHANGELOG do produto nem no README).
const DONE = /^\s*- \[x\] \*\*(M\d+(?:\.\d+[a-z]?)?)\b/gm;
const mentions = (text, id) => new RegExp(`(?<![\\w.])${id.replace('.', '\\.')}(?![0-9a-z])`).test(text);

export function milestoneGaps(root) {
  const plans = ls(root, 'docs/50-planos').filter((d) => d.isDirectory() && existsSync(join(root, 'docs/50-planos', d.name, 'PLANO.md'))).map((d) => `docs/50-planos/${d.name}/PLANO.md`).sort();
  const gaps = [];
  const changelog = existsSync(join(root, 'CHANGELOG.md')) ? read(root, 'CHANGELOG.md') : '';
  let last = null;
  for (const p of plans) {
    for (const m of read(root, p).matchAll(DONE)) {
      const id = m[1];
      last = id;
      if (!mentions(changelog, id)) gaps.push(`CHANGELOG.md: sub-fase ${id} concluída em ${p} e ausente do changelog do produto`);
    }
  }
  if (last) {
    for (const r of ['README.md', 'README.en.md']) {
      if (existsSync(join(root, r)) && !mentions(read(root, r), last)) gaps.push(`${r}: o Estado não cita a última sub-fase concluída (${last})`);
    }
  }
  return gaps;
}

export function surfaceGaps(root, opts = {}) {
  return [...indexGaps(root), ...staleProposals(root), ...stampProblems(root, opts), statusMainLag(root, opts).problem, ...milestoneGaps(root)].filter(Boolean);
}
