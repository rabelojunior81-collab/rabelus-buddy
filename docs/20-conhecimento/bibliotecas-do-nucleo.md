# Bibliotecas candidatas do núcleo (CLI, TUI, i18n, provedor)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-15T04:50:26-03:00 · **Estado:** vigente (reverificar versões no início da implementação do M0)

## O que importa para o buddy

- O Node já traz o essencial para a CLI do M0: `node:util` `parseArgs`, `node:readline` e `node:net`. As ferramentas `bd` já vivem sem dependências.
- Para i18n, o **i18next** usa o mesmo formato de catálogo (JSON com sufixos `_one`/`_other`) no Node, no navegador e no React Native. É o que permite um catálogo só para a CLI agora e para o app Expo e a Web depois (ADR 0013).
- Os SDKs oficiais dos dois candidatos a provedor do plano B têm licença compatível com Apache-2.0: `openai` (Apache-2.0) e `@anthropic-ai/sdk` (MIT).

## Fatos verificados

| Pacote | Versão | Licença | Node | Fonte | Verificado em |
|---|---|---|---|---|---|
| `commander` | 15.0.0 | MIT | ≥ 22.12.0 | registro npm (tier 1) | 2026-10-15 |
| `yargs` | 18.2.0 | MIT | ^20.19 ‖ ^22.12 ‖ ≥ 23 | registro npm (tier 1) | 2026-10-15 |
| `citty` | 0.2.2 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `ink` (TUI em React) | 8.0.0 | MIT | ≥ 22 | registro npm (tier 1) | 2026-10-15 |
| `@clack/prompts` | 1.8.1 | MIT | ≥ 20.12.0 | registro npm (tier 1) | 2026-10-15 |
| `i18next` | 26.4.5 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `@formatjs/intl` | 6.1.3 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `messageformat` (MF2) | 4.1.0 | Apache-2.0 | ^20.19 ‖ ^22.12 ‖ ≥ 24 | registro npm (tier 1) | 2026-10-15 |
| `zod` | 4.6.7 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `openai` | 7.34.0 | Apache-2.0 | ≥ 22.0.0 | registro npm (tier 1) | 2026-10-15 |
| `@anthropic-ai/sdk` | 0.134.0 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `@google/genai` | 2.30.0 | Apache-2.0 | ≥ 20.0.0 | registro npm (tier 1) | 2026-10-15 |
| `@opencode-ai/sdk` (M1: cliente do servidor do OpenCode) | 1.19.0 | MIT | — | registro npm (tier 1) | 2026-10-15 |
| `typescript` (só desenvolvimento: `tsc --noEmit`) | 7.0.2 | Apache-2.0 | ≥ 16.20.0 | registro npm (tier 1) | 2026-10-15 |
| `@types/node` (só desenvolvimento) | 24.19.2 (linha 24) | MIT | — | registro npm (tier 1) | 2026-10-15 |

| Fato | Fonte | Verificado em |
|---|---|---|
| i18next: plurais "streamlined with the one used in the Intl API", sufixos `_one`/`_other` (e `_zero`, `_two`, `_few`, `_many`); variável `count` obrigatória; "Since i18next v24 there is no fallback: without Intl only English-style `_one`/`_other` forms resolve"; no React Native a página diz que o Hermes "still does not implement `Intl.PluralRules`" e pede polyfill | https://www.i18next.com/translation-function/plurals (tier 0) | 2026-10-15 |
| MessageFormat 2: "a Unicode standard for localizable dynamic message strings", embutido no ICU4C/ICU4J e "soon" no ECMA-402 | https://messageformat.unicode.org/ (tier 0) | 2026-10-15 |
| OpenAI: cabeçalhos `x-ratelimit-limit-requests`, `-limit-tokens`, `-remaining-requests`, `-remaining-tokens`, `-reset-requests`, `-reset-tokens` (e `-project-tokens` quando há limite por projeto); `Retry-After` nos erros temporários; tiers Free (US$ 100/mês de uso), Build (US$ 5 em créditos; US$ 500/mês), Launch, Grow | https://developers.openai.com/api/docs/guides/rate-limits (tier 0) | 2026-10-15 |
| Preços por 1M tokens (entrada / saída / cache lido): Claude Haiku 5.5 0,10 / 0,50 / 0,01 até 100k (acima: 0,50 / 2,50 / 0,05); GPT-6 Luna 0,10 / 0,50 / 0,01 (escrita de cache 0,125) | [precos-llm.md](./precos-llm.md) (tier 0, 2026-10-14) | 2026-10-14 |

| Fato | Fonte | Verificado em |
|---|---|---|
| Responses API, `ResponseUsage`: `input_tokens`, `input_tokens_details.cached_tokens`, `input_tokens_details.cache_write_tokens`, `output_tokens`, `output_tokens_details.reasoning_tokens`, `total_tokens` | `openai@7.34.0`, `resources/responses/responses.d.ts` (https://unpkg.com/openai@7.34.0/resources/responses/responses.d.ts, tier 1) | 2026-10-15 |
| `max_output_tokens`: "An upper bound for the number of tokens that can be generated for a response, including visible output tokens and reasoning tokens" | idem | 2026-10-15 |
| `store`: "Defaults to true when omitted. If set to true, response data will be stored for at least 30 days" | idem | 2026-10-15 |

## Explicação

Para a CLI, cada dependência é superfície de ataque e de manutenção. O `parseArgs` do Node resolve opções e posicionais; subcomandos são um despacho simples, como no `bd`. O `commander` só se paga se a CLI crescer muito.

Para a TUI, o `ink` usa React, a mesma tecnologia do app escolhido na ADR 0013. Ele faz sentido quando a CLI ganhar telas interativas (lista de aprovações, painel de orçamento). No M0, aprovação é uma pergunta de uma linha, e `node:readline` basta.

Para i18n, o ponto não é a CLI sozinha, e sim o **catálogo compartilhado**. O i18next lê o mesmo JSON no Node, no navegador e no React Native. O MessageFormat 2 é o futuro padrão, mas ainda não está no ECMA-402.

## Implicações

- **SPEC 0001:** CLI com `parseArgs` e despacho próprio; aprovações com `node:readline`; i18next com catálogos em `locales/pt-BR/*.json` e `locales/en/*.json`. `ink` e `@clack/prompts` ficam fora do M0.
- **Privacidade:** toda chamada do núcleo à Responses API leva `store: false`; o padrão guarda a resposta por 30 dias no provedor.
- **Liquidação:** custo = (`input_tokens` − `cached_tokens` − `cache_write_tokens`) × entrada + `cached_tokens` × cache lido + `cache_write_tokens` × escrita de cache + `output_tokens` × saída (o raciocínio já está dentro de `output_tokens`); a reserva usa `max_output_tokens` como teto.
- **Provedor do plano B:** GPT-6 Luna pelo SDK `openai` (mesmo modelo do ChatGPT Plus e do OpenCode Go no M1; sem a faixa cara acima de 100k do Haiku). O Haiku 5.5 fica como alternativa documentada.
- **M5 (Expo):** polyfill de `Intl.PluralRules` no Hermes, se ainda for necessário.

## Histórico de verificações

- 2026-10-15T04:27:18-03:00 · buddy-dev (claude-code-vs-code-438d04) · criação da ficha
- 2026-10-15T04:35:12-03:00 · buddy-dev (claude-code-vs-code-5cfc7b) · campos de `usage`, `max_output_tokens` e `store` verificados nos tipos do SDK 7.34.0
- 2026-10-15T04:50:26-03:00 · buddy-dev (claude-code-vs-code-3a6e29) · SDKs do Google e do OpenCode
