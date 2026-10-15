# Assinaturas de agentes: ChatGPT (Codex) e OpenCode Go

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-15T04:50:26-03:00 · **Estado:** vigente · **Reverificar:** a cada marco (listas de modelos e limites mudam sem aviso)

## O que importa para o buddy

Por decisão do Pai ([ADR 0008](../60-decisoes/0008-orcamento-por-assinaturas.md) e [ADR 0014](../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md)), o trabalho vai pelas assinaturas **OpenCode Go (US$ 10, prioridade)** e **ChatGPT Plus (US$ 20)**. Desde 2026-10-15 há dois caminhos verificados para o **próprio núcleo** consumir as assinaturas, sem esperar o ACP do M1:

- **OpenCode Go por chave de API:** endpoint oficial `https://opencode.ai/inference/go/v1`, compatível com os SDKs da OpenAI (Responses e Chat Completions), da Anthropic (Messages) e do Google.
- **ChatGPT Plus por "Sign in with ChatGPT":** OAuth com PKCE para apps de código aberto, chamando a Responses API em nome do plano, com restrições próprias (`store: false`, `stream: true`, sem `max_output_tokens`).

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| OpenCode Go: US$ 10/mês (Go Plus: US$ 40) | https://opencode.ai/docs/go/ (tier 0) | 2026-10-14 |
| Go inclui, entre outros: **Claude Haiku 5.5**, **GPT 6 Luna**, GPT 5.6 Luna, Gemini 4 Argon Contributor, GLM-5.3, Kimi K3, Qwen3.8, DeepSeek V4.1 Flash / V4 Pro, MiniMax M3 (lista "pode mudar") | idem | 2026-10-14 |
| Limites do Go: por modelo, em dólares por mês (US$ 15 a 80), com janelas de 5 h (20%), semana (50%) e mês (100%) | idem | 2026-10-14 |
| Termos do Go: feito "principalmente para o OpenCode e outros agentes de código"; o cliente deve se identificar com user agent próprio e enviar `x-opencode-session` estável; workspace de um membro só | idem | 2026-10-14 |
| **Go, endpoints oficiais:** base `https://opencode.ai/inference/go/v1`; `/chat/completions` (OpenAI-compatível), `/responses` (OpenAI Responses), `/messages` (Anthropic-compatível), `/models/gemini-4-argon-contributor` (Google); lista em `GET …/models`. Fontes de terceiros citam `/zen/go/v1`: **divergem da página oficial** | https://opencode.ai/docs/go/ (tier 0) | 2026-10-15 |
| **Go, modelos por rota:** Responses: `gpt-6-luna`, `gpt-5.6-luna`, `grok-4.7`, `grok-4.6`, `muse-spark-1.3/1.2-contributor`; Messages: `claude-haiku-5-5`, `minimax-m3`, `qwen3.8-max`…; Chat Completions: `glm-5.3`, `kimi-k3`, `deepseek-v4.1-flash`…; Google: `gemini-4-argon-contributor`. Limite mensal por modelo de US$ 15 a 80 (Go) | idem | 2026-10-15 |
| **Go, retenção:** 30 dias para GPT 6 Luna, GPT 5.6 Luna, Claude Haiku 5.5, Grok 4.7/4.6; 0 dia para GLM, Kimi, Qwen, MiniMax, DeepSeek e outros; treino com os dados em Gemini 4 Argon Contributor e Muse Spark Contributor | idem | 2026-10-15 |
| Go: ao estourar o limite, só modelos gratuitos, ou "Use balance" (saldo pré-pago) se ligado | idem | 2026-10-15 |
| **Sign in with ChatGPT (SIWC):** "Eligible ChatGPT Plus and Pro users can use their ChatGPT plan for AI requests in participating apps"; "ChatGPT plan usage is available to all open-source partners and selected private clients"; apps pagos ou hospedados remotamente: formulário de interesse | https://developers.openai.com/siwc/quickstart · …/siwc/token-sharing-open-source (tier 0) | 2026-10-15 |
| SIWC, fluxo de código aberto: autorização `https://auth.openai.com/api/accounts/authorize`, token `https://auth.openai.com/api/accounts/oauth/token`; primeiro registro com `client_id=dynamic_agent_client`, `ext_agent_host_id` (opaco, um por host, persistido) e `agent_name_hint`; o callback devolve um client id `oaiapp_…`; `resource=https://api.openai.com/v1`; PKCE S256; escopos `openid profile email` + `offline_access resource.invoke chatgpt.tokens.use.direct`; callback em `http://127.0.0.1:<porta>/…` ("Do not substitute with `localhost`"); sem client secret; `expires_in` 3600 no exemplo; refresh token rotativo | https://developers.openai.com/siwc/token-sharing-open-source/sign-in (tier 0) | 2026-10-15 |
| SIWC, inferência: `POST https://api.openai.com/v1/responses` com `Authorization: Bearer <token>`; modelos de `GET /v1/models` (`visibility == "list"`, usar `slug`); exemplo com `gpt-6.1-sol`; **`store: false` e `stream: true` obrigatórios**; sucesso só em `response.completed`; limite estourado chega como `response.failed` com `subscription_sharing_usage_limit_exceeded` ou `subscription_sharing_usage_unavailable` | …/siwc/token-sharing-open-source/models-and-inference (tier 0) | 2026-10-15 |
| SIWC, limitações da prévia: proibidos `max_output_tokens`, `metadata`, `temperature`, `top_p`, `truncation`, `user`, `background`, `conversation`, `previous_response_id` (HTTP), item `system`; ferramentas `function`/`custom` aceitas; sem image generation, file search, code interpreter, MCP hospedado, `tool_search` | …/siwc/token-sharing-open-source/preview-limitations (tier 0) | 2026-10-15 |
| O texto que o Pai trouxe (gerado por outro modelo) acertou o fluxo e o `dynamic_agent_client`, mas **errou o escopo**: não é `with.chatgpt.tokens.use.direct`, é `chatgpt.tokens.use.direct` (com `offline_access resource.invoke`) | comparação com a fonte oficial acima | 2026-10-15 |
| `@opencode-ai/sdk` 1.19.0 (MIT): "Type-safe JS client for opencode server"; controla sessões de agente do OpenCode (`createOpencode`, `session.prompt`), não chama modelos diretamente | https://opencode.ai/docs/sdk/ (tier 0); registro npm (tier 1) | 2026-10-15 |
| Privacidade no Go: Gemini 4 Argon Contributor e Muse Spark podem usar prompts e respostas para treino; não são ZDR | idem | 2026-10-14 |
| OpenCode como agente ACP: `opencode acp`, JSON-RPC por stdio; ferramentas, MCP, `AGENTS.md`, agentes e permissões funcionam; `/undo` e `/redo` não | https://opencode.ai/docs/acp/ (tier 0) | 2026-10-14 |
| ChatGPT Plus: US$ 20/mês; inclui Codex CLI; estimativa por janela de 5 h: GPT-6 Luna 350–3.000, GPT-6.1 Sol 15–160, GPT-6 Astra 5–45 mensagens; "These estimates are not fixed message limits" | https://learn.chatgpt.com/docs/pricing (tier 0) | 2026-10-14 |
| Adaptador ACP do Codex: `@agentclientprotocol/codex-acp` **2.2.2** (Apache-2.0 no npm), sobre o Codex App Server; autenticação por **login ChatGPT**, chave de API ou gateway | npm + github.com/agentclientprotocol/codex-acp (tier 1) | 2026-10-14 |
| O adaptador antigo `zed-industries/codex-acp` está **arquivado** e aponta para o novo | API do GitHub (tier 1) | 2026-10-14 |
| Nomes `rbuddy` e `rabelus-buddy`: livres no npm; `rbuddy` sem fórmula no Homebrew; existe um repositório pequeno `jkvor/rbuddy` (12 estrelas) | registry.npmjs.org; formulae.brew.sh; busca do GitHub | 2026-10-14 |

## Implicações

- **M0:** o núcleo consome o Go direto pelo endpoint oficial, com os SDKs da OpenAI, da Anthropic e do Google conforme a rota do modelo, identificação própria e `x-opencode-session` (ADR 0014). O ChatGPT Plus entra pelo SIWC, com as restrições da prévia.
- **Orçamento por assinatura não tem preço por chamada:** o Go limita em dólares por modelo e janela; o SIWC limita por um teto semanal que o usuário define. O núcleo estima, mede pelo `usage` e trata os erros de limite como fonte de verdade.
- **M1:** o `@opencode-ai/sdk` e o ACP servem para conduzir o OpenCode como agente, não para chamar modelo.

- O núcleo do buddy precisa de um cliente ACP desde cedo (M1): é por ele que o trabalho entra nas assinaturas.
- O cliente ACP deve se identificar corretamente (user agent próprio, sessão estável), conforme os termos do Go.
- Política padrão de privacidade: modelos que treinam com os dados ficam desligados para conteúdo do usuário.
- Limites são por janela: o orçamento do núcleo passa a contar janelas de assinatura, não só dólares.

## Histórico de verificações

- 2026-10-14T12:05:00-03:00 · buddy-dev (claude-code-671f81) · criação da ficha
- 2026-10-15T04:50:26-03:00 · buddy-dev (claude-code-vs-code-3a6e29) · endpoints oficiais do Go, Sign in with ChatGPT (fluxo de código aberto e limitações), SDK do OpenCode; pista externa conferida e corrigida
