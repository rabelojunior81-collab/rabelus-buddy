# ACP: como fazer o harness pedir permissão ao núcleo

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-18T22:06:35-03:00 · **Estado:** vigente (reverificar a cada versão nova do harness)

## O problema (medido em 2026-10-18)

Na configuração padrão do computador do Pai, o OpenCode 2.0.31 e o Codex (`codex-acp` 2.2.2) **escrevem arquivos sem pedir permissão** ao cliente ACP ([registro da M1.2c](../registros/2026-10-18T220140-0300-checagem-real-da-conversa-por-acp/README.md)):

- **OpenCode:** a maioria das permissões dele vale `allow` por padrão.
- **Codex:** o modo padrão é `agent` ("Auto review"), que só pergunta o que ele mesmo julga perigoso.

O protocolo prevê `session/request_permission`, mas quem decide perguntar é o harness.

## Codex: modo da sessão

- `session/new` devolve `configOptions` com `id: "mode"`, de categoria `mode`, com os valores:
  - `read-only`: "Requires approval to edit files and access the internet";
  - `workspace-write`;
  - `agent`, o padrão;
  - `agent-full-access`.

  Devolve também `collaboration_mode` (`default`/`plan`) e `model`.
- O cliente troca o modo com `session/set_config_option` `{ sessionId, configId: "mode", value: "read-only" }`. O ACP diz que as *config options* substituem a API antiga de modos, e que os modos sairão do protocolo ([fonte](https://agentclientprotocol.com/protocol/session-config-options), lida em 2026-10-18).
- **Medido:** em `read-only`, o pedido de escrita virou `session/request_permission` com título "Run command" e `kind: execute`. As opções foram `allow_once`, `accept_execpolicy_amendment` (`allow_always`) e `cancel` (`reject_once`).
  - Negado: nada escrito, `stopReason: cancelled`, em 9,3 s.
  - Permitido: escreveu, `end_turn`, em 10,2 s.

## OpenCode: configuração de permissão

- Sem modos ACP: `configOptions` só traz `model`.
- A permissão vem da configuração dele, com a chave `permission` ([fonte](https://opencode.ai/docs/permissions/), lida em 2026-10-18):
  - as chaves são `edit`, `bash`, `webfetch`, `read`, `glob`, `grep`, `task`, `skill`, `lsp`, `question`, `websearch`, `external_directory` e `doom_loop`;
  - os valores são `allow`, `ask` e `deny`, e `"*"` vale para todas;
  - a maioria é `allow` por padrão.
- A configuração pode chegar só ao processo filho pela variável `OPENCODE_CONFIG_CONTENT` (configuração inline, "runtime overrides"). Ela vence a configuração do projeto e a global do usuário, **mas perde para a configuração gerenciada** da máquina ([fonte](https://opencode.ai/docs/config/), lida em 2026-10-18). Com isso, os arquivos do Pai não são tocados.
- **Medido** com `{"permission":{"edit":"ask","bash":"ask","webfetch":"ask"}}`: o pedido de escrita virou `session/request_permission` com o caminho do arquivo como título e `kind: edit`. As opções foram `once`, `always` e `reject`.
  - Negado: nada escrito, `cancelled`, em 4,1 s.
  - Permitido: escreveu, `end_turn`, em 7,3 s.

## Consequência para o produto

- O núcleo **define a postura do harness ao iniciar a sessão**: no Codex, pelo modo; no OpenCode, pela configuração inline no ambiente do filho. Depois, cada pedido passa pela console (M1.2d, critério 6).
- **Negar encerra o turno** nos dois harnesses (`cancelled`). A console precisa deixar claro que negar para a tarefa.
- Configuração gerenciada da máquina pode vencer a do núcleo no OpenCode. Isso é raro num computador pessoal, mas o núcleo deve conferir pelo comportamento (por exemplo, `tool_call` de escrita concluído sem pedido) e avisar.
- Os outros harnesses (Copilot, Hermes, Claude, pi) ainda não foram medidos.
