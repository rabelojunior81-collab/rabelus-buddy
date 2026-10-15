---
status: aceita (2026-10-15)
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Barramento: ledger com um arquivo por evento e claims no diretório comum do git

## Contexto e problema

O buddy-dev precisa agir em paralelo, em harnesses e sessões diferentes, sem que um sobrescreva o outro. Lições da família: índice git compartilhado mistura commits; quem commita não é necessariamente quem agiu (Blog, 2026-10-06).

## Opções consideradas

* Um JSON por evento + estado vivo em <git-common-dir>/buddy-bus
* Um único arquivo de ledger append-only
* Banco SQLite compartilhado

## Decisão

Opção escolhida: "Um JSON por evento + estado vivo em <git-common-dir>/buddy-bus", porque arquivos distintos nunca conflitam no merge; cada evento guarda sessão, harness, modelo, host e branch; o diretório comum do git é visto por todos os worktrees da máquina sem atravessar o repositório.

### Consequências

* Bom, porque sessões paralelas em worktrees diferentes coordenam por claims com prazo
* Bom, porque o ledger é o protótipo do log de eventos do produto
* Ruim, porque entre hosts a coordenação é eventual (via push); declarado como limite
* Ruim, porque muitos arquivos pequenos ao longo do tempo
