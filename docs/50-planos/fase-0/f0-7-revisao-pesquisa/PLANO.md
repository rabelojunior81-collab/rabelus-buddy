# Plano — Sub-fase F0.7: Revisão 0.2 da pesquisa

**SPEC:** ordem do Pai em 2026-10-14 ("pode seguir com a F0.7") sobre o escopo declarado em [`fase-0/PLANO.md`](../PLANO.md): corrigir os 9 limites de [`docs/00-proveniencia/README.md`](../../../00-proveniencia/README.md#limites-conhecidos-deste-material). Tamanho: sessão longa.
**Estado:** concluído, aguarda aceite do Pai · **Branch:** `feat/f0-7-revisao-pesquisa` (empilhada sobre o PR #5) · **Atualizado em:** 2026-10-14T11:10:00-03:00

## Objetivo

Produzir `docs/10-pesquisa/rev-0.2/`: relatório e notas que substituem, nos pontos fracos, a pesquisa 0.1, com fatos verificados hoje e cada número recalculado por script, para que o Pai possa aprovar (ou cortar) o escopo do M0 em diante.

## Fora do escopo

- Reescrever as frentes da 0.1 que não têm limite conhecido (elas continuam valendo como estão até nova revisão).
- Decidir produto: a revisão recomenda; o Pai decide.

## TODO

| # | Limite da 0.1 | Entrega | Como |
|---|---|---|---|
| R1 | 1, 2, 3, 8 — custo otimista, comparação distorcida, uso subestimado, nomes de modelos inconsistentes | `r1-custos.md` + `scripts/research/custos.mjs` (modelo de custo reproduzível) | preços ao vivo nas páginas oficiais; tokenizador; escrita de cache; perfil de uso agêntico |
| R2 | 4 — sandbox só Windows | `r2-sandbox.md` | mecanismos nativos de macOS, Linux e Windows; como harnesses atuais isolam |
| R3 | 5 — fadiga de aprovação | `r3-aprovacoes.md` | modelos de permissão de harnesses atuais; proposta de escopos |
| R4 | 6 — esforço não estimado | `r4-esforco-e-escopo.md` | tamanho de projetos comparáveis; recorte em incrementos |
| R5 | 7 — concorrência periférica | `r5-concorrencia.md` | lições da família + limites do SQLite; requisitos fundacionais |
| R6 | 9 — colisão de nome | `r6-nome.md` | registros de marca, npm, GitHub, domínios |
| R7 | — | `RELATORIO.md` + atualização das fichas em `docs/20-conhecimento/` | síntese com recomendações e decisões para o Pai |

Estado de cada item: `[ ]` aberto · `[~]` em andamento · `[x]` feito (commit).

- [x] R1 · [x] R2 · [x] R3 · [x] R4 · [x] R5 · [x] R6 · [x] R7 — commits de `a5e9ab2` a este PR

## Paralelismo

R1, R2, R3, R4 e R6 são pesquisas independentes: rodam em subagentes paralelos que só **extraem** fatos com fonte. O buddy-dev **julga**: confere por amostragem cada relatório na fonte primária antes de usar (lição da família: "relatório de worker não é verdade"). R5 e R7 são síntese do buddy-dev.

## Critérios de aceite

1. Todo número de custo sai de `scripts/research/custos.mjs`, com os preços como dados de entrada citando URL e data; nenhum número feito de cabeça.
2. Todo fato externo tem URL e data de acesso; o que não foi confirmado está marcado como tal.
3. Cada um dos 9 limites aparece no relatório com estado: resolvido, parcialmente resolvido ou aberto (e por quê).
4. A pesquisa 0.1 em `docs/00-proveniencia/` não muda um byte.

## Fechamento

- [ ] Testes verdes e `bd post` sem falhas
- [ ] ROADMAP, STATUS, MEMORY, changelog e diário atualizados
- [ ] PR aberto para o Pai
