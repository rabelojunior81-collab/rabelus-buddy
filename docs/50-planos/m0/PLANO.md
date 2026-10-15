# Plano — M0: Núcleo governado

**SPEC:** [0001-nucleo-governado](../../40-specs/0001-nucleo-governado/SPEC.md) · **Estado:** proposto (junto com a SPEC) · **Aprovado por:** pendente
**Branch(es):** uma por sub-fase, `feat/m0-N-<slug>` · **Atualizado em:** 2026-10-15T04:37:18-03:00

## Objetivo

Entregar o núcleo governado da SPEC 0001: dono do log, IPC, política, orçamento, efeitos com identidade, loop com um provedor e CLI bilíngue. Cada critério de aceite vira teste antes do código.

## TODO

Cada sub-fase: SPEC curta no PR, testes commitados falhando, código, CI verde em Windows, Linux e macOS (Node 24 e 26), merge. Estado: `[ ]` aberto · `[~]` em andamento · `[x]` feito (com commit) · `[-]` cancelado (com motivo).

- [ ] **M0.1 Fundação do código**:
  - npm workspaces (`packages/core`, `packages/client`, `packages/cli`) e TypeScript apagável com `tsc --noEmit`;
  - catálogos i18next (`locales/pt-BR`, `locales/en`) e o teste de chaves nos dois idiomas;
  - CI em matriz 3 SOs × Node 24/26;
  - binários `rabelus-buddy`/`rbuddy` que só respondem `--version` e `--help` pelo catálogo.
  - Critérios: 19 (base), infraestrutura do 1.
- [ ] **M0.2 Log de eventos e dono**:
  - adaptador `node:sqlite` (`DatabaseSync` no 24, `Database` no 26+);
  - esquema de eventos e projeções;
  - `rbuddy daemon` com instância única;
  - IPC JSON-RPC 2.0 sobre `node:net`;
  - cliente IPC em `@rabelus-buddy/client`.
  - Critérios: 1, 2, 3.
- [ ] **M0.3 Efeitos e retomada**:
  - intenção, tentativa e recibo; estado "desconhecido" e reconciliação;
  - reprojeção na partida;
  - testes de `kill -9` com processo filho.
  - Critérios: 4, 5, 6.
- [ ] **M0.4 Motor de política**:
  - deny → ask → allow, caminhos protegidos e escopos (uma vez, sessão, projeto);
  - `ask` sem interação vira `deny`; detecção de laço;
  - escrita com compare-and-set pelo hash da leitura;
  - `run_command` sempre `ask`.
  - Critérios: 7–13.
- [ ] **M0.5 Orçamento atômico**:
  - reserva e liquidação em transação;
  - teto mensal;
  - tipo "janela" no modelo;
  - fórmula de liquidação com os campos verificados de `usage`.
  - Critérios: 14, 15, 16.
- [ ] **M0.6 Provedor e loop do agente**:
  - interface de provedor e provedor falso determinístico;
  - adaptador OpenAI (Responses API, `store: false`) **ou** Anthropic, conforme a dúvida 1;
  - compactação abaixo de 100k tokens;
  - ferramentas `read_file`, `list_dir`, `write_file`, `run_command`.
  - Critérios: 17, 20.
- [ ] **M0.7 CLI completa e auditoria**:
  - `run`, `status`, `approvals`, `approve`/`deny`, `budget`, `log`, `resume`, `daemon`;
  - aprovações por `readline`;
  - `--lang`/`RBUDDY_LANG`;
  - teste de vazamento de segredos em todos os artefatos.
  - Critérios: 18, 19.
- [ ] **M0.8 Demonstração e fechamento**:
  - tarefa real com o provedor real, `kill -9` e `resume`, validada pelo Pai;
  - métricas registradas;
  - retrospectiva.
  - Critério: 21.

## Dependências e bloqueios

| Sub-fase | Depende de | Bloqueada por resposta do Pai |
|---|---|---|
| M0.1 | aprovação da SPEC | dúvidas 3 (convenção) e 4 (dependências e linguagem) |
| M0.2 | M0.1 | — |
| M0.3, M0.4, M0.5 | M0.2 | M0.5: dúvida 2 (teto padrão) |
| M0.6 | M0.2, M0.4, M0.5 | dúvida 1 (provedor e chave) só para o adaptador real; o provedor falso não espera |
| M0.7 | M0.3–M0.6 | — |
| M0.8 | tudo | dúvidas 1 e 2 |

**Enquanto a SPEC aguarda o Pai** (AGENTS §5.4): este plano, os fatos em aberto (`usage` verificado em 2026-10-15) e o desenho dos testes de cada critério. Nenhum código de produto antes da aprovação.

## Paralelismo

Depois da M0.2, as sub-fases M0.3, M0.4 e M0.5 tocam módulos diferentes do `core` e podem correr em worktrees paralelos (`git worktree add ../rabelus-buddy--m0-N`). Recursos que pedem claim:
- `packages/core/src/events/schema.ts`, o esquema de eventos que as três estendem;
- `locales/*/core.json`;
- `.buddy-dev/STATUS.md`;
- este plano.

## Fechamento

- [ ] Critérios 1–20 verdes na CI em Windows, Linux e macOS, nas linhas 24 e 26 do Node
- [ ] Critério 21 validado pelo Pai
- [ ] `bd post` sem falhas; `bd surfaces` verde
- [ ] Retrospectiva em `docs/registros/`
- [ ] ROADMAP, PLANO-MACRO, STATUS, MEMORY, README (Estado) e Blog atualizados ([SUPERFICIES.md](../../30-governanca/SUPERFICIES.md))
