// Modelo gratuito sinalizado (achado do Pai em 2026-10-21: entregas ruins do minimax-m3.1-flash-free no OpenCode Go;
// em 2026-10-20 o mesmo modelo travava a conversa). No seletor de Modelo do agente, o modelo gratuito leva a marca
// "gratuito", e, com um deles escolhido, a caixa avisa que ele pode demorar, ficar mudo ou entregar menos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const line = PAGE.split('\n').find((l) => l.startsWith('const isFreeModel')) ?? '';
const isFreeModel = line ? (new Function(`${line}; return isFreeModel;`))() as (v: { value: string; name: string }) => boolean : () => false;

test('reconhece os gratuitos pelo valor ou pelo nome, sem pegar os pagos', () => {
  assert.ok(line, 'a página define isFreeModel');
  assert.equal(isFreeModel({ value: 'opencode-go/minimax-m3.1-flash-free', name: 'MiniMax M3.1 Flash Free' }), true);
  assert.equal(isFreeModel({ value: 'openrouter/qwen/qwen3-coder:free', name: 'Qwen3 Coder' }), true);
  assert.equal(isFreeModel({ value: 'x/modelo', name: 'Modelo (free)' }), true);
  assert.equal(isFreeModel({ value: 'opencode-go/kimi-k3', name: 'Kimi K3' }), false);
  assert.equal(isFreeModel({ value: 'opencode-go/minimax-m3.1-flash', name: 'MiniMax M3.1 Flash' }), false);
  assert.equal(isFreeModel({ value: 'acme/freedom-7b', name: 'Freedom 7B' }), false, '"free" só como palavra');
});

test('a lista marca o gratuito e a caixa avisa quando ele está escolhido, pelo catálogo nas duas línguas', () => {
  assert.ok(PAGE.includes("t('console.hopts.free')"), 'marca na lista');
  assert.ok(PAGE.includes("t('console.hopts.freeWarn', { name: mv.name })"), 'aviso na caixa, com o nome do modelo');
  assert.ok(PAGE.includes('id="freeWarn"'));
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8'));
    assert.ok(cat.console.hopts.free && cat.console.hopts.freeWarn, lang);
  }
});
