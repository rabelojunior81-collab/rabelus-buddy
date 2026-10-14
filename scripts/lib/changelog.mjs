// CHANGELOG do buddy-dev: append-only, teto de 50 entradas.
// Acima do teto, as mais antigas vão para archive/changelog/ (verbatim, com sha256),
// e só depois que as lições do lote estiverem registradas em LEARNING-CURVE.md.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { formats } from './time.mjs';
import { sha256 } from './archive.mjs';

export const CAP = 50;
const FILE = '.buddy-dev/CHANGELOG.md';
const LEARNING = '.buddy-dev/LEARNING-CURVE.md';
const ENTRY = /^### #(\d{4}) · /m;

export function parse(text) {
  const idx = text.search(ENTRY);
  if (idx < 0) return { header: text, entries: [] };
  const header = text.slice(0, idx);
  const entries = text
    .slice(idx)
    .split(/(?=^### #\d{4} · )/m)
    .map((raw) => ({ n: Number(raw.match(ENTRY)[1]), raw: raw.replace(/\s+$/, '') + '\n' }));
  return { header, entries };
}

const pad = (n) => String(n).padStart(4, '0');

export function addEntry(root, { type, text, session = 'nao-declarada', now = () => new Date() }) {
  if (!type || !text) throw new Error('informe --type e --text');
  const file = join(root, FILE);
  if (!existsSync(file)) throw new Error(`${FILE} não existe`);
  const current = readFileSync(file, 'utf8');
  const { entries } = parse(current);
  const n = entries.length ? Math.max(...entries.map((e) => e.n)) + 1 : 1;
  const entry = `### #${pad(n)} · ${formats(now()).stamp} · ${session} · ${type}\n\n${text.trim()}\n`;
  writeFileSync(file, current.replace(/\s*$/, '\n\n') + entry);
  return { n, count: entries.length + 1, overCap: entries.length + 1 > CAP };
}

export function prune(root, { cap = CAP, now = () => new Date() } = {}) {
  const file = join(root, FILE);
  const { header, entries } = parse(readFileSync(file, 'utf8'));
  if (entries.length <= cap) return { pruned: 0 };
  const batch = entries.slice(0, entries.length - cap);
  const lot = `#${pad(batch[0].n)}-#${pad(batch.at(-1).n)}`;
  const learning = existsSync(join(root, LEARNING)) ? readFileSync(join(root, LEARNING), 'utf8') : '';
  if (!learning.includes(`lote ${lot}`)) {
    throw new Error(`registre as lições do lote ${lot} em ${LEARNING} (cite "lote ${lot}") antes do prune`);
  }
  const body = batch.map((e) => e.raw).join('\n');
  const f = formats(now());
  const out = `archive/changelog/${f.stamp}-entradas-${pad(batch[0].n)}-${pad(batch.at(-1).n)}.md`;
  mkdirSync(join(root, 'archive/changelog'), { recursive: true });
  writeFileSync(join(root, out), [
    `# CHANGELOG arquivado — lote ${lot}`,
    '',
    `**Arquivado em:** ${f.iso} · **Entradas:** ${batch.length} · **sha256 do corpo:** \`${sha256(body)}\``,
    `**Lições extraídas:** \`${LEARNING}\` (lote ${lot})`,
    '',
    '---',
    '',
    body,
  ].join('\n'));
  writeFileSync(file, header + entries.slice(batch.length).map((e) => e.raw).join('\n'));
  return { pruned: batch.length, lot, archived: out };
}
