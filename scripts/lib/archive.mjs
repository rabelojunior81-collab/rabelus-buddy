// Regra pétrea: nada se apaga. O que sai de uso vai para archive/<carimbo>-<slug>/
// via `git mv` (histórico preservado), com LAPIDE.md e manifest.json (sha256 de cada arquivo).
// Uma entrada no arquivo morto nunca sai de lá.

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { formats } from './time.mjs';
import { slug } from './names.mjs';
import { git } from './git.mjs';

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function filesUnder(abs) {
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name));
}

const posix = (p) => p.replace(/\\/g, '/');

export function archivePaths(root, paths, { reason, name, session = 'nao-declarada', now = () => new Date() } = {}) {
  if (!reason || !name) throw new Error('informe --reason e --name');
  if (!paths.length) throw new Error('nada a arquivar');
  const f = formats(now());
  const destRel = `archive/${f.stamp}-${slug(name)}`;
  const dest = join(root, destRel);
  if (existsSync(dest)) throw new Error(`destino já existe: ${destRel}`);

  const entries = [];
  for (const p of paths.map(posix)) {
    if (p.startsWith('archive/')) throw new Error(`já está no arquivo morto: ${p}`);
    git(root, 'ls-files', '--error-unmatch', p); // só se arquiva o que está versionado
    const target = `${destRel}/${p}`;
    mkdirSync(dirname(join(root, target)), { recursive: true });
    git(root, 'mv', p, target);
    for (const abs of filesUnder(join(root, target))) {
      const buf = readFileSync(abs);
      const to = posix(relative(root, abs));
      entries.push({ from: p + to.slice(target.length), to, sha256: sha256(buf), bytes: buf.length });
    }
  }

  const manifest = { v: 1, archivedAt: f.iso, reason, session, entries };
  writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(dest, 'LAPIDE.md'), [
    `# Lápide — ${name}`,
    '',
    `**Arquivado em:** ${f.iso} · **Sessão:** ${session} · **Classe:** ARQUEOLOGIA (somente leitura; nunca sai daqui)`,
    '',
    '## Motivo',
    '',
    reason,
    '',
    '## Origem',
    '',
    '| De | Para | sha256 |',
    '|---|---|---|',
    ...entries.map((e) => `| \`${e.from}\` | \`${e.to}\` | \`${e.sha256.slice(0, 16)}…\` |`),
    '',
    '## Regra',
    '',
    'Nada aqui é norma, contrato ou fonte corrente. Para reaproveitar algo, copie para fora citando esta lápide; nunca mova de volta. Hashes completos em `manifest.json`.',
    '',
  ].join('\n'));
  git(root, 'add', `${destRel}/manifest.json`, `${destRel}/LAPIDE.md`);
  return { dest: destRel, entries };
}
