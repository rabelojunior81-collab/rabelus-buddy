---
status: proposta (aguarda aceite do Pai)
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior) — pendente
consulted: buddy-dev
---

# Fluxo git: branch por unidade, commit e push a cada passo, merge commit feito pelo Pai

## Contexto e problema

O Pai quer telemetria granular para rastrear falhas, erros e acertos, sem lotes de commits por feature. O GitHub Free não protege branches em repositório privado.

## Opções consideradas

* Branch por unidade + commits pequenos com push + PR + merge commit pelo Pai
* Trunk-based com push direto na main
* PR com squash merge

## Decisão

Opção escolhida: "Branch por unidade + commits pequenos com push + PR + merge commit pelo Pai", porque preserva cada passo no histórico da main (squash apagaria a granularidade), mantém a validação antes do merge e deixa a aceitação com o Pai. Em 2026-10-14 a política de permissões do harness bloqueou um merge feito pelo agente sem revisão, confirmando o desenho.

### Consequências

* Bom, porque cada commit é uma evidência rastreável
* Bom, porque falhas são localizáveis por bisect
* Ruim, porque o histórico fica longo; navegação por PR e por Conventional Commits compensa
* Ruim, porque o agente depende do Pai para cada merge
