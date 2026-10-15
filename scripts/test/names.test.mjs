import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, stampedName, checkPath } from '../lib/names.mjs';

test('slug remove acentos, caixa e pontuação', () => {
  assert.equal(slug('Revisão 0.2 da Pesquisa — Custos!'), 'revisao-0-2-da-pesquisa-custos');
  assert.equal(slug('  ação   rápida  '), 'acao-rapida');
  assert.throws(() => stampedName('!!!', { stamp: '2026-10-14T101733-0300' }));
});

test('nome semântico com carimbo de Curitiba', () => {
  assert.equal(
    stampedName('Decisão de licença', { stamp: '2026-10-14T101733-0300', ext: 'md' }),
    '2026-10-14T101733-0300-decisao-de-licenca.md',
  );
});

test('caminhos comuns: ASCII, sem espaço', () => {
  assert.deepEqual(checkPath('docs/30-governanca/metodo.md'), []);
  assert.deepEqual(checkPath('AGENTS.md'), []);
  assert.equal(checkPath('docs/minha nota.md').length, 1);
  assert.equal(checkPath('docs/ação.md').length, 1);
});

test('proveniência é isenta: nomes originais preservados', () => {
  assert.deepEqual(checkPath('docs/00-proveniencia/reports/Harness agnóstico para agentes de IA.md'), []);
});

test('registros datados exigem carimbo', () => {
  assert.deepEqual(checkPath('docs/registros/2026-10-14T101733-0300-mudanca-de-pasta.md'), []);
  assert.equal(checkPath('docs/registros/mudanca-de-pasta.md').length, 1);
  assert.deepEqual(checkPath('docs/registros/README.md'), []);
});

test('diário é um arquivo por dia', () => {
  assert.deepEqual(checkPath('.buddy-dev/diario/2026-10-14.md'), []);
  assert.equal(checkPath('.buddy-dev/diario/hoje.md').length, 1);
});

test('ledger: AAAA/MM/DD/<carimbo>-...json', () => {
  assert.deepEqual(checkPath('.buddy-dev/bus/ledger/2026/10/14/2026-10-14T101733-0300-claude-code-a1b2c3-0001-session-start.json'), []);
  assert.equal(checkPath('.buddy-dev/bus/ledger/2026/10/14/evento.json').length, 1);
});

test('arquivo morto: cada entrada nasce com carimbo', () => {
  assert.deepEqual(checkPath('archive/2026-10-14T101733-0300-spec-reprovada/LAPIDE.md'), []);
  assert.deepEqual(checkPath('archive/changelog/2026-10-14T101733-0300-entradas-0001-0010.md'), []);
  assert.deepEqual(checkPath('archive/README.md'), []);
  assert.equal(checkPath('archive/spec-velha/LAPIDE.md').length, 1);
});
