import { execFileSync } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';

export function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function tryGit(cwd, ...args) {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
}

export function repoRoot(cwd = process.cwd()) {
  return git(cwd, 'rev-parse', '--show-toplevel');
}

// Diretório comum a todos os worktrees (onde mora o estado vivo do barramento).
export function commonDir(root) {
  const d = git(root, 'rev-parse', '--git-common-dir');
  return isAbsolute(d) ? d : resolve(root, d);
}

// Diretório git próprio deste worktree.
export function gitDir(root) {
  const d = git(root, 'rev-parse', '--git-dir');
  return isAbsolute(d) ? d : resolve(root, d);
}

export function currentBranch(root) {
  return tryGit(root, 'branch', '--show-current') || 'detached';
}
