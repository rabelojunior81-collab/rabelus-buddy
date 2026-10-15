# Superfícies

**Classe:** CÂNONE · **Versão:** 0.1 · **Data:** 2026-10-15 · **Origem:** pedido do Pai em 2026-10-15 ("re-verifique todo o projeto, identificando GAPS de atualizações… para não se repetir")

Um fato muda num lugar e precisa chegar a todos os lugares que o afirmam. Este mapa diz **quais superfícies tocar em cada tipo de evento**. A parte mecânica é conferida por `bd surfaces`, que roda no `bd post` e na CI; o resto é desta tabela, citada no checklist do PR.

## O que a máquina confere (`bd surfaces`)

| Checagem | Pega |
|---|---|
| Índices completos | ficha fora de `docs/20-conhecimento/README.md`; ADR fora de `docs/60-decisoes/README.md` ou com estado diferente do arquivo; SPEC fora de `docs/40-specs/README.md`; revisão fora de `docs/10-pesquisa/README.md` |
| ADR aceita citada como "proposta" | qualquer documento vivo que ainda trate uma ADR aceita como proposta |
| Carimbo "Atualizado em" | carimbo no futuro, ou mais de 6 h atrás do último commit do arquivo (editou e não recarimbou) |
| `main` no STATUS | hash inexistente, ou mais de 1 commit de primeiro pai atrás da base |

Documentos de história não entram: registros, diário, changelogs, LEARNING-CURVE, ledger, arquivo, proveniência, pesquisa e o corpo das ADRs.

## O que a tabela cobra (evento → superfícies)

| Evento | Superfícies a atualizar |
|---|---|
| **Decisão do Pai** | ADR (estado) e índice de ADRs; `MEMORY.md` (tabela de regras); `STATUS.md` (pendências); ROADMAP e PLANO-MACRO, se tocam marco ou pendência; changelog |
| **Regra nova do Pai** | o mesmo, mais o **mecanismo**: `AGENTS.md` §3 (regra → mecanismo) e a ferramenta ou teste que a confere |
| **PR mergeado** | `STATUS.md` (`main`, faixa de PRs) no PR seguinte |
| **Fase ou marco muda** | `STATUS.md` (fase atual); ROADMAP ("Agora"); PLANO-MACRO (checkboxes); `README.md` e `README.en.md` (Estado); `docs/40-specs/README.md` quando nasce SPEC |
| **Ficha de conhecimento nova ou reverificada** | índice de `docs/20-conhecimento/` (data); `STATUS.md` se a ficha mede o ambiente (versões, plano da conta) |
| **Versão de ferramenta ou ambiente muda** | `STATUS.md` (ambiente medido); a ficha correspondente (`node-runtime.md`, `github-plataforma.md`…) |
| **Harness novo verificado** | `STATUS.md` (Harnesses); `BOOTSTRAP.md` §3 ("Testado aqui") |
| **Comando novo do `bd`** | ajuda do `bd`; `AGENTS.md` (rito e/ou §3); `CONTRIBUTING.md` e `.en.md` se humanos usam; `CHANGELOG.md` da raiz |
| **Identidade do buddy-dev muda** (nome, avatar, cor, emojis) | `IDENTITY.md`, `SOUL.md` (estado), `.buddy-dev/README.md`, `README.md`/`.en.md` (como é desenvolvido), Blog (`BLOG_GOVERNANCE.md` §4, ficha de autor, cards, `styles.css`) |
| **Superfície pública muda** (README, CONTRIBUTING, SECURITY, Código de Conduta) | o espelho no outro idioma (ADR 0002) |
| **Fim de sessão** | diário; changelog; `STATUS.md`; `MEMORY.md` se houve marco ou regra; **post e daily no Blog** (cobrados pelo `bd session end`) |
| **Mapa do repositório muda** (pasta nova com papel próprio) | `AGENTS.md` §6; `README.md`/`.en.md` (Mapa); `docs/README.md` ou `.buddy-dev/README.md` |

## Onde as lacunas aconteceram (2026-10-15)

A auditoria pedida pelo Pai achou estas lacunas. Cada uma vira caso da tabela acima ou da checagem automática:

| Lacuna | Evento que a causou | Agora coberta por |
|---|---|---|
| `README.md`/`.en.md` ainda em "Fase 0" e "revisão planejada" | marco mudou (Fase 0 fechada, 0.2 aceita) | tabela: fase ou marco muda |
| STATUS, MEMORY e ficha da stack mobile ainda chamando de "proposta" uma decisão (a 0013) já aceita | decisão do Pai | `bd surfaces` (ADR aceita citada como proposta) |
| ROADMAP, PLANO-MACRO e plano da Fase 0 com "Atualizado em" de 14/10, editados em 15/10 | edição sem recarimbo | `bd surfaces` (carimbo) |
| `USER.md` dizendo que o merge é do Pai | regra nova do Pai (merge é meu) | tabela: regra nova do Pai |
| STATUS sem o Claude Code no VS Code verificado; BOOTSTRAP idem | harness novo verificado | tabela: harness novo |
| Plano da conta GitHub "a medir" havia dois dias | pendência sem dono ativo | medido nesta auditoria (Free) |
| Ficha do Node sem a 26.12.0 e a LTS 24.22.0 (publicadas em 14/10) | versão mudou | tabela: versão muda |
| `CHANGELOG.md` da raiz sem o gate do Blog | comando novo do `bd` | tabela: comando novo |
| `AGENTS.md` §6 e `.buddy-dev/README.md` sem `avatar/` e `workspace/` | mapa mudou | tabela: mapa muda |
| `docs/40-specs/README.md` dizendo que a SPEC nasce "depois da Fase 0" | marco mudou | tabela: fase ou marco muda |
| `README.en.md` sem a seção de mapa que o `README.md` tem desde a Fase 0 | superfície pública mudou sem espelho completo | tabela: superfície pública muda |
| Convenção de código "aguarda aceite" fora das pendências do STATUS | pendência criada sem registro | tabela: decisão do Pai (pendência no STATUS) |
