# Revisão 0.2 da pesquisa — relatório

**Data de corte:** 2026-10-14 · **Autor:** buddy-dev (claude-code-5c038b), com cinco subagentes de extração conferidos por amostragem na fonte · **Base:** pesquisa 0.1 em [`docs/00-proveniencia/`](../../00-proveniencia/) (Claude Haiku 5.5 via OpenCode), que não foi alterada.
**Estado:** proposta — aguarda aceite do Pai.

## Em uma página

A 0.1 acertou a maior parte dos fatos e a direção geral: núcleo próprio, protocolos abertos, SQLite, aprovação humana. Errou em quatro pontos, e eles mudam o plano:

1. **O dinheiro não fecha.** Com a premissa da própria 0.1 corrigida, o custo vai a **US$ 60,82–62,82/mês**. Com uso agêntico realista, a camada de trabalho no nível Sonnet custa **US$ 38–50/mês no uso leve** e **≈ US$ 157–204 no médio**. Com US$ 50, a camada padrão precisa ser a barata (Haiku 5.5, gpt-6-luna, gpt-5-nano), com cache incremental e contexto abaixo de 100k. → [R1](./r1-custos.md)
2. **O escopo não cabe em uma pessoa se for reimplementado.** O projeto aberto mais próximo do "multi-tudo" tem 4.504 contribuidores. Mas há gateways multicanal MIT prontos (OpenClaw, inclusive com Buzz) e agentes plugáveis por ACP. **Núcleo governado próprio + composição** torna o escopo completo alcançável. → [R4](./r4-esforco-e-escopo.md)
3. **Aprovação por chamada derrota a si mesma.** Usuários aprovam 93% dos prompts e param de ler. A decisão humana deve ficar na integração do worktree e na política da sessão, com escopos e "negação vence". → [R3](./r3-aprovacoes.md)
4. **Concorrência é fundação.** Seis frentes de concorrência e oito requisitos testáveis entram na SPEC do M0. → [R5](./r5-concorrencia.md)

E dois pontos resolvidos sem mudar o plano:
- **Sandbox em três sistemas:** Seatbelt (macOS) + bubblewrap (Linux), sem VM; o Windows nativo é risco declarado, com spike. → [R2](./r2-sandbox.md)
- **Nome:** "Rabelus Buddy" é o caminho certo; o binário da CLI não deve ser `buddy`. → [R6](./r6-nome.md)

## Os 9 limites da 0.1

| # | Limite | Estado | Onde |
|---|---|---|---|
| 1 | Orçamento otimista | **Resolvido** — confirmado e recalculado | R1 |
| 2 | Comparação Opus distorcida | **Resolvido** | R1 |
| 3 | Uso subestimado | **Resolvido no modelo**; medição real a partir do M0 | R1 |
| 4 | Sandbox só Windows | **Resolvido na pesquisa**; spike antes do M2 | R2 |
| 5 | Fadiga de aprovação | **Resolvido na pesquisa**, condicionado à decisão do Pai | R3 |
| 6 | Esforço não estimado | **Parcial** — ordem de grandeza e estratégia; sem horas | R4 |
| 7 | Concorrência periférica | **Resolvido** — requisitos fundacionais | R5 |
| 8 | Inconsistências de texto e nomes | **Resolvido** — os dois modelos Gemini existem; 3 afirmações de preço corrigidas | R1 |
| 9 | Colisão de nome | **Parcial** — mitigado; busca oficial de marca é manual | R6 |

## Correções factuais à 0.1

- Promoção até 21/11/2026 é do **gpt-5.6-sol**, não do gpt-6.1-sol.
- Gemini 4 Argon dobra de preço em **1/12/2026**; 3.8 Flash em 1/1/2027; 3.5 Flash-Lite sem mudança programada.
- Escrita de cache da OpenAI (1,25x) só existe em gpt-6.x e gpt-5.6.
- Docker Desktop exige 8 GB **só no Windows** (4 GB no macOS e no Linux).
- Hermes Agent está na **v0.22.0**; DeepSeek Harness é **MIT**; goose mudou para `aaif-goose/goose`.

## Decisões do Pai (bloqueiam a F0.8)

1. **Orçamento** (R1): A) manter US$ 50 com camada barata como padrão; B) elevar o orçamento; C) manter US$ 50 e investigar uso por assinatura via ACP antes.
2. **Aprovações** (R3): aceitar a releitura de "criar/alterar arquivos" (aprovação na integração do worktree) e de "executar comandos" (livre dentro do sandbox e do workspace)?
3. **Estratégia** (R4): aceitar "núcleo governado + composição" e a reordenação M0–M5?
4. **Nome do binário** (R6): `rbuddy`, `rabelus-buddy` ou outro?
5. **Pendências antigas do briefing** que seguem abertas: países dos canais; pesquisa na web exige aprovação (proposta: tratar como rede); identidade e permissões no Buzz; stack mobile.

## Método

- Cinco subagentes extraíram fatos com URL e data (R1, R2, R3, R4, R6); o buddy-dev conferiu amostras de cada um diretamente na fonte (marcadas ✔ nas notas). Nenhuma divergência encontrada nas amostras.
- Todos os números de custo saem de `scripts/research/custos.mjs` (testado), a partir de [`dados/`](./dados/).
- O que não foi confirmado está marcado em cada nota.
