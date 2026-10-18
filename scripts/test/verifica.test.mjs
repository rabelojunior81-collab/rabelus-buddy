// Regra do Pai (2026-10-18): autoverificação é fundacional. O que eu faço entra no barramento no momento do fato;
// código vai para commit e push a cada passo. A auditoria achou 53 commits de código sem registro em 14 sessões.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { unrecordedCommits, selfCheck, hookDecision } from '../lib/verifica.mjs';

const T0 = Date.parse('2026-10-18T12:00:00-03:00');
const at = (min) => new Date(T0 + min * 60_000);
function sh(r, env, ...a) { return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: r, encoding: 'utf8', env: { ...process.env, ...env } }).trim(); }
function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-verif-'));
  sh(r, {}, 'init', '-q', '-b', 'main');
  writeFileSync(join(r, 'README.md'), 'x');
  sh(r, {}, 'add', '-A'); sh(r, {}, 'commit', '-q', '-m', 'base');
  sh(r, {}, 'branch', 'base');
  sh(r, {}, 'checkout', '-q', '-b', 'feat/x');
  return r;
}
function commit(r, minute, file, msg) {
  const d = at(minute).toISOString();
  mkdirSync(join(r, file, '..'), { recursive: true });
  writeFileSync(join(r, file), `${msg}\n`);
  sh(r, { GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d }, 'add', '-A');
  sh(r, { GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d }, 'commit', '-q', '-m', msg);
  return sh(r, {}, 'rev-parse', '--short=7', 'HEAD');
}
function event(r, minute, type, extra = {}) {
  const d = at(minute);
  const dir = join(r, '.buddy-dev/bus/ledger/2026/10/18');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `ev-${minute}-${type}.json`), JSON.stringify({ v: 1, ts: d.toISOString(), utc: d.toISOString(), session: 's1', type, summary: extra.summary ?? `${type} aos ${minute} min`, refs: extra.refs ?? [], data: {} }));
}

test('verifica: commit de código sem registro substantivo desde o anterior é acusado; com registro, ou registro atrasado que cita o commit, passa', () => {
  const r = repo();
  event(r, 1, 'decisao');
  const a = commit(r, 2, 'packages/core/src/a.ts', 'feat: a');
  const b = commit(r, 10, 'packages/core/src/b.ts', 'feat: b sem registro');
  event(r, 11, 'claim'); // claim não é registro substantivo
  const c = commit(r, 20, 'scripts/lib/c.mjs', 'feat: c');
  event(r, 40, 'erro', { summary: `(registro atrasado) o commit ${c} entrou sem registro` });
  commit(r, 50, 'docs/nota.md', 'docs: só documentação não exige registro');
  event(r, 59, 'aprendizado');
  commit(r, 60, 'packages/core/src/d.ts', 'feat: d');
  const miss = unrecordedCommits(r, { base: 'base' });
  assert.deepEqual(miss.map((m) => m.hash), [b]);
  assert.match(miss[0].subject, /b sem registro/);
  assert.ok(!miss.some((m) => m.hash === a || m.hash === c));
});

test('verifica: alteração sem commit e commit sem push bloqueiam; 30 min sem registro na sessão é aviso', () => {
  const r = repo();
  event(r, 1, 'decisao');
  commit(r, 2, 'packages/core/src/a.ts', 'feat: a');
  writeFileSync(join(r, 'packages/core/src/a.ts'), 'mudou e não foi para commit\n');
  const c = selfCheck(r, { base: 'base', now: at(45), session: 's1' });
  assert.ok(c.block.some((x) => /sem commit/.test(x)), c.block.join('\n'));
  assert.ok(c.block.some((x) => /sem push|sem upstream/.test(x)), c.block.join('\n'));
  assert.ok(c.warn.some((x) => /44 min sem registro/.test(x)), c.warn.join('\n'));
});

test('verifica --hook: com pendência, barra o fim da resposta uma vez e diz o porquê; já continuando, só avisa (sem laço)', () => {
  const block = hookDecision({ block: ['commit de código sem registro: abc1234'], warn: [] }, { stop_hook_active: false });
  assert.equal(block.decision, 'block');
  assert.match(block.reason, /abc1234/);
  assert.match(block.reason, /autoverificação/i);
  const again = hookDecision({ block: ['commit de código sem registro: abc1234'], warn: [] }, { stop_hook_active: true });
  assert.equal(again.decision, undefined);
  assert.match(again.hookSpecificOutput.additionalContext, /abc1234/);
  assert.equal(hookDecision({ block: [], warn: [] }, { stop_hook_active: false }), null);
  const warnOnly = hookDecision({ block: [], warn: ['31 min sem registro'] }, { stop_hook_active: false });
  assert.equal(warnOnly.decision, undefined);
  assert.match(warnOnly.hookSpecificOutput.additionalContext, /31 min/);
});
