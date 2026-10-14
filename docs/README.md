# Documentação

A cadeia de trabalho do projeto é: **Brainstorm → Briefing → Pesquisa → Governança → Roadmap vivo → Plano Macro → Plano de Fase → Plano de Sub-fase**. Cada pasta guarda um elo.

| Pasta | Classe | O que mora ali |
|---|---|---|
| [`00-proveniencia/`](./00-proveniencia/) | PROVENIÊNCIA | Brainstorm, briefing e pesquisa de origem, intocados |
| [`10-pesquisa/`](./10-pesquisa/) | PESQUISA | Revisões da pesquisa (a 0.2 corrige a origem) |
| [`20-conhecimento/`](./20-conhecimento/) | CONHECIMENTO | Fatos externos verificados ao vivo, com fonte e data |
| [`30-governanca/`](./30-governanca/) | CÂNONE | Método e convenções |
| [`40-specs/`](./40-specs/) | CONTRATO | SPECs aprovadas, uma por unidade de trabalho |
| [`50-planos/`](./50-planos/) | PLANO | Roadmap vivo, plano macro, planos de fase e sub-fase |
| [`60-decisoes/`](./60-decisoes/) | DECISÃO | ADRs (MADR 4.0.0) |
| [`registros/`](./registros/) | REGISTRO | Auditorias, incidentes, evidências; datados e append-only |

Fora de `docs/`: o arquivo morto em [`archive/`](../archive/) e o corpus do agente em [`.buddy-dev/`](../.buddy-dev/).
