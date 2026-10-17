// Preços por milhão de tokens, em US$ (ficha docs/20-conhecimento/precos-llm.md, verificada em
// 2026-10-14; reverificar antes de 2026-11-30). Usados para estimar e liquidar o consumo das
// janelas: o OpenCode Go limita em dólares por modelo, e o OpenRouter cobra por token.

export interface Price { input: number; cachedInput: number; cacheWrite: number; output: number }

export const PRICES: Record<string, Price> = {
  'gpt-6-luna': { input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50 },
  // Escrita de cache da Anthropic: 1,25× a entrada (R1, conferido na fonte em 2026-10-14); valor derivado.
  'claude-haiku-5-5': { input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50 },
  'gpt-5-nano': { input: 0.05, cachedInput: 0.005, cacheWrite: 0.05, output: 0.40 },
  // Modelos do OpenCode Go: tabela por modelo da página oficial (opencode.ai/docs/go, 2026-10-16), a
  // mesma que mede as janelas em dólares. Sem preço de escrita de cache na página: vale a entrada.
  // DeepSeek V4.1 Flash: preço de pico (o maior; conservador).
  'kimi-k3': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.0, output: 15.0 },
  'glm-5.3': { input: 1.4, cachedInput: 0.26, cacheWrite: 1.4, output: 4.4 },
  'deepseek-v4.1-flash': { input: 0.3, cachedInput: 0.006, cacheWrite: 0.3, output: 1.2 },
  'minimax-m3': { input: 0.3, cachedInput: 0.06, cacheWrite: 0.3, output: 1.2 },
  'qwen3.8-max': { input: 2.0, cachedInput: 0.25, cacheWrite: 2.5, output: 6.0 },
  // GPT 5.6 Luna: sem linha própria na tabela do Go em 2026-10-16; vale a do GPT 6 Luna (mesma faixa de limite).
  'gpt-5.6-luna': { input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50 },
};
