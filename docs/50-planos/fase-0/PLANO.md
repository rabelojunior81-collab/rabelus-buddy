# Plano — Fase 0: Organizar a Casa

**SPEC:** o pedido do Pai de 2026-10-14 e as respostas às 7 perguntas (registrados em `.buddy-dev/MEMORY.md` e nas ADRs 0001–0007). Tamanho: fase. A Fase 0 é a que cria o mecanismo de SPEC; por isso a sua SPEC é o próprio pedido, aceito por escrito.
**Estado:** em execução · **Atualizado em:** 2026-10-14T10:40:00-03:00

## Objetivo

Começar o desenvolvimento do Rabelus Buddy com a casa arrumada: repositório público-pronto, ferramentas que fazem as regras valerem, corpus do buddy-dev, governança enxuta, CI, pesquisa corrigida e um roadmap em que o Pai possa confiar.

## TODO

- [x] **F0.1 Fundação** — pasta em `rabelus-lab/rabelus-buddy`, `git init`, import intocado, repositório privado — `49eab34`
- [x] **F0.2 Ferramentas** — `bd`: relógio, nomes, barramento, arquivo morto, changelog, guarda, ritos; 22 testes — PR #1
- [x] **F0.3 Esqueleto open source** — licença, comunidade bilíngue, templates, docs, ADRs, conhecimento — PR #2
- [x] **F0.4 Corpus e bootstrap** — `.buddy-dev/`, `AGENTS.md`, `BOOTSTRAP.md`, pontes — PR #3
- [x] **F0.5 Governança e roadmap** — METODO, CONVENCOES, templates, ROADMAP, PLANO-MACRO, este plano — PR #4
- [x] **F0.6 CI** — testes, nomes, guarda, gitleaks; verde no Node 24 — PR #5
- [x] **F0.7 Revisão 0.2 da pesquisa** (aguarda aceite; 5 decisões do Pai em `docs/10-pesquisa/rev-0.2/RELATORIO.md`) — plano de sub-fase próprio em `fase-0/f0-7-revisao-pesquisa/PLANO.md`; corrige os 9 limites de `docs/00-proveniencia/README.md`
- [x] **F0.8 Roadmap e Plano Macro** — v2 sobre a Revisão 0.2 e as ADRs 0008–0012; **aprovação do Pai libera a SPEC do M0** — PR #7
- [x] **Blog** — ficha de autor, cards pt/en, governança v2.5 — blog `2e10964`

## Dependências e bloqueios

- Merge dos PRs é do Pai; os PRs estão empilhados (#1 → #2 → #3 → #4).
- F0.8 depende da F0.7 aprovada.

## Paralelismo

F0.6 (CI), F0.7 (pesquisa) e o Blog são independentes e podem correr em worktrees paralelos. Recursos que pedem claim: `docs/50-planos/ROADMAP.md`, `.buddy-dev/STATUS.md`, `.buddy-dev/MEMORY.md`.

## Fechamento

- [ ] Testes verdes e `bd post` sem falhas na `main`
- [x] Retrospectiva da Fase 0 em `docs/registros/2026-10-14T120505-0300-retrospectiva-da-fase-0.md`
- [ ] ROADMAP, STATUS e MEMORY atualizados
