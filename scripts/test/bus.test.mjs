import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startSession, logEvent, endSession, status, claim, release, currentSession } from '../lib/bus.mjs';
import { checkPath } from '../lib/names.mjs';

let wt1, wt2;
const at = (iso) => () => new Date(iso);

function sh(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name));
}

before(() => {
  const base = mkdtempSync(join(tmpdir(), 'buddy-bus-'));
  wt1 = join(base, 'repo');
  wt2 = join(base, 'wt2');
  execFileSync('git', ['init', '-q', '-b', 'main', wt1]);
  sh(wt1, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
  sh(wt1, 'worktree', 'add', '-q', '-b', 'outra', wt2);
});

test('uma sessão por worktree; eventos nomeados pela convenção', () => {
  const s = startSession(wt1, { harness: 'Claude Code', model: 'opus-5.5', scope: 'teste', now: at('2026-10-14T13:00:00Z') });
  assert.match(s.id, /^claude-code-[0-9a-f]{6}$/);
  assert.equal(currentSession(wt1).id, s.id);
  assert.throws(() => startSession(wt1, { harness: 'x', model: 'y', scope: 'z' }), /já existe sessão aberta/);

  logEvent(wt1, { type: 'decisao', summary: 'usar ledger por arquivo', now: at('2026-10-14T13:01:00Z') });
  const files = listFiles(join(wt1, '.buddy-dev/bus/ledger'));
  assert.equal(files.length, 2);
  for (const f of files) assert.deepEqual(checkPath(relative(wt1, f).replace(/\\/g, '/')), []);
  const ev = JSON.parse(readFileSync(files.sort()[1], 'utf8'));
  assert.equal(ev.seq, 2);
  assert.equal(ev.session, s.id);
  assert.equal(ev.ts, '2026-10-14T10:01:00-03:00');
  assert.equal(ev.type, 'decisao');
});

test('claims são exclusivos entre worktrees e expiram', () => {
  const s2 = startSession(wt2, { harness: 'opencode', model: 'm', scope: 'paralelo', now: at('2026-10-14T13:02:00Z') });
  claim(wt1, 'docs/plano macro', { ttlMin: 10, now: at('2026-10-14T13:03:00Z') });
  assert.throws(() => claim(wt2, 'docs/plano macro', { now: at('2026-10-14T13:05:00Z') }), /reivindicado por claude-code-/);
  assert.equal(status(wt2, { now: at('2026-10-14T13:05:00Z') }).claims.length, 1);

  const c = claim(wt2, 'docs/plano macro', { now: at('2026-10-14T13:20:00Z') });
  assert.equal(c.session, s2.id);
  assert.equal(c.tookOverFrom.startsWith('claude-code-'), true);
  assert.throws(() => release(wt1, 'docs/plano macro'), /não pertence/);
  release(wt2, 'docs/plano macro', { now: at('2026-10-14T13:21:00Z') });
  assert.equal(status(wt2).claims.length, 0);
});

test('encerrar libera os claims da sessão e o ponteiro', () => {
  claim(wt1, 'roadmap', { now: at('2026-10-14T13:30:00Z') });
  endSession(wt1, { summary: 'fim', now: at('2026-10-14T13:31:00Z') });
  assert.equal(currentSession(wt1), null);
  const st = status(wt1, { now: at('2026-10-14T13:31:00Z') });
  assert.equal(st.claims.length, 0);
  assert.equal(st.sessions.length, 1);
  assert.equal(existsSync(join(wt1, '.buddy-dev/bus/ledger/2026/10/14')), true);
});
