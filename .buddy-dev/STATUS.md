# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-16T01:42:10-03:00 (`bd now --verify`) · **Por:** claude-code-vs-code-fe93fb

> Correção (2026-10-15, sessão `claude-code-vs-code-14f5bb`): a versão anterior trazia o carimbo `03:05:00`, escrito à mão e no futuro em relação ao merge que a publicou (`d92e297`, 02:59:52), e a `main` como `397ea0d`. Daqui em diante, o carimbo deste arquivo vem de `bd now --verify`.

## Fase atual

**Missões de 2026-10-15, concluídas:** (1) decisões do Pai registradas (PR #11); (2) avatar, emojis e cor do Buddy Fenix (PR #12; Blog `6ae9895`); (3) stack mobile pesquisada e [ADR 0013](../docs/60-decisoes/0013-stack-mobile-e-web.md) aceita pelo Pai (PR #15). Depois, a pedido do Pai, o **gate do Blog** no `bd` (enforcement de post e daily por sessão). Por fim, a pedido do Pai, a **auditoria de superfícies** (`bd surfaces`, [SUPERFICIES.md](../docs/30-governanca/SUPERFICIES.md)). **Agora: M0 em execução.** M0.1 feita (PR #23); **M0.2 feita** (PR #24, critérios 1–3); **M0.3 feita** (PR #25, critérios 4–6); **M0.4 feita** (PR #26, critérios 7–13 e 20); **M0.5 feita** (PR #27, critérios 14–16); **M0.6a feita** (PR #28: provedores Go, Ollama Cloud e OpenRouter, com chamada real mínima por rota); **M0.6b feita** (PR #29: ChatGPT por Sign in with ChatGPT, critérios 18 e 19 contra servidores falsos; o login real espera o Pai no navegador); **M0.6e feita** (PR #30: loop do agente, critérios 5, 16, 20 e 21 no loop); **M0.7a feita** (retomada do loop e dono executando o agente, com `kill -9` e `resume` contra provedor falso). Próximo: **M0.7b**, a CLI (`run`, `status`, `log`, `resume`, `login opencode-go`, `providers`). Ordem de provedores na ADR 0015; Pi por composição no M1 (ADR 0016).

**M0 — Núcleo governado:** SPEC [0001](../docs/40-specs/0001-nucleo-governado/SPEC.md) **aprovada**; plano [aprovado](../docs/50-planos/m0/PLANO.md).

## Repositório

| Item | Valor |
|---|---|
| `main` | `816a69e` (Merge #30: M0.6e), CI verde |
| PRs mergeados | #1–#27, por merge commit, pelo buddy-dev (ADR 0003) |
| Conta GitHub | **Free** (medido em 2026-10-15: rulesets e proteção de branch em repositório privado respondem "Upgrade to GitHub Pro"); desde 2026-10-16: "Automatically delete head branches" ligado e só merge commit permitido (squash e rebase desligados) |
| Blog | `rabelus-lab-blog` em `97651a4`; clone de trabalho em `workspace/blog` (exigido pelo gate do `bd`) |

## Ambiente medido (2026-10-15)

| Item | Valor |
|---|---|
| Host | Windows 11 Pro 10.0.26300, fuso E. South America Standard Time |
| Node | v26.11.1 local (piso do projeto: >=24.12, type stripping estável); publicadas em 2026-10-14: v26.12.0 (Current) e v24.22.0 (LTS) — [ficha](../docs/20-conhecimento/node-runtime.md) |
| git | 2.56.0.windows.2 |
| gh | 2.102.0, conta `rabelojunior81-collab` |
| Python | 3.12.10 (não usado pelas ferramentas) |
| Repositório | `rabelojunior81-collab/rabelus-buddy`, **privado** |

## Harnesses

| Harness | Ponte | Verificado em uso |
|---|---|---|
| Claude Code (terminal) | `CLAUDE.md` → `@AGENTS.md` | sim (sessão de nascimento, 2026-10-14) |
| Claude Code (extensão do VS Code) | `CLAUDE.md` → `@AGENTS.md` | sim (sessões de 2026-10-15) |
| Codex · OpenCode · Cursor · Copilot (coding agent) · outros da lista agents.md | `AGENTS.md` nativo | não testado |
| Gemini CLI | `.gemini/settings.json` → `AGENTS.md` | não testado |
| GitHub Copilot (VS Code) | `.github/copilot-instructions.md` | não testado |

## Pendências tipadas

| Pendência | Tipo | Dono |
|---|---|---|
| Aceite do METODO.md e da ADR 0005 | feito: aceitos pelo Pai em 2026-10-15 | — |
| SPEC do M0 | feito: aprovada pelo Pai em 2026-10-15 (revisão 3; decisão 8 = A) | — |
| Chaves do OpenCode Go, do OpenRouter e do Ollama Cloud | feito: em `.buddy-dev/.env.local` (Pai, 2026-10-15); conta ChatGPT Plus entra na demonstração | — |
| Forkar o Pi como CLI/TUI? | feito: não forkar; compor no M1 (ADR 0016, Pai, 2026-10-16) | — |
| Biblioteca da TUI: `ink` × `pi-tui` | em avaliação; levar ao Pai as referências visuais das duas e a avaliação quando a TUI entrar (ADR 0016) | buddy-dev → Pai |
| Alertas do Dependabot no repositório (a API respondeu 404: desligados) | proposta; registrada em `validacoes.json` como validação do Pai | Pai |
| Nome e sobrenome | feito: **Buddy Fenix** (Pai, 2026-10-15) | — |
| Avatar do Buddy Fenix | feito: v3-b escolhido pelo Pai (2026-10-15), [proveniência](./avatar/PROVENIENCIA.md); aplicado no Blog com nome, cor e emojis (`rabelus-lab-blog` `6ae9895`, governança v2.6) | — |
| Emojis e cor de autoria | feito: 🔥 🖤 🧱 📜 e verdete `#3fb8a8` (2026-10-15), aplicados no Blog | — |
| Canal dedicado de denúncia e segurança | feito: `rabelo.work@gmail.com` (Pai, 2026-10-15), em `SECURITY.md` e no Código de Conduta | — |
| Plano da conta GitHub | feito: **Free**, medido em 2026-10-15 ([ficha](../docs/20-conhecimento/github-plataforma.md)) | — |
| Convenção de código (identificadores em inglês, catálogo em `locales/`) | feito: aceita pelo Pai em 2026-10-15 | — |
| Revisão 0.2 da pesquisa (Fase 0.7) | aceita (ADRs 0008–0012) | — |
| Stack do app mobile e da Web UI | feito: [ADR 0013](../docs/60-decisoes/0013-stack-mobile-e-web.md) aceita pelo Pai (2026-10-15): começar por A (Expo universal), chegar em B (Web React DOM separada); spike no M5 | — |
| Espaço do buddy-dev no Blog | feito: ficha `2e10964`; posts "Nasci Dentro da Obra", "O Rosto Veio da Casa" e "A Regra Que Me Cobrou Primeiro", com a daily de 2026-10-15; post e daily por sessão cobrados pelo `bd session end` | — |
