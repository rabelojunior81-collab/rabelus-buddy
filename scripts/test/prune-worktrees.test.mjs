import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as branches from '../lib/branches.mjs';

const { classifyBranches, pruneBranches, worktreeOf, removeAgentWorktree } = branches;

function git(cwd, ...a) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commitAt(cwd, iso, file) {
  writeFileSync(join(cwd, file), iso);
  git(cwd, 'add', '-A');
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', file], {
    cwd, env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso }, stdio: 'ignore',
  });
}

// Repositório sem remoto, com `main` e um commit inicial.
function novoRepo() {
  const base = realpathSync.native(mkdtempSync(join(tmpdir(), 'buddy-wt-')));
  const repo = join(base, 'repo');
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  commitAt(repo, '2026-10-01T10:00:00-03:00', 'a.txt');
  return repo;
}

// Branch com um commit, mergeada em main, presa no worktree `dir`.
function mergeadaEmWorktree(repo, branch, dir) {
  git(repo, 'worktree', 'add', '-q', '-b', branch, dir, 'main');
  commitAt(dir, '2026-10-10T10:00:00-03:00', 'b.txt');
  git(repo, 'merge', '-q', '--no-ff', '-m', 'Merge teste', branch);
}

const branchExiste = (repo, nome) => git(repo, 'branch', '--format=%(refname:short)').split('\n').includes(nome);

test('poda: branch mergeada presa em worktree de agente sai com o worktree, sem seguir links', () => {
  const repo = novoRepo();
  const wt = join(repo, '.claude', 'worktrees', 'agent-x');
  mergeadaEmWorktree(repo, 'worktree-agent-x', wt);
  // alvo FORA do worktree, com um arquivo que não pode sumir, e links para ele dentro do worktree
  const alvo = join(dirname(repo), 'alvo');
  mkdirSync(alvo);
  writeFileSync(join(alvo, 'guarda.txt'), 'não pode sumir');
  mkdirSync(join(wt, 'sub'));
  symlinkSync(alvo, join(wt, 'node_modules'), 'junction');
  symlinkSync(alvo, join(wt, 'sub', 'junta'), 'junction');

  const report = pruneBranches(repo, classifyBranches(repo), { stamp: 's' });

  assert.equal(existsSync(wt), false, 'o worktree de agente sai');
  assert.equal(branchExiste(repo, 'worktree-agent-x'), false, 'a branch mergeada sai');
  assert.equal(readFileSync(join(alvo, 'guarda.txt'), 'utf8'), 'não pode sumir', 'o alvo da junção continua intacto');
  assert.deepEqual(report.removed, ['worktree-agent-x']);
});

test('worktree fora de .claude/worktrees nunca é removido, e a branch fica', () => {
  const repo = novoRepo();
  const wt = join(dirname(repo), 'fora', 'agent-y');
  mergeadaEmWorktree(repo, 'worktree-agent-y', wt);

  const report = pruneBranches(repo, classifyBranches(repo), { stamp: 's' });

  assert.ok(existsSync(join(wt, 'b.txt')), 'o worktree fora da pasta de agentes continua');
  assert.equal(branchExiste(repo, 'worktree-agent-y'), true, 'a branch presa nele continua');
  assert.equal(report.removed.includes('worktree-agent-y'), false);
  assert.ok(report.skipped.some((s) => s.name === 'worktree-agent-y'), 'o pulo fica registrado');
});

test('branch não mergeada presa em worktree nunca é tocada, mesmo se a lista pedir remoção', () => {
  const repo = novoRepo();
  const wt = join(repo, '.claude', 'worktrees', 'agent-z');
  git(repo, 'worktree', 'add', '-q', '-b', 'feat/nao-mergeada', wt, 'main');
  commitAt(wt, '2026-10-15T10:00:00-03:00', 'c.txt');
  const sha = git(repo, 'rev-parse', 'feat/nao-mergeada');
  const lista = [{ name: 'feat/nao-mergeada', local: sha, remote: null, merged: false, action: 'remover' }];

  pruneBranches(repo, lista, { stamp: 's' });

  assert.ok(existsSync(join(wt, 'c.txt')), 'o worktree com trabalho não mergeado continua');
  assert.equal(branchExiste(repo, 'feat/nao-mergeada'), true, 'a branch não mergeada continua');
});

test('removeAgentWorktree recusa pasta fora de .claude/worktrees com erro claro', () => {
  const repo = novoRepo();
  const wt = join(dirname(repo), 'fora', 'agent-w');
  git(repo, 'worktree', 'add', '-q', '-b', 'feat/w', wt, 'main');
  assert.throws(() => removeAgentWorktree(repo, wt), /\.claude[\\/]worktrees/);
  assert.ok(existsSync(join(wt, 'a.txt')), 'nada foi removido');
});

test('worktreeOf devolve a pasta do worktree que usa a branch, ou null', () => {
  const repo = novoRepo();
  const wt = join(repo, '.claude', 'worktrees', 'agent-v');
  git(repo, 'worktree', 'add', '-q', '-b', 'feat/v', wt, 'main');
  assert.equal(worktreeOf(repo, 'feat/v'), resolve(wt));
  assert.equal(worktreeOf(repo, 'main'), resolve(repo));
  assert.equal(worktreeOf(repo, 'nao-existe'), null);
});
