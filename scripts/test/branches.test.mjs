import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { classifyBranches, pruneBranches, mergeReadiness } from '../lib/branches.mjs';

let origin, repo;
const DAY = 86_400_000;
const NOW = new Date('2026-10-16T12:00:00-03:00');

function git(cwd, ...a) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function commitAt(iso, file) {
  writeFileSync(join(repo, file), iso);
  git(repo, 'add', '-A');
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', file], {
    cwd: repo, env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso },
  });
}
const by = (list, name) => list.find((b) => b.name === name);

beforeEach(() => {
  const base = mkdtempSync(join(tmpdir(), 'buddy-br-'));
  origin = join(base, 'origin.git');
  repo = join(base, 'repo');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['clone', '-q', origin, repo], { stdio: 'ignore' });
  commitAt('2026-10-01T10:00:00-03:00', 'a.txt');
  git(repo, 'push', '-q', '-u', 'origin', 'main');
  // mergeada (merge commit), local e remota
  git(repo, 'checkout', '-q', '-b', 'feat/mergeada');
  commitAt('2026-10-10T10:00:00-03:00', 'b.txt');
  git(repo, 'push', '-q', '-u', 'origin', 'feat/mergeada');
  git(repo, 'checkout', '-q', 'main');
  git(repo, 'merge', '-q', '--no-ff', '-m', 'Merge #1', 'feat/mergeada');
  git(repo, 'push', '-q');
  // não mergeada, com PR aberto
  git(repo, 'checkout', '-q', '-b', 'feat/com-pr');
  commitAt('2026-10-15T10:00:00-03:00', 'c.txt');
  git(repo, 'push', '-q', '-u', 'origin', 'feat/com-pr');
  // não mergeada, sem PR, recente (trabalho em andamento)
  git(repo, 'checkout', '-q', 'main');
  git(repo, 'checkout', '-q', '-b', 'feat/em-andamento');
  commitAt('2026-10-15T20:00:00-03:00', 'd.txt');
  git(repo, 'push', '-q', '-u', 'origin', 'feat/em-andamento');
  // não mergeada, sem PR, abandonada (mais de 14 dias)
  git(repo, 'checkout', '-q', 'main');
  git(repo, 'checkout', '-q', '-b', 'spike/velho');
  commitAt('2026-09-20T10:00:00-03:00', 'e.txt');
  git(repo, 'push', '-q', '-u', 'origin', 'spike/velho');
  git(repo, 'checkout', '-q', 'main');
});

const classify = (opts = {}) => classifyBranches(repo, { now: NOW, openPrHeads: new Set(['feat/com-pr']), ...opts });

test('classifica: mergeada sai; com PR fica; recente fica; abandonada vai para o arquivo', () => {
  const list = classify();
  assert.equal(by(list, 'feat/mergeada').action, 'remover');
  assert.equal(by(list, 'feat/com-pr').action, 'manter');
  assert.match(by(list, 'feat/com-pr').reason, /PR aberto/);
  assert.equal(by(list, 'feat/em-andamento').action, 'manter');
  assert.match(by(list, 'feat/em-andamento').reason, /em andamento/);
  assert.equal(by(list, 'spike/velho').action, 'arquivar');
  assert.equal(by(list, 'main'), undefined);
});

test('arquivar por ordem explícita, mesmo recente; nunca com PR aberto', () => {
  const list = classify({ archive: new Set(['feat/em-andamento', 'feat/com-pr']) });
  assert.equal(by(list, 'feat/em-andamento').action, 'arquivar');
  assert.equal(by(list, 'feat/com-pr').action, 'manter');
});

test('a branch atual nunca é removida nem arquivada', () => {
  git(repo, 'checkout', '-q', 'spike/velho');
  assert.equal(by(classify(), 'spike/velho').action, 'manter');
});

test('prune remove mergeadas (local e remota) e arquiva com tag anotada antes de remover', () => {
  const report = pruneBranches(repo, classify(), { stamp: '2026-10-16T120000-0300', reason: 'teste' });
  const local = git(repo, 'branch', '--format=%(refname:short)').split('\n');
  const remote = git(origin, 'branch', '--format=%(refname:short)').split('\n');
  assert.ok(!local.includes('feat/mergeada') && !remote.includes('feat/mergeada'));
  assert.ok(!local.includes('spike/velho') && !remote.includes('spike/velho'));
  assert.ok(local.includes('feat/com-pr') && local.includes('feat/em-andamento'));
  const tag = 'archive/spike/velho-2026-10-16T120000-0300';
  assert.equal(git(origin, 'tag', '-l', tag), tag, 'a tag de arquivo vai para o remoto');
  assert.equal(git(repo, 'rev-parse', `${tag}^{commit}`), report.archived[0].sha, 'a tag preserva o commit');
  assert.match(git(repo, 'tag', '-l', '--format=%(contents)', tag), /teste/);
  assert.deepEqual(report.removed.sort(), ['feat/mergeada']);
});

test('depois do prune nada mais é removível', () => {
  pruneBranches(repo, classify(), { stamp: 's', reason: 'r' });
  assert.deepEqual(classify().filter((b) => b.action !== 'manter'), []);
});

test('mergeReadiness: só mergeia PR aberto, mergeável e com todas as checagens verdes', () => {
  const ok = { state: 'OPEN', mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN', statusCheckRollup: [{ conclusion: 'SUCCESS' }, { conclusion: 'SUCCESS' }] };
  assert.deepEqual(mergeReadiness(ok), []);
  assert.match(mergeReadiness({ ...ok, state: 'MERGED' }).join(), /não está aberto/);
  assert.match(mergeReadiness({ ...ok, statusCheckRollup: [{ conclusion: 'FAILURE' }] }).join(), /checagens/);
  assert.match(mergeReadiness({ ...ok, statusCheckRollup: [{ status: 'IN_PROGRESS', conclusion: '' }] }).join(), /checagens/);
  assert.match(mergeReadiness({ ...ok, statusCheckRollup: [] }).join(), /nenhuma checagem/);
  assert.match(mergeReadiness({ ...ok, mergeable: 'CONFLICTING' }).join(), /conflito/);
});
