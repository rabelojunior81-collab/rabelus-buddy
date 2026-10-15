---
status: aceita (2026-10-15)
date: 2026-10-15
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Ordem de provedores do núcleo: OpenCode Go, Ollama Cloud, ChatGPT, OpenRouter

## Contexto e problema

A [ADR 0014](./0014-assinaturas-consumidas-pelo-nucleo.md) definiu a ordem Go → ChatGPT (Sign in with ChatGPT) → API paga. No mesmo dia, o Pai pôs chaves do OpenCode Go, do OpenRouter e do Ollama Cloud em `.buddy-dev/.env.local` e definiu a ordem: **"Opencode Go; Ollama Cloud; Chatgpt; API Paga é o Openrouter"**.

## Decisão

Ordem de preferência do núcleo, substituindo a ordem da ADR 0014. O resto dela continua valendo: consumo direto das assinaturas, SDK por rota, contrato do Sign in with ChatGPT e privacidade.

1. **OpenCode Go:** `https://opencode.ai/inference/go/v1`, com SDK por rota (ADR 0014).
2. **Ollama Cloud:** `https://ollama.com/api`, `Authorization: Bearer <OLLAMA_API_KEY>`; aceita clientes OpenAI e Anthropic num "subset of the original API". A ficha define a rota antes do código. Segundo a página oficial, "We do not use them to train models".
3. **ChatGPT Plus** por Sign in with ChatGPT (ADR 0014).
4. **API paga = OpenRouter:** `https://openrouter.ai/api/v1`, "drop-in replacement" do SDK `openai`, com teto de **US$ 20/mês** (SPEC 0001). OpenAI, Anthropic e Gemini diretos por chave paga saem do M0.

Fatos e fontes em [assinaturas-de-agentes](../20-conhecimento/assinaturas-de-agentes.md).

### Consequências

* Bom, porque os três primeiros provedores são assinaturas e o pago fica por último
* Bom, porque OpenRouter e Ollama Cloud reaproveitam os SDKs já aprovados, sem dependência nova
* Ruim, porque o Ollama Cloud tem compatibilidade parcial com os clientes OpenAI e Anthropic: os limites dela entram na ficha e viram teste do adaptador
* Ruim, porque limites, preços e retenção do Ollama Cloud e do OpenRouter ainda não estão na ficha: precisam de verificação antes da sub-fase M0.6
