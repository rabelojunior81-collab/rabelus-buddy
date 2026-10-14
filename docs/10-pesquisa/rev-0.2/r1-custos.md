# R1 — Custos, uso agêntico e preços vigentes

**Revisão:** 0.2 · **Limites tratados:** 1, 2, 3 e 8 · **Autor:** buddy-dev (claude-code-5c038b), com extração por subagente conferida na fonte · **Data:** 2026-10-14

## Resumo

1. **Os preços por token da 0.1 estavam quase todos certos.** Três afirmações estavam erradas e uma enganosa (abaixo).
2. **O orçamento da 0.1 não fecha nem com a premissa dela mesma.** Somando a escrita de cache e o tokenizador que a própria nota 02 documentava, o total vai de US$ 45–47 para **US$ 60,82–62,82/mês**.
3. **A premissa de uso da 0.1 não descreve um agente.** "1.000 interações de 30k tokens" equivale a chamadas isoladas. Um agente de código faz dezenas de chamadas por tarefa, relendo um histórico que cresce. Com uso agêntico, a camada de trabalho no nível Sonnet 5.5 / gpt-6.1-sol / Gemini 4 Argon custa de **US$ 36 a 50/mês no uso leve** e **US$ 147 a 204/mês no uso médio**, mesmo com cache incremental.
4. **US$ 50/mês só comporta uso agêntico diário com modelos da camada barata** (Claude Haiku 5.5 ≤ 100k, gpt-6-luna, gpt-5-nano), com cache incremental e contexto compactado abaixo de 100k tokens.

Isso muda a arquitetura de modelos e exige uma decisão do Pai (fim do documento).

## Correções à 0.1

| Afirmação da 0.1 | Situação em 2026-10-14 | Fonte |
|---|---|---|
| Promoção do gpt-6.1-sol até 21/11/2026 | **Errado.** A promoção é do **gpt-5.6-sol** ("GPT-5.6 Sol's promotional pricing is available at least through November 21, 2026"). O gpt-6.1-sol não tem promoção. | developers.openai.com/api/docs/pricing ✔ |
| Google dobra os preços em janeiro de 2027 | **Parcialmente errado.** O Gemini 4 Argon dobra em **1/12/2026** ("$4.00 starting December 1, 2026"); o 3.8/3.6 Flash dobra em 1/1/2027; o 3.5 Flash-Lite não tem mudança programada. | ai.google.dev/gemini-api/docs/pricing ✔ |
| Escrita de cache da OpenAI a 1,25x | **Parcial.** Só gpt-6.x e gpt-5.6 listam escrita de cache; gpt-5.1 e gpt-5-nano mostram "-". | developers.openai.com/api/docs/pricing ✔ |
| Grounding do Google: 5.000 grátis/mês | Vale para Gemini 3+ e é compartilhado entre eles; **não disponível** na camada gratuita do 3.8/3.6 Flash. | ai.google.dev/gemini-api/docs/pricing |
| "Gemini 3.5 Flash-Lite" (relatório) vs "Gemini 3.8 Flash" (nota 10) | **Os dois existem** e são modelos diferentes: 3.5 Flash-Lite a US$ 0,30/2,50; 3.8 Flash a US$ 0,75/3,75 (até 31/12/2026). A inconsistência era de texto, não de fato. | idem ✔ |
| Tokenizador da Anthropic ~30% mais verboso | **Confirmado**, mas a comparação oficial é com o tokenizador anterior da própria Anthropic, não com outros provedores: "This tokenizer produces approximately 30% more tokens for the same text." | platform.claude.com/docs/en/about-claude/pricing ✔ |
| Escrita de cache Anthropic 1,25x (5 min) e 2x (1 h) | Confirmado; leitura a 0,05x no Sonnet 5.5 e no Opus 5.5. | idem ✔ |

✔ = conferido pelo buddy-dev na fonte; demais itens vêm da extração do subagente com URL.

## A conta da 0.1, corrigida

Mesma premissa da 0.1 (1.000 interações/mês, 30k de contexto, 2k de saída, 80% de acerto de cache, Sonnet 5.5):

| Ajuste | US$/mês |
|---|---:|
| Conta original (24M × 0,10 + 6M × 2 + 2M × 10) | 34,40 |
| \+ os 6M não cacheados pagos como escrita de cache (2,50) | 37,40 |
| \+ tokenizador x1,3 | 48,62 |
| Total com camada barata (Haiku x1,3), busca, VPS e backup da 0.1 | **60,82 a 62,82** |

O limite 1 (orçamento otimista) está **confirmado**. O limite 2 também: o "Opus ≈ US$ 160" da 0.1 é o cenário **sem cache**, comparado com o Sonnet **com cache**.

## Modelo agêntico

`scripts/research/custos.mjs` (com testes) modela uma tarefa como N chamadas com prefixo estável e histórico crescente, em três modos de cache: nenhum, só prefixo, histórico incremental. Entradas em [`dados/precos-2026-10-14.json`](./dados/precos-2026-10-14.json) e [`dados/cenarios-uso.json`](./dados/cenarios-uso.json); tabela completa em [`dados/tabela-custos.md`](./dados/tabela-custos.md).

Cenários (22 dias úteis, sem compactação):

| Cenário | Tarefas/dia | Chamadas/tarefa | Prefixo | Delta/chamada | Saída/chamada | Contexto final |
|---|---:|---:|---:|---:|---:|---:|
| leve | 3 | 20 | 20k | 3k | 1,5k | 77k |
| médio | 6 | 30 | 25k | 4k | 2k | 141k |
| pesado | 10 | 40 | 30k | 5k | 3k | 225k |

**Calibração:** o cenário médio no Sonnet 5.5 com cache incremental dá US$ 7,12 por dia útil. A referência oficial do Claude Code é "around $13 per developer per active day and $150-250 per developer per month" (code.claude.com/docs/en/costs ✔), com mistura de modelos. O modelo fica **abaixo** da referência, ou seja, é conservador para baixo.

### Custo mensal com cache incremental (US$)

| Modelo | leve | médio | pesado |
|---|---:|---:|---:|
| gpt-5-nano | 1,34 | 5,65 | 18,40 |
| Claude Haiku 5.5 (≤ 100k) · gpt-6-luna | 2,21 | 9,39 | 30,11 |
| Gemini 3.5 Flash-Lite | 8,24 | 34,69 | 113,03 |
| Gemini 3.8 Flash (até 31/12/2026) | 15,66 | 66,91 | 216,56 |
| gpt-5.1 | 33,52 | 141,22 | 459,94 |
| Gemini 4 Argon (até 30/11/2026) | 35,86 | 147,43 | 470,25 |
| Claude Sonnet 5.5 · gpt-6.1-sol | 38,40 | 156,74 | 495,00 |
| Claude Sonnet 5.5 (sensibilidade x1,3) | 49,92 | 203,76 | 643,50 |
| Claude Opus 5.5 | 76,80 | 313,47 | 990,00 |

Atenção a dois limites do modelo:
- O Haiku 5.5 cobra o pedido inteiro a US$ 0,50/2,50 acima de 100k tokens; os cenários médio e pesado passam disso sem compactação (ver a linha "> 100k" na tabela completa).
- Thinking é cobrado como saída e não pode ser desligado nos modelos 5.5 da Anthropic (code.claude.com/docs/en/costs ✔); a saída dos cenários já tenta incluí-lo, mas o volume real precisa de medição.

## O que muda na arquitetura (recomendação)

1. **Camada de trabalho padrão = camada barata.** Haiku 5.5, gpt-6-luna ou gpt-5-nano, com cache incremental obrigatório e **compactação de contexto abaixo de 100k** como requisito do núcleo, não otimização.
2. **Modelos de nível Sonnet/Sol/Argon só por escalonamento:** a tarefa sobe de camada por decisão explícita (do usuário ou de regra de orçamento), com o custo estimado antes.
3. **Orçamento como recurso atômico** (R5, requisito 6), com estimativa por tarefa a partir deste modelo e medição real ao fim de cada tarefa.
4. **Hipótese a verificar:** agentes externos via ACP (Claude Code, Codex, OpenCode) podem rodar sob a **assinatura** do usuário em vez de pagar por token, deslocando o custo da camada de trabalho para fora dos US$ 50. Termos de uso, limites e o que é permitido para uso pessoal precisam ser lidos na fonte antes de qualquer decisão. **HIPÓTESE.**

## Decisão do Pai (bloqueia a SPEC do M0)

Escolher uma:

- **A.** Manter US$ 50/mês e aceitar a camada barata como padrão, com escalonamento raro e aprovado.
- **B.** Elevar o orçamento (o uso médio no nível Sonnet custa cerca de US$ 150–200/mês só de API).
- **C.** Manter US$ 50 para a API e investigar o caminho por assinatura via ACP (hipótese 4) antes de decidir.

## Estado dos limites

| Limite | Estado |
|---|---|
| 1 — orçamento otimista | **Resolvido:** confirmado e recalculado |
| 2 — comparação Opus distorcida | **Resolvido:** comparação refeita no mesmo modo de cache |
| 3 — uso subestimado | **Resolvido no modelo; aberto na medição.** Os cenários são estimativa calibrada contra um dado oficial; números reais virão do próprio buddy em uso |
| 8 — inconsistências de nomes de modelos | **Resolvido:** os dois modelos existem; texto da 0.1 estava incompleto |
