---
status: aceita
date: 2026-10-15
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Fluxo git: branch por unidade, commit e push a cada passo, merge commit feito pelo buddy-dev

## Contexto e problema

O Pai quer telemetria granular para rastrear falhas, erros e acertos, sem lotes de commits por feature, e que cada feature seja validada antes de entrar na `main`. O GitHub Free não protege branches em repositório privado.

A proposta anterior desta ADR (2026-10-14, preservada no histórico do git) punha o merge nas mãos do Pai. O Pai corrigiu em 2026-10-15: *"MERGE pode e deve ser feito, por você!"*. Validar é condição do merge; o Pai não precisa ser o executor dele.

## Opções consideradas

* Branch por unidade + commits pequenos com push + PR + merge commit pelo Pai
* Branch por unidade + commits pequenos com push + PR + merge commit pelo buddy-dev depois da validação
* Trunk-based com push direto na `main`
* PR com squash merge

## Decisão

Opção escolhida: "Branch por unidade + commits pequenos com push + PR + merge commit pelo buddy-dev depois da validação", porque preserva cada passo no histórico da `main` (squash apagaria a granularidade), mantém a validação antes do merge e não trava o fluxo esperando o Pai. Decisão do Pai em 2026-10-15.

**Validação exigida antes de o buddy-dev mergear:** CI verde no PR (testes, nomes, nenhuma exclusão, segredos) e `bd post` sem falhas. Mudanças que dependem de uma decisão do Pai (SPEC, cânone, produto) só são mergeadas depois dessa decisão registrada.

### Consequências

* Bom, porque cada commit é uma evidência rastreável e as falhas são localizáveis por bisect
* Bom, porque um PR é mergeado antes do próximo começar, sem pilha
* Ruim, porque o histórico fica longo; a navegação por PR e por Conventional Commits compensa
