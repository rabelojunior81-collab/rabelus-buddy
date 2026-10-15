---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Orçamento: US$ 50/mês, com o trabalho dos agentes nas assinaturas ChatGPT Plus e OpenCode Go

## Contexto e problema

A Revisão 0.2 (R1) mostrou que uso agêntico diário no nível Sonnet custa de US$ 38 a 204/mês por API, acima do teto de US$ 50. O Pai pretende usar sobretudo modelos de baixo custo, pelas assinaturas ChatGPT Plus (US$ 20) e OpenCode Go (US$ 10).

## Opções consideradas

* A) US$ 50 com camada barata por API
* B) Elevar o orçamento
* C) US$ 50 com o trabalho via assinaturas conduzidas por ACP

## Decisão

Opção escolhida: "C) US$ 50 com o trabalho via assinaturas conduzidas por ACP", porque as duas assinaturas cobrem os modelos da camada barata (Claude Haiku 5.5 e GPT-6 Luna estão no OpenCode Go; GPT-6 Luna tem 350–3.000 mensagens por janela de 5 h no Plus), e os dois agentes falam ACP (`opencode acp`; `@agentclientprotocol/codex-acp` com login ChatGPT). Decisão do Pai em 2026-10-14. Fatos em `docs/20-conhecimento/assinaturas-de-agentes.md`.

### Consequências

* Bom, porque US$ 30 fixos cobrem o trabalho pesado; sobram cerca de US$ 20 para API direta pontual, VPS do gateway e backup
* Bom, porque o cliente ACP vira peça central do M1, o que já era a estratégia de composição (ADR 0010)
* Ruim, porque limites por janela e listas de modelos mudam sem aviso; o núcleo precisa medir janelas, não só dólares
* Ruim, porque os termos do OpenCode Go exigem tráfego típico de agente de código e identificação própria; o buddy precisa cumprir isso
* Ruim, porque modelos do Go que treinam com os dados (Gemini 4 Argon Contributor, Muse Spark) ficam desligados por padrão para conteúdo do usuário
