import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { testGuard, countTestFile } from '../lib/testguard.mjs';

function git(r, ...a) { return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: r, encoding: 'utf8' }).trim(); }
function write(r, p, c) { mkdirSync(dirname(join(r, p)), { recursive: true }); writeFileSync(join(r, p), c); }

const SUITE = `import { test } from 'node:test';
import assert from 'node:assert/strict';
test('a', () => { assert.equal(1, 1); assert.ok(true); });
test('b', () => { assert.deepEqual([1], [1]); });
`;

function setup() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-tg-'));
  git(r, 'init', '-q', '-b', 'main');
  write(r, 'scripts/test/a.test.mjs', SUITE);
  write(r, 'packages/core/test/b.test.ts', SUITE);
  git(r, 'add', '-A'); git(r, 'commit', '-q', '-m', 'base');
  git(r, 'checkout', '-q', '-b', 'pr');
  return r;
}
const run = (r) => testGuard(r, { base: 'main' });

test('contagem: testes e asserções de um arquivo', () => {
  assert.deepEqual(countTestFile(SUITE), { tests: 2, asserts: 3, skips: 0 });
});

test('sem mudanças nos testes: aprova', () => {
  assert.deepEqual(run(setup()), []);
});

test('teste novo e asserção nova: aprova', () => {
  const r = setup();
  write(r, 'scripts/test/a.test.mjs', SUITE + "test('c', () => { assert.equal(2, 2); });\n");
  assert.deepEqual(run(r), []);
});

test('asserção removida: reprova', () => {
  const r = setup();
  write(r, 'scripts/test/a.test.mjs', SUITE.replace(' assert.ok(true);', ''));
  assert.match(run(r).join('\n'), /asserções: 6 → 5/);
});

test('teste removido: reprova', () => {
  const r = setup();
  write(r, 'scripts/test/a.test.mjs', SUITE.replace("test('b', () => { assert.deepEqual([1], [1]); });\n", ''));
  assert.match(run(r).join('\n'), /testes: 4 → 3/);
});

test('arquivo de teste apagado: reprova', () => {
  const r = setup();
  rmSync(join(r, 'packages/core/test/b.test.ts'));
  assert.match(run(r).join('\n'), /testes: 4 → 2/);
});

test('skip, todo ou only adicionados: reprova', () => {
  for (const mod of ["test.skip('a'", "test.only('a'", "test.todo('a'", "test('a', { skip: true }", "it.skip('a'"]) {
    const r = setup();
    write(r, 'scripts/test/a.test.mjs', SUITE.replace("test('a'", mod));
    assert.match(run(r).join('\n'), /skip|only|todo/, mod);
  }
});

test('mover testes entre arquivos sem perder nenhum: aprova', () => {
  const r = setup();
  rmSync(join(r, 'packages/core/test/b.test.ts'));
  write(r, 'packages/core/test/c.test.ts', SUITE);
  assert.deepEqual(run(r), []);
});
