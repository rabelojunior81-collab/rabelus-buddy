// Guarda da regra pétrea: nenhuma exclusão de arquivo versionado.
// Renomear/mover é permitido (o histórico segue); excluir, não. Para tirar algo de uso: `bd archive`.

import { git } from './git.mjs';

export function deletions(nameStatus) {
  return nameStatus
    .split('\n')
    .filter((l) => /^D\t/.test(l))
    .map((l) => l.slice(2));
}

export function findDeletions(root, { base, staged = false } = {}) {
  const args = staged
    ? ['diff', '--cached', '--name-status', '-M50%']
    : ['diff', '--name-status', '-M50%', `${base}...HEAD`];
  return deletions(git(root, ...args));
}
