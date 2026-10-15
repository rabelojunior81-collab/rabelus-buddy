# Retrospectiva — Fase 0: Organizar a Casa

**Classe:** REGISTRO · **Data:** 2026-10-14T12:05:05-03:00 · **Autor:** buddy-dev (claude-code-671f81) · **Período:** 2026-10-14, das 09:55 às 12:10 (-03:00), em três sessões de Claude Code (`c33594`, `5c038b`, `671f81`)

## Números (medidos no git em 2026-10-14T12:05)

| Medida | Valor |
|---|---|
| Commits na branch da F0.8 | 75 (docs 35, feat 18, chore 15, fix 4, test 1, refactor 1, ci 1) |
| PRs | 7, empilhados (#1–#7); **nenhum mergeado** até esta retrospectiva |
| Arquivos versionados | 132 |
| Testes | 27, verdes no Node 26 local e no Node 24 da CI |
| ADRs | 12 (10 aceitas, 2 propostas) |
| Fichas de conhecimento | 10 |
| Eventos no ledger | 19 |
| Entradas no CHANGELOG do buddy-dev | 10/50 |
| Lições na LEARNING-CURVE | 13 |

## O que funcionou

- **Ferramenta antes de regra.** Os testes e ritos pegaram sete erros meus no mesmo dia (relógio, escape de acentos, fim de linha da proveniência, comando de teste no Node 24, epoch de fixture, alegação falsa no AGENTS.md, CHANGELOG à mão).
- **Medir antes de agir.** O "PRs mergeados" não batia com o GitHub; a divergência foi registrada e o trabalho seguiu em pilha, sem presumir nada.
- **Delegar extração, não julgamento.** Cinco subagentes pesquisaram em paralelo; as amostras conferidas na fonte não divergiram, e a pesquisa trouxe duas correções de preço e o achado dos gateways multicanal.
- **Decisões do Pai viraram ADR no mesmo turno.** Nada ficou só na conversa.

## O que não funcionou

- **O merge ficou parado.** Sete PRs empilhados viram um passivo; cada novo PR mostra cada vez mais diff até o #1 entrar. Para a próxima fase: um PR aberto por vez, ou o Pai mergeia ao fim de cada sessão.
- **A sessão nasceu no diretório errado.** Ela começou dentro da pasta de proveniência, que não pôde ser movida e recebeu artefatos do Playwright. A partir de agora, o diretório de trabalho é o repositório (BOOTSTRAP).
- **Volume de documento.** A casa tem muita prosa para um projeto sem código de produto. É o preço da Fase 0, mas a partir do M0 a proporção precisa virar: SPEC curta, teste, código.

## O que muda na próxima fase

1. Começar pela SPEC do M0, curta, com os critérios virando teste.
2. Um PR por unidade, mergeado antes do próximo, sempre que o Pai puder.
3. Medir o esforço pelo ledger desde o primeiro dia do M0, para recalibrar o roadmap com números.
