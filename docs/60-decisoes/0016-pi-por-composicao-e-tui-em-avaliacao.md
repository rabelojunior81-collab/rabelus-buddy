---
status: aceita (2026-10-16)
date: 2026-10-16
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Pi por composição, não por fork; biblioteca da TUI em avaliação (ink × pi-tui)

## Contexto e problema

Em 2026-10-15 o Pai perguntou se não seria mais barato forkar o Pi (`earendil-works/pi`) para ser a CLI/TUI do Rabelus Buddy. A [pesquisa](../20-conhecimento/pi-agent.md) mostrou:
- o Pi traz pronta a parte barata do M0 (CLI, TUI, loop);
- falta nele a parte cara: log com dono, política, orçamento por janela, efeitos com identidade, i18n;
- ele não tem sistema de permissões, por escolha;
- publica quase todo dia, o que faria do fork um custo permanente.

Em 2026-10-16 o Pai decidiu: "Sigo sua recomendação em relação ao Pi. Inclusive, para utilizar a biblioteca para nosso TUI". Logo depois, ele pediu referências visuais das duas bibliotecas "no momento pertinente", porque ainda não tem certeza, e pediu que o buddy-dev também avalie durante o desenvolvimento. Escolheu ainda manter o M0 sem TUI.

## Opções consideradas

* Forkar o Pi como CLI/TUI do buddy
* Compor: núcleo próprio; o Pi como agente plugável no M1; biblioteca de TUI escolhida quando a TUI entrar

## Decisão

Opção escolhida: **"Compor"**, por decisão do Pai.

1. **Sem fork do Pi.** O núcleo governado continua próprio (ADR 0010).
2. **M1:** o Pi entra como agente plugável, ao lado do OpenCode e do Codex, conduzido pelo SDK ou pelo modo RPC. Uma extensão do buddy passa cada `tool_call` pela política do núcleo e bloqueia o que a política negar.
3. **TUI:** a biblioteca **não está decidida**. As candidatas são `@earendil-works/pi-tui` e `ink`.
   - Quando a TUI entrar (depois do M0), o buddy-dev apresenta ao Pai as referências visuais das duas e uma avaliação feita durante o desenvolvimento.
   - A escolha vira ADR própria.
   - Critérios propostos para a avaliação:
     - fidelidade e desempenho de renderização no Windows Terminal, no macOS e no Linux;
     - número de dependências e se são fixadas (protocolo de dependências);
     - i18n e largura de caracteres (acentos, emoji);
     - acessibilidade de teclado;
     - encaixe com a Web e o app em React (ADR 0013);
     - manutenção e licença.
4. **M0 sem TUI**, como a [SPEC 0001](../40-specs/0001-nucleo-governado/SPEC.md) aprovada já diz: CLI de linha com `parseArgs` e aprovações por `readline`.

### Consequências

* Bom, porque o trabalho caro (governança) continua no núcleo próprio, e o Pi traz o UX dele sem custo de fork
* Bom, porque a escolha da TUI fica para quando houver o que comparar na prática, com o Pai vendo as duas
* Ruim, porque a extensão de governança do Pi depende da API de extensões dele, que muda rápido: adaptador isolado e ficha reverificada a cada marco
* Neutro: as duas bibliotecas entram no registro de dependências como **proposta** até a escolha
