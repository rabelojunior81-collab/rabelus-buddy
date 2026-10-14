import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { archivePaths, sha256 } from '../lib/archive.mjs';
import { addEntry, prune, parse } from '../lib/changelog.mjs';
import { deletions, findDeletions } from '../lib/guard.mjs';
import { checkPath } from '../lib/names.mjs';

const at = (iso) => () => new Date(iso);
const g = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8' });

function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-arq-'));
  g(r, 'init', '-q', '-b', 'main');
  mkdirSync(join(r, 'docs/d'), { recursive: true });
  writeFileSync(join(r, 'docs/a.md'), 'A\n');
  writeFileSync(join(r, 'docs/d/b.md'), 'B\n');
  g(r, 'add', '-A');
  g(r, 'commit', '-q', '-m', 'init');
  return r;
}

test('archivePaths move com git mv e escreve lápide e manifesto', () => {
  const r = repo();
  const out = archivePaths(r, ['docs/a.md', 'docs/d'], { reason: 'substituído pela revisão 0.2', name: 'Spec velha', now: at('2026-10-14T13:00:00Z') });
  assert.equal(out.dest, 'archive/2026-10-14T100000-0300-spec-velha');
  assert.equal(existsSync(join(r, 'docs/a.md')), false);
  assert.equal(readFileSync(join(r, out.dest, 'docs/a.md'), 'utf8'), 'A\n');
  const m = JSON.parse(readFileSync(join(r, out.dest, 'manifest.json'), 'utf8'));
  assert.equal(m.entries.length, 2);
  assert.equal(m.entries.find((e) => e.from === 'docs/a.md').sha256, sha256(Buffer.from('A\n')));
  assert.match(readFileSync(join(r, out.dest, 'LAPIDE.md'), 'utf8'), /substituído pela revisão 0.2/);
  for (const e of m.entries) assert.deepEqual(checkPath(e.to), []);
  const st = g(r, 'diff', '--cached', '--name-status', '-M50%');
  assert.deepEqual(deletions(st), []);
  assert.match(st, /^R100\tdocs\/a.md/m);
});

test('guard encontra exclusões e aceita renomeações', () => {
  const r = repo();
  g(r, 'mv', 'docs/a.md', 'docs/a2.md');
  g(r, 'rm', '-q', 'docs/d/b.md');
  assert.deepEqual(findDeletions(r, { staged: true }), ['docs/d/b.md']);
  g(r, 'commit', '-q', '-m', 'x');
  assert.deepEqual(findDeletions(r, { base: 'HEAD~1' }), ['docs/d/b.md']);
});

test('changelog: numeração contínua e prune só com lições registradas', () => {
  const r = mkdtempSync(join(tmpdir(), 'buddy-cl-'));
  mkdirSync(join(r, '.buddy-dev'));
  writeFileSync(join(r, '.buddy-dev/CHANGELOG.md'), '# CHANGELOG\n\n> regra\n');
  for (let i = 1; i <= 5; i++) addEntry(r, { type: 'nota', text: `entrada ${i}`, now: at('2026-10-14T13:00:00Z') });
  assert.equal(parse(readFileSync(join(r, '.buddy-dev/CHANGELOG.md'), 'utf8')).entries.length, 5);

  assert.throws(() => prune(r, { cap: 3 }), /lote #0001-#0002/);
  writeFileSync(join(r, '.buddy-dev/LEARNING-CURVE.md'), '## lote #0001-#0002\nlição\n');
  const out = prune(r, { cap: 3, now: at('2026-10-14T14:00:00Z') });
  assert.equal(out.pruned, 2);
  assert.deepEqual(checkPath(out.archived), []);
  const left = parse(readFileSync(join(r, '.buddy-dev/CHANGELOG.md'), 'utf8'));
  assert.deepEqual(left.entries.map((e) => e.n), [3, 4, 5]);
  assert.match(left.header, /> regra/);
  assert.match(readFileSync(join(r, out.archived), 'utf8'), /entrada 1[\s\S]*entrada 2/);

  assert.equal(addEntry(r, { type: 'nota', text: 'seis' }).n, 6);
  assert.deepEqual(prune(r, { cap: 10 }), { pruned: 0 });
});
