import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskTokens, taskCost, monthlyCost } from '../research/custos.mjs';

// Preço fictício e redondo, para conferir a aritmética à mão.
const P = { input: 1, output: 10, cacheRead: 0.1, cacheWrite: 1.25, tokenizerFactor: 1 };

test('sem cache: cada chamada relê o prefixo e todo o histórico', () => {
  // prefixo 1000, cada chamada acrescenta 100 ao histórico e gera 50 de saída; 3 chamadas
  const t = taskTokens({ prefix: 1000, deltaPerCall: 100, outputPerCall: 50, calls: 3 }, 'none');
  // entradas: 1000, 1100, 1200
  assert.deepEqual(t, { input: 3300, cacheRead: 0, cacheWrite: 0, output: 150 });
});

test('cache de prefixo: escreve o prefixo uma vez e lê nas chamadas seguintes', () => {
  const t = taskTokens({ prefix: 1000, deltaPerCall: 100, outputPerCall: 50, calls: 3 }, 'prefix');
  // chamada 1: escreve 1000, lê 0, entrada nova 0; chamadas 2 e 3: lê 1000, entrada nova 100 e 200
  assert.deepEqual(t, { input: 300, cacheRead: 2000, cacheWrite: 1000, output: 150 });
});

test('cache de histórico: lê tudo o que já foi visto e escreve só o que é novo', () => {
  const t = taskTokens({ prefix: 1000, deltaPerCall: 100, outputPerCall: 50, calls: 3 }, 'history');
  // chamada 1: escreve 1000; chamada 2: lê 1000, escreve 100; chamada 3: lê 1100, escreve 100
  assert.deepEqual(t, { input: 0, cacheRead: 2100, cacheWrite: 1200, output: 150 });
});

test('custo em US$ por milhão de tokens e fator de tokenizador', () => {
  const tokens = { input: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000, output: 1_000_000 };
  assert.equal(taskCost(tokens, P), 1 + 0.1 + 1.25 + 10);
  assert.equal(taskCost(tokens, { ...P, tokenizerFactor: 1.3 }), (1 + 0.1 + 1.25 + 10) * 1.3);
});

test('custo mensal = tarefas por dia × dias × custo por tarefa', () => {
  const shape = { prefix: 1_000_000, deltaPerCall: 0, outputPerCall: 0, calls: 1 };
  const m = monthlyCost({ shape, tasksPerDay: 2, days: 22, mode: 'none' }, P);
  assert.equal(m, 44);
});
