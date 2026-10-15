// Modelo de custo de um agente de código, reproduzível.
// Uma tarefa = N chamadas ao modelo. Cada chamada relê o prefixo estável
// (sistema + ferramentas) e todo o histórico acumulado; cada chamada acrescenta
// `deltaPerCall` tokens ao histórico (resultados de ferramenta, mensagens) e gera
// `outputPerCall` tokens de saída.
//
// Modos de cache:
//   none    — nada em cache: toda entrada é paga a preço cheio.
//   prefix  — só o prefixo é cacheado (escrito na 1ª chamada, lido nas demais).
//   history — cache incremental: lê tudo que já foi visto, escreve só o novo.
//
// Preços em US$ por milhão de tokens. `tokenizerFactor` multiplica todos os
// tokens (ex.: tokenizador mais verboso de um provedor).
//
// Uso: node scripts/research/custos.mjs <precos.json> <cenarios.json>

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function taskTokens({ prefix, deltaPerCall, outputPerCall, calls }, mode) {
  const t = { input: 0, cacheRead: 0, cacheWrite: 0, output: outputPerCall * calls };
  for (let i = 0; i < calls; i++) {
    const history = i * deltaPerCall;
    if (mode === 'none') {
      t.input += prefix + history;
    } else if (mode === 'prefix') {
      if (i === 0) t.cacheWrite += prefix;
      else t.cacheRead += prefix;
      t.input += history;
    } else if (mode === 'history') {
      if (i === 0) {
        t.cacheWrite += prefix;
      } else {
        t.cacheRead += prefix + (i - 1) * deltaPerCall;
        t.cacheWrite += deltaPerCall;
      }
    } else {
      throw new Error(`modo de cache desconhecido: ${mode}`);
    }
  }
  return t;
}

export function taskCost(tokens, price) {
  const f = price.tokenizerFactor ?? 1;
  const usd =
    tokens.input * price.input +
    tokens.cacheRead * (price.cacheRead ?? price.input) +
    tokens.cacheWrite * (price.cacheWrite ?? price.input) +
    tokens.output * price.output;
  return (usd * f) / 1_000_000;
}

export function monthlyCost({ shape, tasksPerDay, days, mode }, price) {
  return taskCost(taskTokens(shape, mode), price) * tasksPerDay * days;
}

// CLI: tabela markdown de custo mensal por modelo × cenário × modo de cache.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pricesFile, scenariosFile] = process.argv.slice(2);
  if (!pricesFile || !scenariosFile) {
    console.error('uso: node scripts/research/custos.mjs <precos.json> <cenarios.json>');
    process.exit(1);
  }
  const prices = JSON.parse(readFileSync(pricesFile, 'utf8'));
  const { scenarios, modes } = JSON.parse(readFileSync(scenariosFile, 'utf8'));
  const fmt = (n) => n.toFixed(2);
  console.log(`| Modelo | Cenário | ${modes.map((m) => `cache: ${m}`).join(' | ')} |`);
  console.log(`|---|---|${modes.map(() => '---:').join('|')}|`);
  for (const [model, price] of Object.entries(prices.models)) {
    for (const s of scenarios) {
      const cells = modes.map((m) => fmt(monthlyCost({ ...s, mode: m }, price)));
      console.log(`| ${model} | ${s.name} | ${cells.join(' | ')} |`);
    }
  }
}
