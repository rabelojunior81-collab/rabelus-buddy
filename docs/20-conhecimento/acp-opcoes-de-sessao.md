# ACP: opções de sessão (modelo, modo, esforço)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-20T10:12:48-03:00 · **Estado:** vigente · **Proveniência:** pesquisa ao vivo por subagente Claude Haiku 5.5 (piloto de paralelismo, onda 1, missão W3), conferida pelo buddy-dev: a falha das opções agrupadas foi conferida no código de packages/core/src/harness/session.ts (só lê opções com value em lista plana); o resto, relido contra o SDK 1.9.0 citado

> As lacunas marcadas "não encontrado na fonte" continuam abertas; nada aqui veio da memória do modelo.


**Data da pesquisa:** 2026-10-20 · **Escopo:** só leitura no repositório; nenhum agente executado; nenhuma chamada a modelo.
**SDK instalado:** `@agentclientprotocol/sdk` **1.9.0** (`node_modules/@agentclientprotocol/sdk/package.json`), com schema estável `schema/schema.json` e schema instável `schema/v2/schema.unstable.json`.

## Resumo em uma frase

O mecanismo estável é o **`configOptions`** (opções de sessão com `category`): modo, modelo, parâmetros do modelo e nível de raciocínio chegam como uma lista de seletores, e o cliente troca cada um por `session/set_config_option`. Os **modos antigos** (`modes`, `session/set_mode`) ainda existem e serão removidos. Não há método estável só de modelo: o modelo é uma config option de categoria `model`.

---

## A. Mecanismos e formato exato

### A1. Config options (mecanismo atual, estável)

Fonte primária: schema estável, definições `SessionConfigOption`, `SessionConfigOptionCategory`, `SessionConfigSelect`, `SessionConfigSelectOption`, `SessionConfigSelectGroup`, `SessionConfigBoolean` (CONFIRMADO no schema 1.9.0). Confirmado também na página oficial (ver Fontes).

Entrada de `configOptions`:

| Campo | Obrigatório | Conteúdo |
|---|---|---|
| `id` | sim | identificador da opção (string; ex.: `mode`, `model`) |
| `name` | sim | rótulo para a tela |
| `description` | não | texto de ajuda (ou `null`) |
| `category` | não | semântica **só para UX**: `mode`, `model`, `model_config`, `thought_level`, ou outra string (categorias sem `_` são reservadas pelo spec; com `_` são livres) |
| `type` | não (padrão `select`) | `select` (lista) ou `boolean` (liga/desliga, só se o cliente declarar `session.configOptions.boolean`) |
| `currentValue` | sim | para `select`: id do valor atual (string); para `boolean`: `true`/`false` |
| `options` | sim em `select` | lista **plana** (`value`, `name`, `description`) **ou** **agrupada** (`group`, `name`, `options[]`); não se misturam no mesmo array |

- As categorias são lidas como dica de UX: "MUST NOT be required for correctness". Cliente deve tratar categoria ausente ou desconhecida.
- Exemplo de valores de `category` no schema: `mode` (seletor de modo), `model` (seletor de modelo), `model_config` (parâmetros do modelo, ex.: tamanho de contexto, velocidade/qualidade; o spec pede que apareçam perto do seletor de modelo), `thought_level` (nível de raciocínio).

**Como o cliente muda:** `session/set_config_option` (método `session/set_config_option` no `AGENT_METHODS`; SDK: `setSessionConfigOption`, que **não** está marcado `@experimental` na 1.9.0).
- Requisição: `sessionId`, `configId`, `value`. Para boolean, também `"type": "boolean"` e `value` booleano. Para select, `value` é o id do valor (string).
- Resposta: `configOptions` com a **lista completa** e os valores atuais. O spec diz que isso existe porque trocar uma opção pode mudar as outras (ex.: trocar o modelo muda os níveis de raciocínio disponíveis).

**Como o agente avisa uma mudança:** notificação `session/update` com `sessionUpdate: "config_option_update"` e `configOptions` completo (schema `ConfigOptionUpdate`, `required: ["configOptions"]`). O spec cita como motivos: troca de modo depois de um planejamento, troca de modelo após limite de uso ou erro, opções que mudam conforme o contexto da execução. Cliente deve substituir a lista inteira pela recebida.

### A2. Modos antigos (legado, em retirada)

- `session/new` (resposta `NewSessionResponse`) pode trazer `modes: { currentModeId, availableModes: [{ id, name, description? }] }` (`SessionModeState`, schema 1.9.0).
- Troca: `session/set_mode` com `{ sessionId, modeId }` (`modeId` deve estar em `availableModes`).
- Aviso: `current_mode_update` como `session/update` com `currentModeId`.
- **Deprecação:** a página de modos diz "Dedicated session mode methods will be removed in a future version of the protocol". Enquanto isso, o spec manda agentes enviarem os dois (modes e configOptions) e, se `configOptions` existir, o cliente deve usá-lo e **ignorar** `modes`.

### A3. Seleção de modelo

- **Estável:** o modelo é uma config option com `category: "model"` (o spec usa `id: "model"` no exemplo). O agente também pode trocar o modelo sozinho (`config_option_update`).
- **Não estável / não presente no SDK 1.9.0:** não encontrei `unstable_setSessionModel`, `session/set_model` nem `SetSessionModel*` no SDK 1.9.0 nem no schema instável (grep feito, sem resultado). Uma busca na web (2026) citava um `unstable_setSessionModel` no SDK 0.13.0; isso está **desatualizado** para a versão que temos e não foi confirmado. Tratar como NÃO IDENTIFICADO na 1.9.0.
- **O que é instável de verdade no SDK 1.9.0** (marcado `@experimental` em `dist/acp.d.ts`): `unstable_forkSession`, `unstable_listProviders` (`providers/list`), `unstable_setProvider` (`providers/set`), `unstable_disableProvider` (`providers/disable`), além de métodos de sessão marcados como experimentais. Não são o seletor de modelo do Buddy, mas o schema instável tem `ProviderInfo`, `ProviderCurrentConfig` (roteamento atual: `apiType`, `baseUrl`, sem segredos) e `ListProvidersResponse`. Isso é o caminho que mais se aproxima de "provedor" como coisa separada (CONFIRMADO no schema instável; uso real: NÃO MEDIDO).

### A4. Provedor e modo de trabalho

- **Modo de trabalho:** config option `category: "mode"` (ou modo legado).
- **Provedor:** não há `category` específica no spec estável. O caminho de provedor é o `providers/*` instável (A3). Para os harnesses que medimos, o "provedor" aparece dentro do próprio harness (ex.: OpenCode lista modelos de vários provedores num só seletor `model`).

### A5. Nível de raciocínio

- `category: "thought_level"` (select). Valores dependem do modelo, quando o agente muda as opções a cada troca de modelo (dependent changes).

---

## B. Quando as opções chegam e se dá para conhecê-las sem gastar uma chamada ao modelo

- **Chegada na sessão:** `configOptions` vem na resposta de `session/new` (campo `NewSessionResponse.configOptions`, `array | null`, "Initial session configuration options if supported by the Agent") e também pode vir em `session/load`, segundo o spec ("The agent MAY return configOptions during Session Setup"). `modes` vem no mesmo `session/new`.
- **Antes de abrir sessão:** o `initialize` (aperto de mão) **não** traz `configOptions` (CONFIRMADO no schema: a resposta de `initialize` não define essa lista; o que vem é `agentCapabilities`, `authMethods`, `agentInfo`). As opções só existem depois de `session/new`.
- **Gasta chamada ao modelo?** Pelo que está no schema e na página, `session/new` **não** exige prompt; não há indicação de que crie uma chamada de modelo. Mas isso é leitura do contrato: **NÃO MEDIDO** que cada harness não gaste nada ao abrir sessão. Medido só que `session/new` concluiu sem tarefa nos harnesses da sonda (registro de 2026-10-18: OpenCode, Copilot, Hermes ficaram "pronto" e foram fechados; nada sobrou em processo).
- **Limitação:** a lista de modelos do OpenCode, por exemplo, chega dentro de `session/new` e é grande (811 modelos medidos, segundo a ficha `acp-permissoes-dos-harnesses.md`). O Buddy já tem catálogo próprio por provedor (`docs/20-conhecimento/acp-registro-e-orquestradores.md`), medido em 2026-10-17.

---

## C. Tabela por harness

Só o que está escrito nos nossos registros e fichas. "Não medido" quer dizer que nenhum registro guardou a lista de opções.

| Harness | Versão medida | Opções declaradas (registro) | Categoria declarada | Origem do dado | Lacuna |
|---|---|---|---|---|---|
| **OpenCode** | 2.0.31 | `model` (lista longa, 811 modelos na listagem sem corte) e `mode` com `build`/`plan`, atual `build` | `mode` (categoria do modo; `model` com categoria não registrada) | Ficha `acp-permissoes-dos-harnesses.md` (corrigida em 2026-10-19; a primeira leitura, de 2026-10-18, dizia "só model", por corte de saída) | `model_config`, `thought_level`: não registrados. Permissões não são opção de sessão (configuradas por `permission`) |
| **Codex** (`codex-acp` 2.2.2) | 2.2.2 (CLI 0.163.0) | `mode` (`read-only`, `workspace-write`, `agent` padrão, `agent-full-access`); `collaboration_mode` (`default`/`plan`); `model`; `reasoning_effort` com valores `low`, `medium`, `high`, `xhigh`, `max`, `ultra`, atual `high`; `fast-mode` (`off`/`on`) | `mode` (confirmado para `mode`); `reasoning_effort` com categoria `thought_level` (confirmado); `collaboration_mode`, `model`, `fast-mode`: categoria **não registrada** | Ficha (2026-10-19, listagem sem corte) e registro da permissão pelo núcleo (2026-10-19) | Categoria exata de `model` e `fast-mode` não anotada. Valores de `reasoning_effort` por modelo: registro do seletor (2026-10-19) |
| **Claude Agent** (`claude-agent-acp`) | não medido | não medido | não medido | — | Aguarda aprovação de `npx` na sonda (2026-10-18). Nenhuma lista guardada |
| **Copilot** (1.0.97) | 1.0.97 | não medido (só `initialize` e `session/new` "pronto", sem registro das opções) | não medido | Sonda de 2026-10-18 (sem campo de opções) | Lista de opções, categorias e permissões: nada registrado |
| **pi ACP** | não medido | não medido | não medido | — | Aguardou aprovação na sonda (2026-10-18) |
| **Hermes** (0.22.2) | 0.22.2 | não medido (só `initialize` e sessão "pronto", 14,1 s) | não medido | Sonda de 2026-10-18 | Lista de opções nunca registrada; sessão de teste não foi fechada (sem `session/close`) |

Observação: a ficha de permissões ainda diz que "os outros harnesses (Copilot, Hermes, Claude, pi) ainda não foram medidos" para permissões (2026-10-19); isso vale também para opções.

---

## D. Implicações para o Rabelus Buddy

1. **Usar `configOptions` como fonte principal, e tratar `modes` só como fallback.** O spec manda o cliente ignorar `modes` quando `configOptions` existir. Hoje `packages/core/src/harness/session.ts` (linha ~113) só lê `configOptions` e **não** lê `modes`: um agente que mande só `modes` cai em `mode = null`. Sem medição de agente que faça isso, é PROVÁVEL que não cause dano hoje, mas o fallback é barato e cabe no contrato.
2. **Hoje o núcleo só entende a opção de modo, e isso tem uma falha provável.** O código lê `options` como lista plana (`'value' in x`). Pelo spec, `options` pode vir **agrupada** (`group` + `options[]`). Num harness com grupos, `values` ficaria vazio, `preferMode` nunca bate e o modo pedido é ignorado sem aviso. **CONFIRMADO** pela leitura do código e do schema; **HIPÓTESE** de que isso aconteça com algum harness real (nenhum registro mostra opções agrupadas). Corrigir antes da M1.5 (seletor do Buddy).
3. **Ouvir `config_option_update`.** Nenhum trecho de `session.ts` trata `config_option_update` (só `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`). Sem isso, uma troca de modelo feita pelo agente (após limite de uso, por exemplo) não aparece no painel. Deve substituir a lista inteira, não mesclar.
4. **O modelo é uma opção, não um método.** Para o seletor de modelo do Buddy, o caminho estável é `category: "model"` + `session/set_config_option`. Não há `set_model` na 1.9.0. Não construir sobre `unstable_setSessionModel` (citado em buscas, mas ausente do SDK instalado).
5. **Esforço é dependente do modelo.** A resposta de `set_config_option` traz a lista completa: o painel deve **recalcular** `thought_level` (e `model_config`) depois de cada troca de modelo, em vez de manter a lista antiga. Os registros de 2026-10-19 já mostram que o esforço muda por modelo (ChatGPT `ultra` recusado pela API de respostas; OpenRouter sem esforço declarado).
6. **Provedor fica fora da config option.** O caminho `providers/list`/`providers/set` é instável no SDK 1.9.0 (marcado `@experimental`). Para o Buddy, a escolha de provedor deve continuar no catálogo próprio do núcleo (ADR 0014/0015 e o registro de 2026-10-17) até o protocolo estabilizar. Não depender de `providers/*` agora.
7. **Medir ao vivo antes de prometer o seletor para os seis harnesses.** Falta, por harness: (a) lista de `configOptions` depois de `session/new`, com categorias e se há `options` agrupadas; (b) se `session/new` gasta alguma chamada de modelo (medir o custo); (c) se `config_option_update` chega após `set_config_option` e após um erro de limite; (d) o `session/set_config_option` com `value` de `thought_level` em um modelo que recusa o valor. Pelos registros, Copilot, Hermes, Claude e pi estão em **não medido** para tudo isso.
8. **Não tratar categoria como verdade.** O spec diz que a categoria é só UX. O Buddy deve achar o seletor de modelo pela categoria `model` mas, na falta dela, cair no `id` ou no nome, e nunca bloquear a tela por ausência de categoria. Registrar isso como regra de contrato, com teste.

---

## Fontes

Locais (leitura, sem alteração):
- `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy\node_modules\@agentclientprotocol\sdk\package.json` (versão 1.9.0)
- `...\node_modules\@agentclientprotocol\sdk\schema\schema.json` (definições `SessionConfigOption`, `SessionConfigOptionCategory`, `SessionConfigSelect*`, `SessionConfigBoolean`, `SetSessionConfigOption*`, `ConfigOptionUpdate`, `SessionModeState`, `SetSessionModeRequest`, `NewSessionResponse`)
- `...\node_modules\@agentclientprotocol\sdk\schema\v2\schema.unstable.json` (`ProviderInfo`, `ProviderCurrentConfig`, `ListProvidersResponse`, `SetProviderRequest`, `SystemPromptMode`)
- `...\node_modules\@agentclientprotocol\sdk\dist\acp.d.ts` (`setSessionMode`, `setSessionConfigOption`, `@experimental` nas linhas 1053 a 1583) e `dist\schema\index.d.ts` (`AGENT_METHODS`)
- `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy\packages\core\src\harness\session.ts` (linhas 76 a 121: leitura de `mode` e `session/set_config_option`)
- `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy\docs\20-conhecimento\acp-permissoes-dos-harnesses.md` (ficha, última verificação 2026-10-19)
- `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy\docs\20-conhecimento\acp-registro-e-orquestradores.md` (catálogo, 2026-10-17)
- `docs\registros\2026-10-16T013440-0300-sonda-dos-provedores-reais\README.md`
- `docs\registros\2026-10-18T195529-0300-checagem-real-da-sonda-dos-harnesses\README.md`
- `docs\registros\2026-10-18T220140-0300-checagem-real-da-conversa-por-acp\README.md`
- `docs\registros\2026-10-19T012430-0300-checagem-real-das-permissoes-pelo-nucleo\README.md`
- `docs\registros\2026-10-19T115201-0300-ensaio-do-seletor-de-modelo-m1-5c\README.md`

Web (lidas em 2026-10-20):
- https://agentclientprotocol.com/protocol/session-config-options (configOptions, categorias, set_config_option, config_option_update, modelo; versão em `/protocol/session-config-options`)
- https://agentclientprotocol.com/protocol/session-modes (modes, set_mode, current_mode_update, deprecação)
- https://agentclientprotocol.com/announcements/session-config-options-stabilized (data 2026-02-04: RFD de config options concluído e estabilizado)
- Busca web "Agent Client Protocol model selection session config option unstable models ACP 2026" (2026-10-20): cita `unstable_setSessionModel` no SDK 0.13.0; NÃO confirmado na 1.9.0 instalada.

Não medido nesta missão: nenhum harness foi executado; nenhuma chamada a modelo; nenhum arquivo do repositório foi alterado.

Grau de certeza: os formatos (A1, A2) são **CONFIRMADOS** pelo schema 1.9.0 e pelas páginas oficiais. A ausência de `set_model` na 1.9.0 é **CONFIRMADA** pelo grep. O custo de `session/new` e os dados de Copilot, Hermes, Claude e pi são **NÃO IDENTIFICADO** / não medido.

## Histórico de verificações

- 2026-10-20T10:12:48-03:00: criação, a partir da missão W3 do piloto.
