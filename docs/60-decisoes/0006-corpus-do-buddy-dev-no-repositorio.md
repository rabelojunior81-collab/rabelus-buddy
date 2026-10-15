---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Corpus do buddy-dev dentro do repositório do produto

## Contexto e problema

O buddy-dev precisa de identidade, memória, diário e changelog versionados, como os irmãos da família. O LARS usa repositório próprio.

## Opções consideradas

* Pasta .buddy-dev/ dentro do repositório
* Repositório privado separado

## Decisão

Opção escolhida: "Pasta .buddy-dev/ dentro do repositório", porque simplifica a concorrência (um só git) e combina com a transparência do Lab; o corpus fica público junto com o projeto. Decisão do Pai em 2026-10-14.

### Consequências

* Bom, porque quem contribui vê como o agente trabalha
* Bom, porque um único barramento e um único histórico
* Ruim, porque nada privado pode entrar no corpus: segredos, dados pessoais e identificadores de canal ficam fora
