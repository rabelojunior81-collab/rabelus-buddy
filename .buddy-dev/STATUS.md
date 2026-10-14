# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-14T11:45:00-03:00 · **Por:** claude-code-5c038b

## Fase atual

**Fase 0 — Organizar a Casa.** Plano: [`docs/50-planos/fase-0/PLANO.md`](../docs/50-planos/fase-0/PLANO.md).

## PRs abertos

| PR | Branch | Conteúdo | Estado |
|---|---|---|---|
| #1 | `feat/f0-2-ferramentas` | Ferramentas `bd` | aguarda merge do Pai |
| #2 | `feat/f0-3-esqueleto-oss` | Superfície open source, ADRs, conhecimento | aguarda #1 |
| #3 | `feat/f0-4-corpus-e-bootstrap` | Corpus do buddy-dev, AGENTS, BOOTSTRAP, pontes | aguarda #2 |
| #4 | `feat/f0-5-governanca-e-roadmap` | Método, convenções, templates, roadmap, plano macro, plano da Fase 0 | aguarda #3 |
| #5 | `feat/f0-6-ci` | CI: testes, nomes, guarda, gitleaks (verde) | aguarda #4 |
| #6 | `feat/f0-7-revisao-pesquisa` | Revisão 0.2 da pesquisa (R1–R7) | aguarda #5 |

## Ambiente medido (2026-10-14)

| Item | Valor |
|---|---|
| Host | Windows 11 Pro 10.0.26300, fuso E. South America Standard Time |
| Node | v26.11.1 (piso do projeto: >=24) |
| git | 2.56.0.windows.2 |
| gh | 2.102.0, conta `rabelojunior81-collab` |
| Python | 3.12.10 (não usado pelas ferramentas) |
| Repositório | `rabelojunior81-collab/rabelus-buddy`, **privado** |

## Harnesses

| Harness | Ponte | Verificado em uso |
|---|---|---|
| Claude Code | `CLAUDE.md` → `@AGENTS.md` | sim (sessão de nascimento) |
| Codex · OpenCode · Cursor · Copilot (coding agent) · outros da lista agents.md | `AGENTS.md` nativo | não testado |
| Gemini CLI | `.gemini/settings.json` → `AGENTS.md` | não testado |
| GitHub Copilot (VS Code) | `.github/copilot-instructions.md` | não testado |

## Pendências tipadas

| Pendência | Tipo | Dono |
|---|---|---|
| Merge dos PRs #1, #2, #3, #4 | aguarda-Pai | Pai |
| Aceite das ADRs 0003 e 0005 e do METODO.md | aguarda-Pai | Pai |
| Sobrenome, avatar, emojis do buddy-dev | aguarda-Pai | Pai |
| Canal dedicado de denúncia e segurança antes de tornar público | aguarda-Pai | Pai |
| Plano da conta GitHub (Free?) | a-medir | buddy-dev |
| Revisão 0.2 da pesquisa (Fase 0.7) | feita, aguarda aceite | Pai |
| F0.8 Roadmap e Plano Macro sobre a 0.2 | bloqueada pelas decisões | buddy-dev |
| Espaço do buddy-dev no Blog | feito: blog `2e10964` (ficha, cards pt/en, §4 v2.5) | buddy-dev |
| Cor de autoria no Blog | aguarda-Pai | Pai |
| Merge dos PRs #1–#6 (em 2026-10-14 11:08 os PRs #1–#5 seguiam abertos no GitHub, apesar da mensagem de merge) | aguarda-Pai | Pai |
| 5 decisões da Revisão 0.2 (orçamento, aprovações, estratégia, binário, pendências do briefing) | aguarda-Pai | Pai |
