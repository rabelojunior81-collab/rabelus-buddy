# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-15T03:30:03-03:00 (`bd now --verify`) · **Por:** claude-code-vs-code-14f5bb

> Correção (2026-10-15, sessão `claude-code-vs-code-14f5bb`): a versão anterior trazia o carimbo `03:05:00`, escrito à mão e no futuro em relação ao merge que a publicou (`d92e297`, 02:59:52), e a `main` como `397ea0d`. Daqui em diante, o carimbo deste arquivo vem de `bd now --verify`.

## Fase atual

**Antes do M0, por ordem do Pai (2026-10-15):** (1) decisões do Pai registradas; (2) missão do avatar, emojis e cor de autoria do Buddy Fenix; (3) pesquisa da stack mobile (iOS, Android e WebUI responsiva). Só depois a SPEC do M0.

**M0 — Núcleo governado:** SPEC em preparação. **Retomar pelo handoff:** [`docs/registros/2026-10-15T025441-0300-handoff-para-claude-code-no-vs-code.md`](../docs/registros/2026-10-15T025441-0300-handoff-para-claude-code-no-vs-code.md). A Fase 0 foi concluída em 2026-10-15 ([plano](../docs/50-planos/fase-0/PLANO.md)); Roadmap v2 aprovado ([ROADMAP](../docs/50-planos/ROADMAP.md)).

## Repositório

| Item | Valor |
|---|---|
| `main` | `d92e297` (Merge #10, 2026-10-15T02:59:52-03:00), CI verde |
| PRs mergeados | #1–#10, por merge commit, pelo buddy-dev (ADR 0003) |

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
| Aceite do METODO.md e da ADR 0005 | feito: aceitos pelo Pai em 2026-10-15 | — |
| SPEC do M0 | ordem-dada; começa depois das três missões abaixo (Pai, 2026-10-15) | buddy-dev |
| Nome e sobrenome | feito: **Buddy Fenix** (Pai, 2026-10-15) | — |
| Avatar do Buddy Fenix (pesquisa de geração de imagem com Gemini, aparência de autoria do buddy-dev) | ordem-dada (2026-10-15) | buddy-dev |
| Emojis e cor de autoria | ordem-dada: decisão do buddy-dev (2026-10-15) | buddy-dev |
| Canal dedicado de denúncia e segurança | feito: `rabelo.work@gmail.com` (Pai, 2026-10-15), em `SECURITY.md` e no Código de Conduta | — |
| Plano da conta GitHub (Free?) | a-medir | buddy-dev |
| Revisão 0.2 da pesquisa (Fase 0.7) | aceita (ADRs 0008–0012) | — |
| Stack do app mobile (iOS, Android nativos e WebUI responsiva) | ordem-dada: pesquisa de cenários com recomendação (2026-10-15); a escolha final é do Pai | buddy-dev → Pai |
| Espaço do buddy-dev no Blog | feito: ficha `2e10964`; primeiro post "Nasci Dentro da Obra" + daily editorial `c143077` (2026-10-15) | — |
