# Pi (coding agent de Mario Zechner, hoje earendil-works)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-16T00:19:18-03:00 · **Estado:** vigente (reverificar no M1; o projeto publica quase todo dia)

## O que importa para o buddy

- O Pi é um **harness mínimo** de agente de código: TUI madura, loop de agente, API multiprovedor, sessões, extensões e modos interativo, print, JSON, RPC e SDK. MIT, comunidade muito grande, ativo hoje.
- Ele **não tem sistema de permissões** embutido, por escolha de projeto. Extensões podem interceptar e **bloquear** chamadas de ferramenta (`tool_call`).
- Ele não tem o que é o núcleo do Rabelus Buddy: log de eventos com dono único, política com escopos, orçamento atômico por janela, efeitos com identidade e estado desconhecido, e i18n. **Forkar o Pi não economiza o M0**; o que ele traz pronto é a parte barata (CLI e TUI) e o loop.
- Caminho de composição (ADR 0010): conduzir o Pi como agente plugável no M1 (SDK ou RPC), com uma extensão nossa que passa cada `tool_call` pela política do núcleo.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Repositório canônico `earendil-works/pi` (o `badlogic/pi-mono` redireciona para ele); MIT; 115.431 estrelas; 14.709 forks; não arquivado; último push 2026-10-15 19:21 UTC; 85 MB; cerca de 300 contribuidores ou mais (paginação da API) | API do GitHub (tier 1) | 2026-10-15 |
| Pacotes atuais `@earendil-works/pi-coding-agent`, `-pi-agent-core`, `-pi-ai`, `-pi-tui` na **1.3.0**, MIT, publicados em 2026-10-15; os antigos `@mariozechner/*` pararam na 0.73.1 (2026-05-07) | registro npm (tier 1) | 2026-10-15 |
| Dependências de `pi-coding-agent` 0.73.1: cerca de 20 diretas (diff, glob, jiti, yaml, chalk, marked, undici, typebox, minimatch, extract-zip, proper-lockfile…), todas com faixa `^`; `pi-ai` traz `openai` 6.26.0, `@anthropic-ai/sdk` ^0.91, `@google/genai` ^1.40, `@mistralai/mistralai`, `@aws-sdk/client-bedrock-runtime` | registro npm (tier 1) | 2026-10-15 |
| "Pi is a minimal, extensible agent harness that you can make your own"; "skips features like sub-agents and plan mode"; modos interativo, print/JSON, RPC e SDK TypeScript; requer Node 22.19+ | https://github.com/earendil-works/pi (README do coding-agent, tier 1) | 2026-10-15 |
| Extensões: "`tool_call` can mutate input or block execution"; falha no handler bloqueia a ferramenta; eventos `session_start`, `session_shutdown`, `tool_call`, `tool_result`, `before_agent_start`, `agent_end` e outros; `ctx.ui.confirm(...)`; RPC encaminha diálogos suportados; JSON e print sem UI; extensões rodam com as permissões do SO ("load extensions only from sources you trust"). Nenhum sistema de permissões descrito | `packages/coding-agent/docs/extensions.md` (tier 1) | 2026-10-15 |
| Provedores: OpenRouter (`/login openrouter` ou `OPENROUTER_API_KEY`), "OpenCode Zen and Go" (`OPENCODE_API_KEY`), Anthropic, Copilot e endpoints compatíveis com OpenAI por `models.json` (`baseUrl`) | `packages/coding-agent/docs/providers.md` (tier 1) | 2026-10-15 |

| `@earendil-works/pi-tui` 1.3.0 (MIT, Node ≥ 22.19.0): **2 dependências, fixadas** (`marked` 18.0.11, `get-east-asian-width` 1.6.0). Comparação: `ink` 8.0.0 (MIT, Node ≥ 22) tem mais de dez dependências com faixa `^` (chalk, wrap-ansi, cli-boxes, type-fest, es-toolkit…) e usa React | registro npm (tier 1) | 2026-10-16 |

**Não verificado:** suporte a i18n (nenhuma menção encontrada); se o `/login` cobre o Sign in with ChatGPT; formato das sessões em disco.

## Explicação

Forkar significa assumir uma cópia do código e mantê-la para sempre. Com um projeto que publica versão nova quase todo dia, há duas saídas, e as duas custam:
- acompanhar o upstream, resolvendo conflito a cada mudança nossa;
- divergir, e perder as correções dele.

Usar como dependência (sem fork) evita isso, mas cada pacote e cada dependência transitiva passa pelo protocolo de dependências (versão exata, licença, ficha, reverificação).

## Implicações

- **M0:** nada muda. O que o M0 entrega (log, política, orçamento, efeitos, IPC) não existe no Pi.
- **M1:** candidato forte a agente plugável, ao lado do OpenCode e do Codex, por SDK ou RPC, com uma extensão de governança que consulta o núcleo em cada `tool_call`.
- **TUI (depois do M0):** `@earendil-works/pi-tui` e `ink` em avaliação ([ADR 0016](../60-decisoes/0016-pi-por-composicao-e-tui-em-avaliacao.md)). Quando a TUI entrar, o buddy-dev leva ao Pai referências visuais das duas e a avaliação feita no desenvolvimento.
- **Decidido (ADR 0016):** o Pi não é forkado e entra no M1 como agente plugável.

## Histórico de verificações

- 2026-10-15T17:18:32-03:00 · buddy-dev (claude-code-vs-code-7ebb05) · criação da ficha, para a pergunta do Pai sobre forkar o Pi
- 2026-10-16T00:19:18-03:00 · buddy-dev (claude-code-vs-code-6265a4) · dependências do pi-tui e do ink; ADR 0016
