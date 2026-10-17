// Claim antes de editar documento vivo (AGENTS §2 e §3). Até 2026-10-17 era regra sem mecanismo:
// o Pai perguntou "cadê seu bus? cadê a governança?" e o ledger não tinha nenhum claim de documentos editados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkClaims, isLiving } from '../lib/claims.mjs';

const put = (r, files) => { for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(r, p)), { recursive: true }); writeFileSync(join(r, p), c); } };
function commit(r, iso) {
  execFileSync('git', ['add', '-A'], { cwd: r });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'c'], { cwd: r, env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso } });
}
function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-claims-'));
  execFileSync('git', ['init', '-q', '-b', 'main', r]);
  put(r, { '.buddy-dev/STATUS.md': 'a', 'docs/50-planos/m0/PLANO.md': 'a', 'src/x.ts': 'a', '.buddy-dev/CHANGELOG.md': 'a' });
  commit(r, '2026-10-17T10:00:00-03:00');
  execFileSync('git', ['checkout', '-q', '-b', 'feat/x'], { cwd: r });
  return r;
}
const claim = (r, resource, ts, seq = 1) => put(r, { [`.buddy-dev/bus/ledger/2026/10/17/${ts.replace(/[:]/g, '').slice(0, 17)}-s-${String(seq).padStart(4, '0')}-claim.json`]: JSON.stringify({ v: 1, ts, utc: new Date(ts).toISOString(), session: 's', type: 'claim', summary: resource }) });

test('documentos vivos: STATUS, MEMORY, plano, SPEC e TESTES, validações, AGENTS, README e ROADMAP; código e append-only não', () => {
  for (const f of ['.buddy-dev/STATUS.md', '.buddy-dev/MEMORY.md', 'docs/50-planos/m0/PLANO.md', 'docs/40-specs/0001-x/SPEC.md', 'docs/40-specs/0001-x/TESTES.md', 'docs/30-governanca/validacoes.json', 'AGENTS.md', 'README.md', 'README.en.md', 'docs/ROADMAP.md', 'CHANGELOG.md']) assert.ok(isLiving(f), f);
  for (const f of ['src/x.ts', '.buddy-dev/CHANGELOG.md', '.buddy-dev/LEARNING-CURVE.md', '.buddy-dev/diario/2026-10-17.md', 'docs/registros/x/README.md']) assert.equal(isLiving(f), false, f);
});

test('documento vivo alterado na branch sem claim no ledger: reprova; código não exige claim', () => {
  const r = repo();
  put(r, { '.buddy-dev/STATUS.md': 'b', 'src/x.ts': 'b' });
  commit(r, '2026-10-17T11:00:00-03:00');
  const c = checkClaims(r, { base: 'main' });
  assert.deepEqual(c.problems, ['.buddy-dev/STATUS.md alterado sem bd claim nesta branch']);
});

test('claim registrado antes da edição: aprova; edição ainda não commitada também conta', () => {
  const r = repo();
  claim(r, '.buddy-dev/STATUS.md', '2026-10-17T10:30:00-03:00');
  commit(r, '2026-10-17T10:30:00-03:00');
  put(r, { '.buddy-dev/STATUS.md': 'b' });
  commit(r, '2026-10-17T11:00:00-03:00');
  put(r, { 'docs/50-planos/m0/PLANO.md': 'b' }); // na árvore, sem commit
  const c = checkClaims(r, { base: 'main' });
  assert.deepEqual(c.problems, ['docs/50-planos/m0/PLANO.md alterado sem bd claim nesta branch']);
  assert.deepEqual(c.late, []);
});

test('claim depois da primeira edição: não reprova, mas fica declarado como atrasado', () => {
  const r = repo();
  put(r, { '.buddy-dev/STATUS.md': 'b' });
  commit(r, '2026-10-17T11:00:00-03:00');
  claim(r, '.buddy-dev/STATUS.md', '2026-10-17T12:00:00-03:00');
  commit(r, '2026-10-17T12:00:00-03:00');
  const c = checkClaims(r, { base: 'main' });
  assert.deepEqual(c.problems, []);
  assert.deepEqual(c.late, ['.buddy-dev/STATUS.md: claim às 2026-10-17T12:00:00-03:00, depois da primeira edição (2026-10-17T11:00:00-03:00)']);
});
