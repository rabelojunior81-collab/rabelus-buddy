# Assinaturas de agentes: ChatGPT (Codex) e OpenCode Go

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T12:05:00-03:00 · **Estado:** vigente · **Reverificar:** a cada marco (listas de modelos e limites mudam sem aviso)

## O que importa para o buddy

Por decisão do Pai ([ADR 0008](../60-decisoes/0008-orcamento-por-assinaturas.md)), o trabalho pesado dos agentes vai pelas assinaturas **ChatGPT Plus (US$ 20)** e **OpenCode Go (US$ 10)**, conduzidas pelo núcleo via **ACP**. Os dois caminhos existem e foram conferidos hoje.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| OpenCode Go: US$ 10/mês (Go Plus: US$ 40) | https://opencode.ai/docs/go/ (tier 0) | 2026-10-14 |
| Go inclui, entre outros: **Claude Haiku 5.5**, **GPT 6 Luna**, GPT 5.6 Luna, Gemini 4 Argon Contributor, GLM-5.3, Kimi K3, Qwen3.8, DeepSeek V4.1 Flash / V4 Pro, MiniMax M3 (lista "pode mudar") | idem | 2026-10-14 |
| Limites do Go: por modelo, em dólares por mês (US$ 15 a 80), com janelas de 5 h (20%), semana (50%) e mês (100%) | idem | 2026-10-14 |
| Termos do Go: feito "principalmente para o OpenCode e outros agentes de código"; o cliente deve se identificar com user agent próprio e enviar `x-opencode-session` estável; workspace de um membro só | idem | 2026-10-14 |
| Privacidade no Go: Gemini 4 Argon Contributor e Muse Spark podem usar prompts e respostas para treino; não são ZDR | idem | 2026-10-14 |
| OpenCode como agente ACP: `opencode acp`, JSON-RPC por stdio; ferramentas, MCP, `AGENTS.md`, agentes e permissões funcionam; `/undo` e `/redo` não | https://opencode.ai/docs/acp/ (tier 0) | 2026-10-14 |
| ChatGPT Plus: US$ 20/mês; inclui Codex CLI; estimativa por janela de 5 h: GPT-6 Luna 350–3.000, GPT-6.1 Sol 15–160, GPT-6 Astra 5–45 mensagens; "These estimates are not fixed message limits" | https://learn.chatgpt.com/docs/pricing (tier 0) | 2026-10-14 |
| Adaptador ACP do Codex: `@agentclientprotocol/codex-acp` **2.2.2** (Apache-2.0 no npm), sobre o Codex App Server; autenticação por **login ChatGPT**, chave de API ou gateway | npm + github.com/agentclientprotocol/codex-acp (tier 1) | 2026-10-14 |
| O adaptador antigo `zed-industries/codex-acp` está **arquivado** e aponta para o novo | API do GitHub (tier 1) | 2026-10-14 |
| Nomes `rbuddy` e `rabelus-buddy`: livres no npm; `rbuddy` sem fórmula no Homebrew; existe um repositório pequeno `jkvor/rbuddy` (12 estrelas) | registry.npmjs.org; formulae.brew.sh; busca do GitHub | 2026-10-14 |

## Implicações

- O núcleo do buddy precisa de um cliente ACP desde cedo (M1): é por ele que o trabalho entra nas assinaturas.
- O cliente ACP deve se identificar corretamente (user agent próprio, sessão estável), conforme os termos do Go.
- Política padrão de privacidade: modelos que treinam com os dados ficam desligados para conteúdo do usuário.
- Limites são por janela: o orçamento do núcleo passa a contar janelas de assinatura, não só dólares.

## Histórico de verificações

- 2026-10-14T12:05:00-03:00 · buddy-dev (claude-code-671f81) · criação da ficha
