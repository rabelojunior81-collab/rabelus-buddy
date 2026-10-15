---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Regra pétrea: nada se apaga, tudo se arquiva com lápide

## Contexto e problema

O Pai quer telemetria física para aprendizagem, arqueologia e referência. A família Rabelus já pratica arquivo com lápide (LARS, Killian).

## Opções consideradas

* Arquivar com git mv + LAPIDE.md + manifest.json, reforçado por guarda na CI
* Confiar só no histórico do git
* Pasta de lixeira sem regras

## Decisão

Opção escolhida: "Arquivar com git mv + LAPIDE.md + manifest.json, reforçado por guarda na CI", porque o histórico do git não é navegável por quem lê a árvore, e regra sem mecanismo não se cumpre (lição do Blog: "Escrever regras não é cumpri-las", 2026-10-04).

### Consequências

* Bom, porque o arquivo morto fica legível na árvore, com motivo e hashes
* Bom, porque `bd guard` e a CI reprovam exclusões
* Ruim, porque o repositório só cresce; aceitável para texto
