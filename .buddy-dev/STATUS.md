# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-15T17:16:41-03:00 (`bd now --verify`) · **Por:** claude-code-vs-code-7ebb05

> Correção (2026-10-15, sessão `claude-code-vs-code-14f5bb`): a versão anterior trazia o carimbo `03:05:00`, escrito à mão e no futuro em relação ao merge que a publicou (`d92e297`, 02:59:52), e a `main` como `397ea0d`. Daqui em diante, o carimbo deste arquivo vem de `bd now --verify`.

## Fase atual

**Missões de 2026-10-15, concluídas:** (1) decisões do Pai registradas (PR #11); (2) avatar, emojis e cor do Buddy Fenix (PR #12; Blog `6ae9895`); (3) stack mobile pesquisada e [ADR 0013](../docs/60-decisoes/0013-stack-mobile-e-web.md) aceita pelo Pai (PR #15). Depois, a pedido do Pai, o **gate do Blog** no `bd` (enforcement de post e daily por sessão). Por fim, a pedido do Pai, a **auditoria de superfícies** (`bd surfaces`, [SUPERFICIES.md](../docs/30-governanca/SUPERFICIES.md)). **Agora: SPEC 0001 aprovada pelo Pai (2026-10-15, revisão 3), com o plano do M0.** Ordem de provedores: OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter (ADR 0015). Próximo: M0.1 (fundação do código), depois da resposta do Pai sobre forkar o Pi Agent.

**M0 — Núcleo governado:** SPEC [0001](../docs/40-specs/0001-nucleo-governado/SPEC.md) **aprovada**; plano [aprovado](../docs/50-planos/m0/PLANO.md).

## Repositório

| Item | Valor |
|---|---|
| `main` | `dfb5746` (Merge #19: `bd deps --latest`), CI verde; PR #17 (SPEC 0001) aberto, aguardando o Pai |
| PRs mergeados | #1–#16, #18 e #19, por merge commit, pelo buddy-dev (ADR 0003) |
| Conta GitHub | **Free** (medido em 2026-10-15: rulesets e proteção de branch em repositório privado respondem "Upgrade to GitHub Pro") |
| Blog | `rabelus-lab-blog` em `fdebad4`; clone de trabalho em `workspace/blog` (exigido pelo gate do `bd`) |

## Ambiente medido (2026-10-15)

| Item | Valor |
|---|---|
| Host | Windows 11 Pro 10.0.26300, fuso E. South America Standard Time |
| Node | v26.11.1 local (piso do projeto: >=24); publicadas em 2026-10-14: v26.12.0 (Current) e v24.22.0 (LTS) — [ficha](../docs/20-conhecimento/node-runtime.md) |
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
| Forkar o Pi Agent como CLI/TUI? | pergunta do Pai (2026-10-15); resposta com pesquisa em [ficha](../docs/20-conhecimento/pi-agent.md) | buddy-dev → Pai |
| Alertas do Dependabot no repositório (a API respondeu 404: desligados) | proposta; ligar é configuração do repositório | Pai |
| Nome e sobrenome | feito: **Buddy Fenix** (Pai, 2026-10-15) | — |
| Avatar do Buddy Fenix | feito: v3-b escolhido pelo Pai (2026-10-15), [proveniência](./avatar/PROVENIENCIA.md); aplicado no Blog com nome, cor e emojis (`rabelus-lab-blog` `6ae9895`, governança v2.6) | — |
| Emojis e cor de autoria | feito: 🔥 🖤 🧱 📜 e verdete `#3fb8a8` (2026-10-15), aplicados no Blog | — |
| Canal dedicado de denúncia e segurança | feito: `rabelo.work@gmail.com` (Pai, 2026-10-15), em `SECURITY.md` e no Código de Conduta | — |
| Plano da conta GitHub | feito: **Free**, medido em 2026-10-15 ([ficha](../docs/20-conhecimento/github-plataforma.md)) | — |
| Convenção de código (identificadores em inglês, catálogo em `locales/`) | feito: aceita pelo Pai em 2026-10-15 | — |
| Revisão 0.2 da pesquisa (Fase 0.7) | aceita (ADRs 0008–0012) | — |
| Stack do app mobile e da Web UI | feito: [ADR 0013](../docs/60-decisoes/0013-stack-mobile-e-web.md) aceita pelo Pai (2026-10-15): começar por A (Expo universal), chegar em B (Web React DOM separada); spike no M5 | — |
| Espaço do buddy-dev no Blog | feito: ficha `2e10964`; posts "Nasci Dentro da Obra", "O Rosto Veio da Casa" e "A Regra Que Me Cobrou Primeiro", com a daily de 2026-10-15; post e daily por sessão cobrados pelo `bd session end` | — |
