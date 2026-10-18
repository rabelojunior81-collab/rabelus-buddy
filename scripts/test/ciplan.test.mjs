// Plano da CI (2026-10-18, pedido do Pai depois de a cota de minutos do GitHub acabar): o que roda em cada evento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ciPlan, FULL_MATRIX, isCode } from '../lib/ciplan.mjs';

const oses = (p) => p.matriz.map((m) => `${m.os}/${m.node}`).sort();

test('ci-plan: o que conta como código', () => {
  for (const f of ['packages/core/src/agent.ts', 'scripts/bd.mjs', 'locales/pt-BR/console.json', 'package.json', 'package-lock.json', 'tsconfig.json', '.github/workflows/ci.yml']) assert.equal(isCode(f), true, f);
  for (const f of ['README.md', 'docs/40-specs/0002-orquestrador-e-multimodal/SPEC.md', '.buddy-dev/STATUS.md', '.buddy-dev/bus/ledger/x.json', 'archive/changelog/a.md', 'CHANGELOG.md']) assert.equal(isCode(f), false, f);
});

test('ci-plan: PR com código roda Linux 26 e Windows 26 (Linux 24 já roda nas regras); sem macOS', () => {
  const p = ciPlan({ event: 'pull_request', changed: ['packages/core/src/console.ts', 'README.md'] });
  assert.equal(p.codigo, true);
  assert.deepEqual(oses(p), ['ubuntu-latest/26', 'windows-latest/26']);
});

test('ci-plan: merge na main com código roda só o macOS (o resto o PR já testou no mesmo resultado de merge)', () => {
  const p = ciPlan({ event: 'push', changed: ['scripts/lib/surfaces.mjs'] });
  assert.equal(p.codigo, true);
  assert.deepEqual(oses(p), ['macos-latest/26']);
});

test('ci-plan: só documentação não roda matriz nem suíte, em PR ou na main', () => {
  for (const event of ['pull_request', 'push']) {
    const p = ciPlan({ event, changed: ['docs/registros/x/README.md', '.buddy-dev/STATUS.md'] });
    assert.equal(p.codigo, false, event);
    assert.deepEqual(p.matriz, [], event);
  }
});

test('ci-plan: semanal e manual rodam a matriz completa; sem saber o que mudou, trata como código', () => {
  for (const event of ['schedule', 'workflow_dispatch']) assert.deepEqual(oses(ciPlan({ event, changed: [] })), oses({ matriz: FULL_MATRIX }), event);
  assert.equal(FULL_MATRIX.length, 6);
  const unknown = ciPlan({ event: 'pull_request', changed: null });
  assert.equal(unknown.codigo, true);
  assert.equal(unknown.matriz.length, 2);
});
