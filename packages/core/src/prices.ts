// Preços por milhão de tokens, em US$ (ficha docs/20-conhecimento/precos-llm.md, verificada em
// 2026-10-14; reverificar antes de 2026-11-30). Usados para estimar e liquidar o consumo das
// janelas: o OpenCode Go limita em dólares por modelo, e o OpenRouter cobra por token.

export interface Price { input: number; cachedInput: number; cacheWrite: number; output: number }

export const PRICES: Record<string, Price> = {
  'gpt-6-luna': { input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50 },
  // Escrita de cache da Anthropic: 1,25× a entrada (R1, conferido na fonte em 2026-10-14); valor derivado.
  'claude-haiku-5-5': { input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50 },
  'gpt-5-nano': { input: 0.05, cachedInput: 0.005, cacheWrite: 0.05, output: 0.40 },
};
