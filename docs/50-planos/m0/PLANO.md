# Plano — M0: Núcleo governado

**SPEC:** [0001-nucleo-governado](../../40-specs/0001-nucleo-governado/SPEC.md) · **Estado:** em execução · **Aprovado por:** Pai, 2026-10-15
**Branch(es):** uma por sub-fase, `feat/m0-N-<slug>` · **Atualizado em:** 2026-10-16T01:14:19-03:00

## Objetivo

Entregar o núcleo governado da SPEC 0001: dono do log, IPC, política, orçamento, efeitos com identidade, loop com um provedor e CLI bilíngue. Cada critério de aceite vira teste antes do código.

## TODO

Cada sub-fase: SPEC curta no PR, testes commitados falhando, código, CI verde em Windows, Linux e macOS (Node 24 e 26), merge. Estado: `[ ]` aberto · `[~]` em andamento · `[x]` feito (com commit) · `[-]` cancelado (com motivo).

- [x] **M0.1 Fundação do código** — PR #23, CI verde em 3 SOs × Node 24/26 (`core` nasce na M0.2, com o primeiro código dele):
  - npm workspaces (`packages/core`, `packages/client`, `packages/cli`) e TypeScript apagável com `tsc --noEmit`;
  - catálogos i18next (`locales/pt-BR`, `locales/en`) e o teste de chaves nos dois idiomas;
  - CI em matriz 3 SOs × Node 24/26;
  - binários `rabelus-buddy`/`rbuddy` que só respondem `--version` e `--help` pelo catálogo.
  - `bd deps` e `bd test-guard` já valendo (entregues antes do M0, a pedido do Pai).
  - Critérios: 23 (base), 24, 25, infraestrutura do 1.
- [x] **M0.2 Log de eventos e dono** — branch `feat/m0-2-log-e-dono`, critérios 1–3 verdes:
  - adaptador `node:sqlite` (`DatabaseSync` no 24, `Database` no 26+);
  - esquema de eventos e projeções;
  - `rbuddy daemon` com instância única;
  - IPC JSON-RPC 2.0 sobre `node:net`;
  - cliente IPC em `@rabelus-buddy/client`.
  - Critérios: 1, 2, 3.
- [x] **M0.3 Efeitos e retomada** — branch `feat/m0-3-efeitos-e-retomada`, critérios 4–6 verdes (a parte "a escrita acontece uma vez" do critério 5 fecha quando as ferramentas existirem, na M0.6):
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
  - janelas por assinatura (Go por modelo: mês, semana, 5 h; teto semanal do SIWC; US$ 20 da API paga).
  - Critérios: 14, 15, 16.
- [ ] **M0.6 Provedores e loop do agente** (ADR 0014):
  - interface de provedor e provedores falsos (`fakeGo`, `fakeOpenAI`, `fakeAuth`);
  - **M0.6a OpenCode Go**: rotas `/responses`, `/chat/completions` e `/messages` e rota Google, com os SDKs `openai`, `@anthropic-ai/sdk` e `@google/genai`; `User-Agent` próprio e `x-opencode-session`;
  - **M0.6b ChatGPT por SIWC** (terceiro na ordem da ADR 0015): `rbuddy login chatgpt` (PKCE, callback em 127.0.0.1, refresh rotativo), contrato da prévia;
  - **M0.6c Ollama Cloud** (ADR 0015): rota fixada na ficha, mesmos SDKs;
  - **M0.6d OpenRouter** como API paga (reserva, teto US$ 20, SDK `openai`);
  - compactação abaixo de 100k tokens;
  - ferramentas `read_file`, `list_dir`, `write_file`, `run_command`.
  - Critérios: 16–21.
- [ ] **M0.7 CLI completa e auditoria**:
  - `run`, `status`, `approvals`, `approve`/`deny`, `budget`, `log`, `resume`, `daemon`;
  - aprovações por `readline`;
  - `--lang`/`RBUDDY_LANG`;
  - teste de vazamento de segredos em todos os artefatos.
  - Critérios: 22, 23.
- [ ] **M0.8 Demonstração e fechamento**:
  - tarefa real com o provedor real, `kill -9` e `resume`, validada pelo Pai;
  - métricas registradas;
  - retrospectiva.
  - Critério: 26.

## Dependências e bloqueios

| Sub-fase | Depende de | Bloqueada por resposta do Pai |
|---|---|---|
| M0.1 | aprovação da SPEC | decisão 8 (linguagem e execução sem build) |
| M0.2 | M0.1 | — |
| M0.3, M0.4, M0.5 | M0.2 | — |
| M0.6 | M0.2, M0.4, M0.5 | nada para os falsos; a chave do Go e a conta ChatGPT só para testes reais |
| M0.7 | M0.3–M0.6 | — |
| M0.8 | tudo | chave do Go e conta ChatGPT Plus |

**Enquanto a SPEC aguarda o Pai** (AGENTS §5.4): este plano, os fatos em aberto (`usage` verificado em 2026-10-15) e o desenho dos testes de cada critério. Nenhum código de produto antes da aprovação.

## Paralelismo

Depois da M0.2, as sub-fases M0.3, M0.4 e M0.5 tocam módulos diferentes do `core` e podem correr em worktrees paralelos (`git worktree add ../rabelus-buddy--m0-N`). Recursos que pedem claim:
- `packages/core/src/events/schema.ts`, o esquema de eventos que as três estendem;
- `locales/*/core.json`;
- `.buddy-dev/STATUS.md`;
- este plano.

## Fechamento

- [ ] Critérios 1–25 verdes na CI em Windows, Linux e macOS, nas linhas 24 e 26 do Node
- [ ] Critério 26 validado pelo Pai
- [ ] `bd post` sem falhas; `bd surfaces` verde
- [ ] Retrospectiva em `docs/registros/`
- [ ] ROADMAP, PLANO-MACRO, STATUS, MEMORY, README (Estado) e Blog atualizados ([SUPERFICIES.md](../../30-governanca/SUPERFICIES.md))
