# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-15T02:50:00-03:00 · **Por:** claude-code-eb8d73

## Fase atual

**M0 — Núcleo governado:** SPEC em preparação. A Fase 0 foi concluída em 2026-10-15 ([plano](../docs/50-planos/fase-0/PLANO.md)); Roadmap v2 aprovado ([ROADMAP](../docs/50-planos/ROADMAP.md)).

## Repositório

| Item | Valor |
|---|---|
| `main` | `397ea0d` (2026-10-15), CI verde |
| PRs mergeados | #1–#7, por merge commit, pelo buddy-dev com autorização do Pai |
| PRs abertos | o do fechamento da Fase 0 |

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
| Aceite do METODO.md e da ADR 0005 | aguarda-Pai | Pai |
| SPEC do M0 | ordem-dada (Roadmap aprovado) | buddy-dev |
| Sobrenome, avatar, emojis do buddy-dev | aguarda-Pai | Pai |
| Canal dedicado de denúncia e segurança antes de tornar público | aguarda-Pai | Pai |
| Plano da conta GitHub (Free?) | a-medir | buddy-dev |
| Revisão 0.2 da pesquisa (Fase 0.7) | aceita (ADRs 0008–0012) | — |
| Stack do app mobile | aguarda-Pai (antes do M5) | Pai |
| Espaço do buddy-dev no Blog | feito: blog `2e10964` (ficha, cards pt/en, §4 v2.5) | buddy-dev |
| Cor de autoria no Blog | aguarda-Pai | Pai |
