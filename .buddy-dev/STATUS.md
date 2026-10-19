# STATUS.md — Estado vivo

**Classe:** ESTADO · única morada de versões, hosts, canais e pendências. Documento normativo não repete estes valores: aponta para cá.

**Atualizado em:** 2026-10-18T21:16:42-03:00 (`bd now --verify`) · **Por:** claude-code-vs-code-59f133

> Correção (2026-10-15, sessão `claude-code-vs-code-14f5bb`): a versão anterior trazia o carimbo `03:05:00`, escrito à mão e no futuro em relação ao merge que a publicou (`d92e297`, 02:59:52), e a `main` como `397ea0d`. Daqui em diante, o carimbo deste arquivo vem de `bd now --verify`.

## Fase atual

Histórico da fase até o M0 (missões de 2026-10-15 ao M0.9): no arquivo morto, em [`archive/2026-10-18T151055-0300-status-fase-atual-ate-o-m0/`](../archive/2026-10-18T151055-0300-status-fase-atual-ate-o-m0/).

**M0 — Núcleo governado: concluído em 2026-10-17.** O Pai validou pela console ("testei todo o resto"); [retrospectiva e métricas](../docs/registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md). **Ordem C aprovada pelo Pai** ([ADR 0018](../docs/60-decisoes/0018-ordem-c-depois-do-m0.md)). **Agora: M1 — Orquestrador e multimodal, em execução**: SPEC [0002](../docs/40-specs/0002-orquestrador-e-multimodal/SPEC.md) **aprovada** pelo Pai em 2026-10-18, dependências do ACP instaladas, cor B (oliva) aplicada, Dependabot ligado. **Visual v4 aprovado** pelo Pai em 2026-10-18 (cantos retos, liquid glass, compacto, Inter do rabelus.com, logomarca do Rabelus Lab ao lado do nome). Telemetria do limite semanal do Go feita. **M1.0 e M1.1 feitas** (2026-10-18): contrato tipado; os 6 harnesses do Pai reconhecidos sozinhos pelo registro do ACP; catálogo de 538 modelos com fonte por capacidade; resposta vazia vira aviso. CI com plano de minutos (−70% por PR de código). Segue: M1.2 (cliente ACP: sonda, primeira execução aprovada, conversa, permissões, login do harness, preferindo o executável local quando instalado; checagem contra um harness real do Pai), depois M1.3 a M1.5.

## Repositório

| Item | Valor |
|---|---|
| `main` | `000e69e` (Merge #59: processos sem janela), CI verde |
| PRs mergeados | #1–#59, por merge commit, pelo buddy-dev (ADR 0003) |
| Conta GitHub | **Free** (medido em 2026-10-15: rulesets e proteção de branch em repositório privado respondem "Upgrade to GitHub Pro"); desde 2026-10-16: "Automatically delete head branches" ligado e só merge commit permitido (squash e rebase desligados) |
| Blog | `rabelus-lab-blog` em `b88cfcd`; clone de trabalho em `workspace/blog` (exigido pelo gate do `bd`) |

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
| Alertas do Dependabot no repositório | feito: ligados pelo buddy-dev com a aprovação do Pai em 2026-10-18 (API `vulnerability-alerts`: 204) | — |
| Suíte de testes lenta: 148 s no Windows e 57–80 s no Linux; instalar dependências leva só 2–18 s com o cache (medido na CI em 2026-10-18, pergunta do Pai) | evolução a investigar: medir os testes mais lentos (muitos núcleos de ensaio subindo) e encurtar sem afrouxar nada | buddy-dev |
| Nome e sobrenome | feito: **Buddy Fenix** (Pai, 2026-10-15) | — |
| Avatar do Buddy Fenix | feito: v3-b escolhido pelo Pai (2026-10-15), [proveniência](./avatar/PROVENIENCIA.md); aplicado no Blog com nome, cor e emojis (`rabelus-lab-blog` `6ae9895`, governança v2.6) | — |
| Emojis e cor de autoria | feito: 🔥 🖤 🧱 📜 (2026-10-15); cor de autoria verde-oliva `#a8a640` desde 2026-10-18 (opção B do Pai; antes, verdete `#3fb8a8`), aplicada no Blog e na console | — |
| Canal dedicado de denúncia e segurança | feito: `rabelo.work@gmail.com` (Pai, 2026-10-15), em `SECURITY.md` e no Código de Conduta | — |
| Plano da conta GitHub | feito: **Free**, medido em 2026-10-15 ([ficha](../docs/20-conhecimento/github-plataforma.md)) | — |
| Convenção de código (identificadores em inglês, catálogo em `locales/`) | feito: aceita pelo Pai em 2026-10-15 | — |
| Revisão 0.2 da pesquisa (Fase 0.7) | aceita (ADRs 0008–0012) | — |
| Stack do app mobile e da Web UI | feito: [ADR 0013](../docs/60-decisoes/0013-stack-mobile-e-web.md) aceita pelo Pai (2026-10-15): começar por A (Expo universal), chegar em B (Web React DOM separada); spike no M5 | — |
| Espaço do buddy-dev no Blog | feito: ficha `2e10964`; posts "Nasci Dentro da Obra", "O Rosto Veio da Casa" e "A Regra Que Me Cobrou Primeiro", com a daily de 2026-10-15; post e daily por sessão cobrados pelo `bd session end` | — |
