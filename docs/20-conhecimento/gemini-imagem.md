# Geração de imagem com Gemini (Nano Banana)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-15T03:35:21-03:00 · **Estado:** vigente (reverificar antes de cada geração nova; a família de modelos muda a cada poucos meses)

## O que importa para o buddy

- Para gerar imagem pelo Gemini, o padrão hoje é o **Nano Banana 2.1** (`gemini-nano-banana-2.1`), chamado pela **Interactions API**. O Imagen foi desligado.
- Toda imagem gerada sai com marca d'água **SynthID**. A proveniência de IA vem embutida, e nós a declaramos também.
- Consistência de personagem se consegue com imagens de referência (até 5 de personagem no 2.1) e com edição em vários turnos (`previous_interaction_id`). Isso importa para um avatar que vai ganhar variações.
- No plano pago, uma imagem 2K custa US$ 0,0504 (Standard). Imagens de saída não têm free tier na API.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Modelos de imagem estáveis: `gemini-nano-banana-2.1` (Nano Banana 2.1, novo), `gemini-3.1-flash-image` (Nano Banana 2), `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite), `gemini-3-pro-image` (Nano Banana Pro). `imagen-4.0-generate` está **desligado** | https://ai.google.dev/gemini-api/docs/models (tier 0; rodapé de 2026-10-13) | 2026-10-15 |
| `gemini-2.5-flash-image` foi desligado em 2026-10-02; a página recomenda migrar para 3.1 Flash ou 3.1 Flash Lite Image | https://ai.google.dev/gemini-api/docs/pricing (tier 0; atualizada em 2026-10-14) | 2026-10-15 |
| Nano Banana 2.1 é o "primary high-efficiency model", recomendado para projetos novos; o Pro é para as tarefas visuais mais complexas (consistência de marca, controle criativo preciso) | https://ai.google.dev/gemini-api/docs/nanobanana (tier 0) | 2026-10-15 |
| Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/interactions`, cabeçalho `x-goog-api-key`; corpo com `model`, `input`, `response_format: {type: "image", mime_type, aspect_ratio, image_size}`, `generation_config: {thinking_level}`; resposta com `output_image.data` (base64), `steps`, `id` | https://ai.google.dev/gemini-api/docs/image-generation (tier 0) | 2026-10-15 |
| Tamanhos `1K`, `2K` e `4K`, sempre com **K maiúsculo** (`1k` é rejeitado). O 2.1 não tem 512 px. Os modelos Gemini 3 usam 1K por padrão | idem | 2026-10-15 |
| O raciocínio (thinking) não pode ser desligado nos modelos de imagem Gemini 3. No 2.1 os níveis são `minimal`, `medium` (padrão) e `high`. Os tokens de raciocínio são cobrados | idem | 2026-10-15 |
| Referências: até 14 imagens no total. 2.1 e 3.1 Flash: até 10 de objeto e 5 de personagem. Pro: até 6 de objeto e 3 de estilo | idem | 2026-10-15 |
| Preço por imagem, Standard: 2.1 custa US$ 0,0336 (1K), 0,0504 (2K) e 0,113 (4K). Pro custa 0,134 (1K/2K) e 0,24 (4K). Batch sai pela metade. Entrada do 2.1: US$ 1,50 por 1M de tokens | https://ai.google.dev/gemini-api/docs/pricing (tier 0) | 2026-10-15 |
| Toda imagem gerada leva SynthID | https://ai.google.dev/gemini-api/docs/image-generation (tier 0) | 2026-10-15 |

## Boas práticas (da documentação oficial)

1. **Descrever a cena em vez de listar palavras-chave.** Os modelos são de linguagem, e um parágrafo descritivo funciona melhor que uma lista de tags. O modelo oficial para retrato fotorrealista é: *"A photorealistic [type of shot] of a [subject] in a [setting]. [Light]. Shot from a [camera angle] with a [lens type]."*
2. **Nomear câmera e luz.** Tipo de plano, ângulo, lente e fonte de luz controlam a imagem melhor do que adjetivos.
3. **Iterar em vários turnos.** É a forma recomendada: ajustar o que falta passando `previous_interaction_id`, em vez de reescrever o prompt inteiro.
4. **Travar o que não deve mudar.** Nas edições, escrever "keep everything else exactly the same, preserving the original style, lighting, and composition".
5. **Usar referências para manter consistência.** Para variações de um personagem já definido, mandar a imagem canônica como referência de personagem.
6. **Escolher o modelo pelo trabalho.** 2.1 para quase tudo; Pro quando precisão de marca e texto valem o dobro do preço; Lite para volume sem referência.

Leitura da casa (Blog, `evidence/killian/session-008/avatar-provenance.md`): o avatar da família é um **retrato de personagem**: fotorrealista, 1:1, do peito para cima, num ambiente de trabalho, com insígnia dourada de ave no colarinho, sem texto, sem moldura e sem recorte circular. No Blog, o derivado é um JPEG de 512×512 com menos de 200 KB, e cada ativo traz proveniência com o prompt verbatim.

## Explicação

O Nano Banana não é um modelo de difusão isolado como o Imagen era. A imagem sai de um modelo Gemini multimodal que "pensa" antes de desenhar e pode gerar até duas imagens intermediárias de rascunho. Por isso o prompt rende mais quando é escrito como uma conversa com um diretor de fotografia, e por isso a iteração em turnos funciona: o modelo carrega o contexto da imagem anterior.

A Interactions API substituiu o `generateContent` como interface principal (há um guia de breaking changes de maio de 2026). Exemplos com `responseModalities` e `imageConfig` são de antes e estão marcados como legado.

## Implicações

- O avatar do buddy-dev usa `gemini-nano-banana-2.1`, 1:1, `2K`, `thinking_level: high`. Seguir para o Pro só se o 2.1 falhar no controle de detalhes.
- A chave fica em `.buddy-dev/.env.local`, coberto por `.env.*` no `.gitignore`. Nunca vai para log, ledger ou commit.
- A proveniência de cada imagem guarda modelo, parâmetros, prompt verbatim, `id` da interação, custo estimado e sha256.
- Para o produto: geração de imagem é uma capacidade de provedor, que entraria na camada de composição (ADR 0010), nunca no núcleo.

## Histórico de verificações

- 2026-10-15T03:35:21-03:00 · buddy-dev (claude-code-vs-code-14f5bb) · criação da ficha (models, pricing, image-generation, nanobanana)
