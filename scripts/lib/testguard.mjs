// Trava de testes: teste reprovado se resolve no código, nunca afrouxando o teste.
//
// Ordem do Pai em 2026-10-15: "se o teste reprovar, arruma o código, não afrouxa o
// teste". Contra a base, a suíte inteira não pode perder testes nem asserções, e
// nenhum skip/todo/only pode aparecer. Mover testes entre arquivos é permitido
// (a conta é da suíte); trocar uma asserção forte por uma fraca não é detectável
// por contagem e fica com a revisão do PR.

import { tryGit } from './git.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_FILE = /(^|\/)(scripts\/test\/.*\.test\.m?js|.*\.test\.(m?js|ts|mts))$/;
const TEST_CALL = /(^|[^\w.])(test|it)\s*(\.(skip|todo|only))?\s*\(/g;
const ASSERT_CALL = /\bassert(\.\w+)*\s*\(/g;
const SKIP = /\b(test|it|describe|suite)\.(skip|todo|only)\s*\(|\{\s*[^}]*\b(skip|todo|only)\s*:\s*(true|['"])/g;

export function countTestFile(text) {
  return {
    tests: (text.match(TEST_CALL) ?? []).length,
    asserts: (text.match(ASSERT_CALL) ?? []).length,
    skips: (text.match(SKIP) ?? []).length,
  };
}

function suite(files, read) {
  const total = { tests: 0, asserts: 0, skips: 0 };
  const skipsByFile = {};
  for (const f of files) {
    const c = countTestFile(read(f));
    total.tests += c.tests; total.asserts += c.asserts; total.skips += c.skips;
    if (c.skips) skipsByFile[f] = c.skips;
  }
  return { total, skipsByFile };
}

export function testGuard(root, { base = 'origin/main' } = {}) {
  const ref = tryGit(root, 'merge-base', 'HEAD', base) ?? base;
  const baseFiles = (tryGit(root, 'ls-tree', '-r', '--name-only', ref) ?? '').split('\n').filter((f) => TEST_FILE.test(f));
  const headFiles = [
    ...(tryGit(root, 'ls-files') ?? '').split('\n'),
    ...(tryGit(root, 'ls-files', '--others', '--exclude-standard') ?? '').split('\n'),
  ].filter((f) => TEST_FILE.test(f) && existsSync(join(root, f)));

  const before = suite(baseFiles, (f) => tryGit(root, 'show', `${ref}:${f}`) ?? '');
  const after = suite([...new Set(headFiles)], (f) => readFileSync(join(root, f), 'utf8'));
  const problems = [];
  if (after.total.tests < before.total.tests) problems.push(`testes: ${before.total.tests} → ${after.total.tests} (a suíte não pode perder testes)`);
  if (after.total.asserts < before.total.asserts) problems.push(`asserções: ${before.total.asserts} → ${after.total.asserts} (a suíte não pode perder asserções)`);
  for (const [f, n] of Object.entries(after.skipsByFile)) {
    if (n > (before.skipsByFile[f] ?? 0)) problems.push(`${f}: skip/todo/only adicionado (${n}); teste reprovado se corrige no código`);
  }
  return problems;
}
