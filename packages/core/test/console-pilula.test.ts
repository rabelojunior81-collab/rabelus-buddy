// Achado do ensaio (2026-10-20): depois que o Pai responde no cartão a primeira execução de um harness, a pílula do
// harness continuava com "AGUARDA APROVAÇÃO" até escolher o harness de novo, e a mensagem "Pedido de aprovação refeito"
// ficava na tela. Agora a resposta refaz a sonda daquele harness e a pílula mostra o estado novo (B4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');

// Funções puras da página (mesmo trecho que os outros testes da console avaliam).
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

test('firstRunHarnessOf: ação de primeira execução devolve o id do harness pelo nome (B4)', () => {
  const { firstRunHarnessOf } = pure<{ firstRunHarnessOf: (action: string, list: { id: string; name: string }[]) => string | null }>(['firstRunHarnessOf']);
  const list = [{ id: 'claude-acp', name: 'Claude Agent' }];
  assert.equal(firstRunHarnessOf('Primeira execução de Claude Agent: baixar e executar @x (npx). Aprovar vale só para esta versão.', list), 'claude-acp');
  assert.equal(firstRunHarnessOf('Harness OpenCode: write_file a.txt', [{ id: 'opencode', name: 'OpenCode' }]), null, 'ação de harness comum não é primeira execução');
  assert.equal(firstRunHarnessOf('Primeira execução de Desconhecido: baixar e executar @y (npx). Aprovar vale só para esta versão.', list), null, 'nome que não está na lista');
});

test('página: ao responder o cartão, o código refaz a sonda do harness da primeira execução (B4)', () => {
  const start = PAGE.indexOf('async function resolve(id, decision');
  assert.ok(start > 0, 'a função resolve existe');
  const end = PAGE.indexOf('\nfunction sourceText', start);
  const body = PAGE.slice(start, end);
  assert.ok(body.includes('approval.resolve'), 'resolve chama approval.resolve');
  assert.ok(body.includes('firstRunHarnessOf('), 'resolve reconhece a primeira execução');
  assert.ok(body.includes("api('harness.probe', { id"), 'resolve refaz a sonda do harness');
});
