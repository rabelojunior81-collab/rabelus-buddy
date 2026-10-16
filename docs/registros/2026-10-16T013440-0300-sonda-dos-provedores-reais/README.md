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
