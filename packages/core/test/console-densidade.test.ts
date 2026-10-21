// Densidade da console (Pai, 2026-10-20: "o seletor ocupa a tela inteira"; "diminuir esse tamanho todo"): os painéis
// flutuantes não passam de metade da altura da janela nem de 360 px, e o texto base é compacto. Trava contra regressão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(process.env.RBUDDY_PAGE_FILE ?? join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const escape = (s: string) => s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
const rule = (sel: string): string => {
  const m = new RegExp('\\n\\s*' + escape(sel) + ' \\{([^}]*)\\}').exec(PAGE);
  assert.ok(m, 'regra ' + sel);
  return m[1]!;
};
const px = (decl: string, prop: string) => Number(new RegExp(prop + ':\\s*([\\d.]+)px').exec(decl)?.[1] ?? NaN);

test('painéis flutuantes (seletor de modelo e de harness): no máximo 360 px e metade da altura da janela', () => {
  for (const sel of ['.pop', '.mpop']) {
    const d = rule(sel);
    const m = /max-height:\s*min\(\s*(\d+)px\s*,\s*(\d+)vh\s*\)/.exec(d);
    assert.ok(m, sel + ': max-height com min(px, vh)');
    assert.ok(Number(m[1]) <= 360, sel + ': ' + m[1] + ' px');
    assert.ok(Number(m[2]) <= 52, sel + ': ' + m[2] + ' vh');
    assert.ok(px(d, 'width') <= 340, sel + ': largura ' + px(d, 'width') + ' px');
  }
});

test('texto base, linhas do seletor e controles compactos', () => {
  assert.match(rule('body'), /font: 13px\//);
  assert.ok(px(rule('.mrow'), 'gap') <= 8);
  assert.match(rule('.mrow'), /padding: 4px 8px/);
  assert.ok(px(rule('.pill'), 'height') <= 24);
  assert.ok(px(rule('h1'), 'font-size') <= 26);
});
