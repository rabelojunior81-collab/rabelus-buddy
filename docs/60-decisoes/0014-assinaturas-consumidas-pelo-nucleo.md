---
status: aceita (2026-10-15)
date: 2026-10-15
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Assinaturas consumidas pelo próprio núcleo: OpenCode Go primeiro, ChatGPT pelo Sign in with ChatGPT

## Contexto e problema

A [ADR 0008](./0008-orcamento-por-assinaturas.md) pôs o trabalho dos agentes nas assinaturas ChatGPT Plus e OpenCode Go, conduzidas por ACP no M1. O provedor do M0 seria pago por token. Em 2026-10-15, ao responder à SPEC 0001, o Pai decidiu: a **prioridade na configuração é a API do OpenCode Go**, e o ChatGPT deve entrar pelo "Sign in with ChatGPT". SDKs definidos: **OpenAI, Anthropic e Gemini**; extra: **SDK do OpenCode**.

A pesquisa do mesmo dia ([assinaturas-de-agentes](../20-conhecimento/assinaturas-de-agentes.md)) confirmou que os dois caminhos existem para o próprio núcleo, sem ACP.

## Opções consideradas

* Provedor do M0 pago por token (proposta original da SPEC 0001)
* Assinaturas só no M1, por ACP (ADR 0008 como estava)
* Assinaturas consumidas pelo núcleo desde o M0: OpenCode Go por chave, ChatGPT por SIWC, API paga como reserva

## Decisão

Opção escolhida: **"Assinaturas consumidas pelo núcleo desde o M0"**, por decisão do Pai.

Ordem de preferência na configuração:
1. **OpenCode Go**, pela chave da assinatura, no endpoint oficial `https://opencode.ai/inference/go/v1`. O SDK é escolhido pela rota do modelo:
   - `openai` para `/responses` e `/chat/completions`;
   - `@anthropic-ai/sdk` para `/messages`;
   - `@google/genai` para a rota Google.

   Exigências dos termos do Go: user agent próprio (`rabelus-buddy/<versão>`) e `x-opencode-session` estável por conversa.
2. **ChatGPT Plus por Sign in with ChatGPT**, no fluxo de código aberto: OAuth com PKCE e callback em `127.0.0.1`, Responses API com `store: false` e `stream: true`, sem os campos que a prévia proíbe.
3. **API paga por token** (OpenAI, Anthropic ou Gemini), só como reserva, com o teto de **US$ 20/mês** dado pelo Pai.

O `@opencode-ai/sdk` controla o servidor do OpenCode como agente, por isso entra no M1, junto do ACP. A ADR 0008 continua valendo para o M1.

### Consequências

* Bom, porque o trabalho do M0 já roda dentro dos US$ 30 fixos das assinaturas, sem pagar por token
* Bom, porque os três SDKs oficiais cobrem todas as rotas do Go e o caminho pago, com um adaptador por rota
* Ruim, porque assinatura não tem preço por chamada: o orçamento passa a ser por janela (Go: dólares por modelo, 5 h = 20%, semana = 50%, mês = 100%; SIWC: teto semanal do usuário), com estimativa e reconciliação pelos erros de limite
* Ruim, porque o SIWC proíbe `max_output_tokens`: a reserva nesse caminho é por estimativa, não por teto garantido
* Ruim, porque o SIWC está em prévia e o Go diz que outros clientes "podem deixar de funcionar": os adaptadores ficam isolados e a ficha é reverificada a cada marco
* Privacidade: no Go, modelos que treinam com os dados (Gemini 4 Argon Contributor, Muse Spark) ficam negados por padrão; os de 30 dias de retenção são permitidos, e isso é declarado ao usuário
