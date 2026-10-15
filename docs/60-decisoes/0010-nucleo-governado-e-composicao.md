---
status: aceita
date: 2026-10-14
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev
---

# Estratégia: núcleo governado próprio + composição; roadmap M0–M5 reordenado

## Contexto e problema

A Revisão 0.2 (R4) mostrou que o escopo multi-tudo, reimplementado, é trabalho de milhares de contribuidores, e que já existem agentes plugáveis por ACP e gateways multicanal com licença MIT.

## Opções consideradas

* Reimplementar todas as capacidades
* Núcleo governado próprio + composição (ACP, MCP, gateways existentes)

## Decisão

Opção escolhida: "Núcleo governado próprio + composição (ACP, MCP, gateways existentes)", porque o diferencial do Rabelus Buddy é a governança (aprovação, orçamento, memória com proveniência, ledger, arquivo morto, bootstrap entre harnesses), e o resto do escopo completo se alcança por integração. Ordem: M0 núcleo, M1 agentes por ACP, M2 execução isolada, M3 memória e identidade, M4 canais por composição, M5+ demais superfícies. Decisão do Pai em 2026-10-14.

### Consequências

* Bom, porque o escopo completo continua sendo o objetivo, com um caminho que cabe em uma pessoa com agentes
* Bom, porque cada marco entrega algo usável
* Ruim, porque dependência de projetos de terceiros; cada integração precisa de adaptador isolado e de ficha de conhecimento reverificada a cada marco
