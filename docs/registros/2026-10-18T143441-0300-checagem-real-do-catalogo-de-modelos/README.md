# Checagem real: catálogo de modelos com as contas do Pai

**Classe:** REGISTRO · **Data:** 2026-10-18T14:34:41-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-33be25`) · **Para:** SPEC 0002, critério 13, parte do núcleo (AGENTS §5.9)

## Como

`buildModelCatalog` com o login do ChatGPT e as chaves guardadas do Pai, contra os serviços reais e o models.dev. A saída ([saida.txt](./saida.txt)) traz só contagens e cinco amostras; nenhuma chave nem token foi impresso.

## Resultado (CONFIRMADO)

O catálogo saiu em cerca de 1,8 s, sem erros.

| Provedor | Modelos | Labs | Visão | Raciocínio | Com níveis de esforço | Fonte das capacidades |
|---|---|---|---|---|---|---|
| ChatGPT | 8 | 1 | 8 | 8 | 8 | provedor |
| OpenCode Go | 37 | 16 | 21 | 30 | 20 | models.dev (30); sem dados (7) |
| Ollama Cloud | 22 | 10 | 12 | 20 | 12 | provedor |
| OpenRouter | 471 | 58 | 309 | 341 | 209 | provedor |

- **O provedor vence o models.dev no mundo real:** `gpt-oss:20b` sai sem visão, como a Ollama declara e como a medição de 2026-10-17 confirmou (400, "does not support image input").
- **Os números batem com o instantâneo de 2026-10-17** usado no protótipo (8, 37, 22 e 471).
- `qwen3-vl:235b` saiu do catálogo da Ollama desde então: o catálogo é vivo.

## Lacunas registradas no plano

- O ChatGPT declara seis níveis de esforço para `gpt-6.1-sol` (`low`, `medium`, `high`, `xhigh`, `max` e `ultra`). O núcleo executa só `low`, `medium` e `high`. Os outros entram na M1.5, com teste, antes de a console oferecê-los.
- Sete modelos do OpenCode Go não têm dados no models.dev. Aparecem só com o nome, e a fonte "nenhuma" fica visível.
