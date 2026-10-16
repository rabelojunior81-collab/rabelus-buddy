# Sonda dos provedores reais (M0.6)

**Classe:** REGISTRO · **Data:** 2026-10-16T01:34:40-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-fe93fb`) · **Para:** SPEC 0001, M0.6 (ADRs 0014 e 0015)

## O que foi feito

Listagem de modelos (sem gerar tokens, sem custo) nos três provedores com chave de API, usando as chaves do Pai em `.buddy-dev/.env.local`. O script ([`sonda-modelos.mjs.txt`](./sonda-modelos.mjs.txt)) imprime status e contagem, nunca as chaves. O `User-Agent` é próprio, como pedem os termos do Go.

## Resultado

| Provedor | Endpoint | Status | Modelos |
|---|---|---|---|
| OpenCode Go | `https://opencode.ai/inference/go/v1/models` | 200 | 37 (inclui `gpt-6-luna`, `claude-haiku-5-5`, `kimi-k3`) |
| Ollama Cloud | `https://ollama.com/v1/models` | 200 | 20 |
| OpenRouter | `https://openrouter.ai/api/v1/models` | 200 | 465 |

## Achado: o Node não confiava na cadeia do OpenRouter

- **Primeira execução:** o OpenRouter falhou no Node com `SELF_SIGNED_CERT_IN_CHAIN`, e o Ollama Cloud teve um `fetch failed`. Pelo `curl` (schannel, repositório do Windows), os três responderam 200.
- **Cadeia do OpenRouter, lida pelo `tls.connect`:** `openrouter.ai ← WE1 ← GTS Root R4 ← GlobalSign Root CA`. É legítima (Google Trust Services); não há interceptação.
- **Leitura (PROVÁVEL):** o pacote de certificados embutido no Node 26.11 não aceita essa raiz, e o repositório do Windows aceita.
- **Correção comprovada:** `tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...tls.getCACertificates('system')])`, que existe desde o Node 24.5 e 22.19. Ela **soma** os certificados do sistema aos embutidos, sem tirar nenhum. Com isso, os três responderam 200 pelo Node.
- **No produto:** os transportes HTTP do núcleo chamam essa soma uma vez, na partida. Desligar a verificação de TLS está fora de questão.

## O que não foi feito

Nenhuma chamada que gera tokens. A primeira chamada real de modelo fica para os testes manuais da M0.6, registrados à parte.

## Adendo — uma chamada real mínima por rota (2026-10-16, depois dos adaptadores da M0.6a)

[`smoke-provedores.ts.txt`](./smoke-provedores.ts.txt), com os adaptadores do núcleo. Pedido: "responda apenas ok".

| Rota | Modelo | Resultado | Usage normalizado (entrada / cache / escrita / saída) |
|---|---|---|---|
| Go, Responses (`openai`) | `gpt-6-luna` | "ok", stop, 2,2 s | 23 / 0 / 0 / 22 |
| Go, Chat Completions (`openai`) | `kimi-k3` | com teto de 64: vazio, `length`; com 1.024: "ok", stop | 111 / 0 / 0 / 110 |
| Go, Messages (`@anthropic-ai/sdk`) | `claude-haiku-5-5` | "ok", stop, 0,8 s | 29 / 0 / 0 / 4 |
| Ollama Cloud, Chat Completions | `gpt-oss:20b` | "ok", stop | 88 / 68 / 0 / 38 |
| OpenRouter, Chat Completions | `nvidia/nemotron-3.5-super-vl:free` (sem custo) | com 64: vazio, `length`; com 1.024: "ok", stop | 29 / 0 / 0 / 36 |

**Leitura:**
- **CONFIRMADO:** os quatro adaptadores, o `User-Agent` próprio e o `x-opencode-session` funcionam nos provedores reais.
- **Achado:** modelos de raciocínio gastam a saída pensando. Com teto baixo, a resposta vem vazia e com `length`. O loop usa teto padrão generoso, e a estimativa do orçamento acompanha.
- A rota Google do Go não foi chamada: o único modelo dela treina com os dados e fica negado por padrão (critério 20).
