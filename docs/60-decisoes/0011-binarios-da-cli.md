---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Binários da CLI: rabelus-buddy e rbuddy

## Contexto e problema

"buddy" sozinho colide com pacotes npm existentes que instalam um binário `buddy` e com produtos como Buddy.Works e Tencent CodeBuddy (R6).

## Opções consideradas

* buddy
* rbuddy
* rabelus-buddy
* rabelus-buddy e rbuddy

## Decisão

Opção escolhida: "rabelus-buddy e rbuddy", porque `rabelus-buddy` é o nome completo e inequívoco; `rbuddy` é o atalho do dia a dia. Os dois estavam livres no npm em 2026-10-14. Decisão do Pai em 2026-10-14.

### Consequências

* Bom, porque nenhum conflito com o binário `buddy` de pacotes existentes
* Ruim, porque dois nomes para documentar; `rbuddy` tem um repositório homônimo pequeno no GitHub (jkvor/rbuddy, 12 estrelas)
