// B2 (console): motivos em linguagem comum. A política manda o motivo em português ("fora do workspace"); a tela traduz
// pelo catálogo e, quando não conhece, mostra o texto cru. A parada de execução não mostra o id da execução no texto
// visível (o id fica no atributo title). Todo motivo que a página devolve tem frase nos dois catálogos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const LOCALES = join(import.meta.dirname, '..', '..', '..', 'locales');

// Funções puras da página (mesmo jeito de console-harness.test.ts).
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

function catalogo(lang: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALES, lang, 'console.json'), 'utf8')) as Record<string, unknown>;
}
function busca(cat: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), cat);
}

test('motivos da política viram a chave do catálogo; desconhecido vira null (B2)', () => {
  const { reasonKey } = pure<{ reasonKey: (r: unknown) => string | null }>(['reasonKey']);
  assert.equal(reasonKey('fora do workspace'), 'console.reason.outsideWorkspace');
  assert.equal(reasonKey('caminho protegido'), 'console.reason.protectedPath');
  assert.equal(reasonKey('aprovação humana'), 'console.reason.human');
  assert.equal(reasonKey('regra'), 'console.reason.rule');
  assert.equal(reasonKey('padrão'), 'console.reason.default');
  assert.equal(reasonKey('nonInteractive'), 'console.reason.nonInteractive');
  assert.equal(reasonKey('sessionPaused'), 'console.reason.sessionPaused');
  assert.equal(reasonKey('concessão leitura'), 'console.reason.grant');
  assert.equal(reasonKey('concessão escrita no workspace'), 'console.reason.grant');
  assert.equal(reasonKey('motivo que ninguém conhece'), null, 'desconhecido continua cru');
  assert.equal(reasonKey(''), null);
  assert.equal(reasonKey(undefined), null);
});

test('toda chave devolvida por reasonKey existe nos dois catálogos (B2)', () => {
  const { reasonKey } = pure<{ reasonKey: (r: unknown) => string | null }>(['reasonKey']);
  const motivos = ['fora do workspace', 'caminho protegido', 'aprovação humana', 'regra', 'padrão', 'nonInteractive', 'sessionPaused', 'concessão leitura'];
  for (const lang of ['pt-BR', 'en']) {
    const cat = catalogo(lang);
    for (const m of motivos) {
      const key = reasonKey(m);
      assert.ok(key, `${m} tem chave`);
      assert.equal(typeof busca(cat, key!), 'string', `${lang}: ${key}`);
    }
  }
});

test('toda parada conhecida tem frase nos dois catálogos (B2)', () => {
  const { REASONS } = pure<{ REASONS: Record<string, string> }>(['REASONS']);
  const codigos = ['userStopped', 'permissionDenied', 'harnessCancelled', 'harnessFailed', 'needsLogin', 'noVisionRoute', 'maxSteps',
    'budget.windowExhausted', 'provider.unavailable', 'provider.emptyResponse', 'attachmentMissing', 'internalError', 'effect.unknown',
    'sessionPaused', 'needsReconciliation'];
  for (const lang of ['pt-BR', 'en']) {
    const cat = catalogo(lang);
    for (const c of codigos) {
      assert.ok(REASONS[c], `motivo ${c} mapeado`);
      assert.equal(typeof busca(cat, REASONS[c]!), 'string', `${lang}: ${c} → ${REASONS[c]}`);
    }
  }
});

test('a parada de execução mostra o motivo, não o id da execução no texto visível (B2)', () => {
  // O padrão antigo: a frase levava o id da execução ("execução run-… parada: …").
  assert.doesNotMatch(PAGE, /t\('log\.runStopped', \{ run: p\.run/, 'sem o id no texto da parada');
  assert.match(PAGE, /case 'run\.stopped': speak\(el\('div', \{ class: 'ev err', title: p\.run/, 'o id fica no título');
  assert.match(PAGE, /t\('console\.runStopped', \{ reason:/, 'a frase vem do catálogo da console');
  for (const lang of ['pt-BR', 'en']) {
    const cat = catalogo(lang);
    const frase = busca(cat, 'console.runStopped');
    assert.equal(typeof frase, 'string', `${lang}: console.runStopped`);
    assert.doesNotMatch(String(frase), /\{\{run\}\}/, `${lang}: sem variável de execução`);
  }
});

test('o motivo da permissão negada passa pela tradução (B2)', () => {
  assert.match(PAGE, /const text = byPolicy \? t\('console\.harness\.deniedByPolicy', \{ reason: reasonKey\(p\.reason\) \? t\(reasonKey\(p\.reason\)\) : p\.reason/, 'motivo traduzido ou cru');
});
