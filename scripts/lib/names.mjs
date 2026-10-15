// Convenção de nomes: documentos vivos têm endereço fixo; registros têm carimbo.
// O carimbo vem de time.mjs (Curitiba, offset explícito): 2026-10-14T101733-0300.

export const STAMP = String.raw`\d{4}-\d{2}-\d{2}T\d{6}[+-]\d{4}`;

export function slug(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export function stampedName(text, { stamp, ext } = {}) {
  const s = slug(text);
  if (!s) throw new Error(`slug vazio para "${text}"`);
  if (!new RegExp(`^${STAMP}$`).test(stamp ?? '')) throw new Error(`carimbo inválido: ${stamp}`);
  return `${stamp}-${s}${ext ? '.' + ext.replace(/^\./, '') : ''}`;
}

// Pastas isentas: o conteúdo original é preservado com o nome original.
const EXEMPT = [/^docs\/00-proveniencia\//, /^node_modules\//, /^\.git\//];

// Regras por pasta: [prefixo, regex do resto do caminho, descrição].
// README.md e LAPIDE.md de cada pasta são sempre aceitos.
const RULES = [
  ['.buddy-dev/diario/', /^\d{4}-\d{2}-\d{2}\.md$/, 'diário: AAAA-MM-DD.md'],
  ['.buddy-dev/bus/ledger/', new RegExp(`^\\d{4}/\\d{2}/\\d{2}/${STAMP}-[a-z0-9-]+\\.json$`), 'ledger: AAAA/MM/DD/<carimbo>-<sessao>-<seq>-<tipo>.json'],
  ['docs/registros/', new RegExp(`^${STAMP}-[a-z0-9-]+(\\.[a-z0-9]+|/.+)$`), 'registro: <carimbo>-<slug>.<ext> ou pasta <carimbo>-<slug>/'],
  ['archive/changelog/', new RegExp(`^${STAMP}-entradas-\\d{4}-\\d{4}\\.md$`), 'changelog arquivado: <carimbo>-entradas-NNNN-NNNN.md'],
  ['archive/', new RegExp(`^${STAMP}-[a-z0-9-]+/.+$`), 'arquivo morto: archive/<carimbo>-<slug>/...'],
];

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const ALWAYS_OK = new Set(['README.md', 'LAPIDE.md', '.gitkeep']);

export function checkPath(path) {
  const p = path.replace(/\\/g, '/');
  if (EXEMPT.some((re) => re.test(p))) return [];
  const problems = [];
  const bad = p.split('/').filter((seg) => !SAFE_SEGMENT.test(seg));
  if (bad.length) problems.push(`${p}: fora do padrão ASCII sem espaços (${bad.map((b) => `"${b}"`).join(', ')})`);
  const rule = RULES.find(([prefix]) => p.startsWith(prefix));
  if (rule) {
    const [prefix, re, desc] = rule;
    const rest = p.slice(prefix.length);
    if (!ALWAYS_OK.has(rest) && !re.test(rest)) problems.push(`${p}: esperado ${desc}`);
  }
  return problems;
}
