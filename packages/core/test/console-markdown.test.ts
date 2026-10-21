// Missão B1 (console): a resposta com markdown desenha tabela, citação e linha horizontal, e o link só vai para
// http(s). As funções vêm da própria página, avaliadas sem navegador: `mdBlocks` (entre `// <puras>` e `// </puras>`)
// e `inline` (logo depois, com um DOM mínimo que guarda a árvore para conferir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');

type Node = { tag?: string; attrs?: Record<string, string>; kids?: unknown[]; text?: string };
type Markdown = { mdBlocks: (s: string) => unknown[]; inline: (s: string) => { nodes: Node[] } };

function loaded(): Markdown {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  assert.ok(a > 0 && b > a, 'marcadores das funções puras');
  const i = PAGE.indexOf('function inline(');
  const j = PAGE.indexOf('function rich(');
  assert.ok(i > b && j > i, 'inline fica depois das puras');
  // DOM mínimo: el() vira um objeto e o fragmento guarda os nós em ordem.
  const mock = `const el = (tag, attrs, ...kids) => ({ tag, attrs: attrs || {}, kids });
const document = { createDocumentFragment() { const n = []; return { nodes: n, append(...x) { n.push(...x); } }; }, createTextNode(s) { return { text: s }; } };`;
  return new Function(`${mock}\n${PAGE.slice(a, b)}\n${PAGE.slice(i, j)}\nreturn { mdBlocks, inline };`)() as Markdown;
}

const textOf = (nodes: Node[]) => nodes.map((n) => n.text ?? '').join('');

test('tabela em markdown vira bloco de tabela, com alinhamento por coluna (missão B1)', () => {
  const { mdBlocks } = loaded();
  const md = '| Ferramenta | Para quê | Custo |\n|:---|:---:|---:|\n| buscar | pesquisar na web | 0 |\n| ler | abrir arquivos | 0 |';
  assert.deepEqual(mdBlocks(md), [{
    type: 'table',
    head: ['Ferramenta', 'Para quê', 'Custo'],
    align: ['left', 'center', 'right'],
    rows: [['buscar', 'pesquisar na web', '0'], ['ler', 'abrir arquivos', '0']],
  }]);
});

test('tabela sem barras nas pontas, células aparadas e linha curta completada com vazio', () => {
  const { mdBlocks } = loaded();
  assert.deepEqual(mdBlocks('Nome | Valor\n--- | ---\n  x  |  1  \ny |'), [{
    type: 'table',
    head: ['Nome', 'Valor'],
    align: [null, null],
    rows: [['x', '1'], ['y', '']],
  }]);
});

test('dentro de bloco de código cercado, tabela, citação e linha horizontal não são interpretadas (missão B1)', () => {
  const { mdBlocks } = loaded();
  assert.deepEqual(mdBlocks('```md\n| a | b |\n|---|---|\n> x\n---\n```'), [{ type: 'code', lang: 'md', text: '| a | b |\n|---|---|\n> x\n---' }]);
});

test('citação de duas linhas vira um bloco de citação (missão B1)', () => {
  const { mdBlocks } = loaded();
  assert.deepEqual(mdBlocks('> primeira linha\n> segunda linha'), [{ type: 'quote', text: 'primeira linha\nsegunda linha' }]);
});

test('linha horizontal com ---, *** ou ___, e a lista depois dela começa outra lista (missão B1)', () => {
  const { mdBlocks } = loaded();
  assert.deepEqual(mdBlocks('antes\n---\ndepois'), [{ type: 'p', text: 'antes' }, { type: 'hr' }, { type: 'p', text: 'depois' }]);
  assert.deepEqual(mdBlocks('***'), [{ type: 'hr' }]);
  assert.deepEqual(mdBlocks('___'), [{ type: 'hr' }]);
  assert.deepEqual(mdBlocks('- a\n---\n- b'), [
    { type: 'list', ordered: false, items: ['a'] },
    { type: 'hr' },
    { type: 'list', ordered: false, items: ['b'] },
  ]);
});

test('link http(s) vira âncora segura; javascript:, data: e outros esquemas ficam como texto (missão B1)', () => {
  const { inline } = loaded();
  const nodes = inline('veja [a doc](https://exemplo.org/doc) agora').nodes;
  const a = nodes.find((n) => n.tag === 'a');
  assert.ok(a, 'há uma âncora');
  assert.equal(a.attrs!.href, 'https://exemplo.org/doc');
  assert.equal(a.attrs!.target, '_blank');
  assert.equal(a.attrs!.rel, 'noopener noreferrer');
  assert.deepEqual(a.kids, ['a doc']);
  assert.deepEqual(nodes.filter((n) => n.text !== undefined).map((n) => n.text), ['veja ', ' agora'], 'o resto do texto continua');
  for (const bad of ['[x](javascript:alert(1))', '[x](JavaScript:alert(1))', '[x](data:text/html,oi)']) {
    const ns = inline(bad).nodes;
    assert.equal(ns.some((n) => n.tag === 'a'), false, `sem âncora para ${bad}`);
    assert.equal(textOf(ns), bad, `${bad} fica como texto`);
  }
});

test('página: tabela, citação e linha horizontal desenhadas com el(), com CSS próprio (missão B1)', () => {
  // CSS: rolagem horizontal da tabela, bordas finas, cabeçalho discreto; citação com filete oliva; linha horizontal fina.
  assert.match(PAGE, /\.tbl\s*\{[^}]*overflow-x:\s*auto/, '.tbl com rolagem horizontal');
  assert.match(PAGE, /\.tbl table\s*\{[^}]*border-collapse:\s*collapse/, 'tabela com border-collapse');
  assert.match(PAGE, /\.bubble blockquote\s*\{[^}]*border-left:\s*2px solid var\(--olive-400\)/, 'citação com filete oliva');
  assert.match(PAGE, /\.bubble hr\s*\{[^}]*var\(--hair\)/, 'linha horizontal fina');
  // rich desenha os tipos novos e não usa innerHTML com o texto.
  const rich = PAGE.slice(PAGE.indexOf('function rich('), PAGE.indexOf('\nasync function api('));
  assert.match(rich, /b\.type === 'table'/, 'rich trata a tabela');
  assert.match(rich, /b\.type === 'quote'/, 'rich trata a citação');
  assert.match(rich, /b\.type === 'hr'/, 'rich trata a linha horizontal');
  assert.match(rich, /class: 'tbl'/, 'a tabela fica em div.tbl');
  assert.match(rich, /text-align:/, 'o alinhamento vai em style');
  assert.doesNotMatch(rich, /innerHTML/, 'nada do modelo vira HTML');
});

test('código dentro do negrito vira elemento code, não crase crua (missão C2)', () => {
  const { inline } = loaded();
  const ns = inline('**`x`**').nodes;
  assert.equal(ns.length, 1);
  assert.equal(ns[0]!.tag, 'strong');
  assert.equal(ns[0]!.kids!.length, 1);
  const c = ns[0]!.kids![0] as Node;
  assert.equal(c.tag, 'code');
  assert.deepEqual(c.kids, ['x']);
});

test('link dentro do negrito vira âncora dentro do strong (missão C2)', () => {
  const { inline } = loaded();
  const ns = inline('**negrito com [link](https://a.b)**').nodes;
  assert.equal(ns.length, 1);
  assert.equal(ns[0]!.tag, 'strong');
  const a = (ns[0]!.kids as Node[]).find((k) => k.tag === 'a');
  assert.ok(a, 'há uma âncora dentro do negrito');
  assert.equal(a.attrs!.href, 'https://a.b');
  assert.deepEqual(a.kids, ['link']);
});

test('negrito simples continua como strong com o mesmo texto (missão C2)', () => {
  const { inline } = loaded();
  const ns = inline('**simples**').nodes;
  assert.equal(ns.length, 1);
  assert.equal(ns[0]!.tag, 'strong');
  const kids = ns[0]!.kids as unknown[];
  assert.equal(kids.map((k) => (typeof k === 'string' ? k : (k as Node).text)).join(''), 'simples');
});
