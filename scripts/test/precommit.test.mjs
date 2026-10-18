// Autoverificação antes de cada commit (2026-10-18): commitei com o bd surfaces reprovando. O gancho pre-commit
// versionado em .githooks recusa o commit quando uma checagem rápida reprova; o bd pre garante o hooksPath.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { preCommitProblems, ensureHooksPath } from '../lib/verifica.mjs';

const BD = join(import.meta.dirname, '..', 'bd.mjs');
function sh(r, ...a) { return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: r, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-precommit-'));
  sh(r, 'init', '-q', '-b', 'main');
  writeFileSync(join(r, 'README.md'), '# ok\n');
  sh(r, 'add', '-A'); sh(r, 'commit', '-q', '--no-verify', '-m', 'base');
  sh(r, 'branch', 'origin-main-falso');
  return r;
}

test('pre-commit: link quebrado barra o commit e diz o porquê; corrigido, o commit passa', () => {
  const r = repo();
  mkdirSync(join(r, '.githooks'));
  writeFileSync(join(r, '.githooks', 'pre-commit'), `#!/bin/sh\nexec "${process.execPath.replace(/\\/g, '/')}" "${BD.replace(/\\/g, '/')}" verifica --pre-commit --base origin-main-falso\n`);
  // No Linux e no macOS, o git ignora gancho sem permissão de execução (a CI do #58 pegou isso).
  chmodSync(join(r, '.githooks', 'pre-commit'), 0o755);
  ensureHooksPath(r);
  assert.equal(sh(r, 'config', 'core.hooksPath').trim(), '.githooks');
  writeFileSync(join(r, 'README.md'), '# ok\n[quebrado](./nao-existe.md)\n');
  sh(r, 'add', '-A');
  let refused = '';
  try { sh(r, 'commit', '-q', '-m', 'com link quebrado'); } catch (e) { refused = `${e.stdout}${e.stderr}`; }
  assert.match(refused, /nao-existe\.md/);
  assert.match(refused, /commit barrado/);
  writeFileSync(join(r, 'README.md'), '# ok\n');
  sh(r, 'add', '-A');
  sh(r, 'commit', '-q', '-m', 'corrigido');
  assert.match(sh(r, 'log', '--oneline', '-1'), /corrigido/);
});

test('preCommitProblems: limpo não acusa; órfão acusa', () => {
  const r = repo();
  assert.deepEqual(preCommitProblems(r, { base: 'origin-main-falso' }), []);
  writeFileSync(join(r, 'README.md'), '[x](./sumiu.md)\n');
  assert.ok(preCommitProblems(r, { base: 'origin-main-falso' }).some((p) => /sumiu\.md/.test(p)));
});
