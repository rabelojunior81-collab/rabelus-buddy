# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-14T10:40:00-03:00 · **Por:** claude-code-c33594

## Fase atual

**Fase 0 — Organizar a Casa.** Plano: [`docs/50-planos/fase-0/PLANO.md`](../docs/50-planos/fase-0/PLANO.md).

## PRs abertos

| PR | Branch | Conteúdo | Estado |
|---|---|---|---|
| #1 | `feat/f0-2-ferramentas` | Ferramentas `bd` | aguarda merge do Pai |
| #2 | `feat/f0-3-esqueleto-oss` | Superfície open source, ADRs, conhecimento | aguarda #1 |
| #3 | `feat/f0-4-corpus-e-bootstrap` | Corpus do buddy-dev, bootstrap, governança, roadmap | aguarda #2 |

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
| Merge dos PRs #1, #2, #3 | aguarda-Pai | Pai |
| Aceite das ADRs 0003 e 0005 | aguarda-Pai | Pai |
| Sobrenome, avatar, emojis do buddy-dev | aguarda-Pai | Pai |
| Canal dedicado de denúncia e segurança antes de tornar público | aguarda-Pai | Pai |
| Plano da conta GitHub (Free?) | a-medir | buddy-dev |
| Revisão 0.2 da pesquisa (Fase 0.7) | ordem-dada | buddy-dev |
| Espaço do buddy-dev no Blog | ordem-dada | buddy-dev |
