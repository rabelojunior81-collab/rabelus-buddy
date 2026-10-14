---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Aprovações com escopo: decisão humana na integração e na política da sessão

## Contexto e problema

O briefing exige aprovação humana para 8 classes de ação. A Revisão 0.2 (R3) mostrou que aprovação por chamada gera fadiga (usuários aprovam 93% dos prompts, segundo a Anthropic).

## Opções consideradas

* Prompt a cada chamada nas 8 classes
* Decisão com escopo: integração do worktree, política da sessão, negação vence

## Decisão

Opção escolhida: "Decisão com escopo: integração do worktree, política da sessão, negação vence", porque mantém a aprovação humana em todas as 8 classes e muda só onde ela acontece: criar/alterar arquivos é aprovado na integração do worktree; executar comandos é livre dentro do sandbox e do workspace; as demais classes pedem aprovação a cada vez ou por escopo estreito (tabela em `docs/10-pesquisa/rev-0.2/r3-aprovacoes.md`). Decisão do Pai em 2026-10-14.

### Consequências

* Bom, porque o humano decide em menos pontos, com mais contexto (um diff inteiro, não uma linha)
* Bom, porque compatível com as opções do ACP (allow_once, allow_always, reject_once, reject_always)
* Ruim, porque depende do sandbox (R2) estar de pé antes de liberar comandos sem prompt; até lá, comandos pedem aprovação
