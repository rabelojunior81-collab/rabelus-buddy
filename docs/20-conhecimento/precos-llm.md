# Preços de LLM (Anthropic, OpenAI, Google)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T11:40:00-03:00 · **Estado:** vigente · **Reverificar:** antes de 2026-11-30 (Argon dobra em 1/12) e antes de 2027-01-01 (Gemini 3.8 Flash dobra)

## O que importa para o buddy

Com US$ 50/mês, o uso agêntico diário só cabe na camada barata. Os preços completos e a análise estão na [R1](../10-pesquisa/rev-0.2/r1-custos.md); os dados de entrada do modelo de custo, em [`precos-2026-10-14.json`](../10-pesquisa/rev-0.2/dados/precos-2026-10-14.json).

## Fatos verificados (US$ por milhão de tokens: entrada / saída / leitura de cache)

| Modelo | Preço | Fonte | Verificado em |
|---|---|---|---|
| Claude Haiku 5.5 (≤ 100k) | 0,10 / 0,50 / 0,01 (acima de 100k: 0,50 / 2,50 / 0,05) | platform.claude.com/docs/en/about-claude/pricing | 2026-10-14 |
| Claude Sonnet 5.5 | 2 / 10 / 0,10; escrita de cache 2,50 (5 min) e 4 (1 h) | idem | 2026-10-14 |
| Claude Opus 5.5 | 4 / 20 / 0,20 | idem | 2026-10-14 |
| gpt-5-nano | 0,05 / 0,40 / 0,005 | developers.openai.com/api/docs/pricing | 2026-10-14 |
| gpt-6-luna | 0,10 / 0,50 / 0,01; escrita 0,125 | idem | 2026-10-14 |
| gpt-6.1-sol | 2 / 10 / 0,10; escrita 2,50; sem promoção | idem | 2026-10-14 |
| Gemini 3.5 Flash-Lite | 0,30 / 2,50 / 0,03 | ai.google.dev/gemini-api/docs/pricing | 2026-10-14 |
| Gemini 3.8 Flash | 0,75 / 3,75 / 0,075 até 31/12/2026; o dobro a partir de 1/1/2027 | idem | 2026-10-14 |
| Gemini 4 Argon | 2 / 10 / 0,10 até 30/11/2026; o dobro a partir de 1/12/2026 | idem | 2026-10-14 |
| Tokenizador da Anthropic 4.7+: "approximately 30% more tokens for the same text" (comparado ao anterior da própria Anthropic) | platform.claude.com/docs/en/about-claude/pricing | 2026-10-14 |
| Claude Code: "around $13 per developer per active day and $150-250 per developer per month" (empresas) | code.claude.com/docs/en/costs | 2026-10-14 |

## Histórico de verificações

- 2026-10-14T11:40:00-03:00 · buddy-dev (claude-code-5c038b) · criação da ficha (Revisão 0.2)
