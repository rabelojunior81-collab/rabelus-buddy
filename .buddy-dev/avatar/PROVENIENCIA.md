# Proveniência — avatar do Buddy Fenix

**Classe:** PROVENIÊNCIA · **Data:** 2026-10-15 · **Gerado por:** Buddy Fenix (sessão `claude-code-vs-code-14f5bb`, Claude Code no VS Code, `claude-opus-5-5`) · **Escolhido por:** Pai (v3-b)

## Ativos

| Arquivo | Uso | Bytes | sha256 |
|---|---|---|---|
| `original/buddy-fenix-v3-b-2048.jpg` | original, 2048×2048, saída direta da API | 2.709.827 | `7a83ca30bc8576f5144d95816238565e3b835efb74a8a9b5e9995f182520f71d` |
| `buddy-fenix-avatar-1024.jpg` | derivado de alta | 146.108 | `a06e34f35a96b9eeb64de0b0d0ecfeac0829964842539e8c48d2a0bc808daaa6` |
| `buddy-fenix-avatar-512.jpg` | derivado do Blog (teto da casa: 200 KB) | 44.601 | `6b46d6feadbf8c66fadf7eee80a46cca18f9e5edf9e55c6f9966261ac7d20671` |

Derivação: Pillow, `resize(LANCZOS)`, `save(quality=88, optimize=True)`. Cantos retos, sem recorte nem moldura.

## Geração

| Campo | Valor |
|---|---|
| Modelo | `gemini-nano-banana-2.1` ([ficha](../../docs/20-conhecimento/gemini-imagem.md)) |
| API | Interactions API, `POST /v1beta/interactions` |
| `response_format` | `image/jpeg`, `1:1`, `2K` |
| `thinking_level` | `high` |
| Entrada | imagem de referência `rabelus-lab-blog/images/author-killian.jpg` + o prompt [`prompts/v3.txt`](./prompts/v3.txt) (verbatim) |
| `id` da interação | `v1_Chd1M2JRYW9HZEZ0T1BtdGtQb2FTb21BNBIXdTNiUWFvR2RGdE9QbXRrUG9hU29tQTQ` |
| Uso | 1.469 tokens de entrada (1.120 de imagem); 1.680 de saída de imagem; 1.418 de raciocínio |
| Resposta (sem os dados binários) | [`original/buddy-fenix-v3-b.json`](./original/buddy-fenix-v3-b.json) |
| Script | [`prompts/gerar.mjs.txt`](./prompts/gerar.mjs.txt), guardado como registro. Não é ferramenta do repositório e não tem teste |
| Marca d'água | SynthID (todas as imagens do Nano Banana a levam) |

## Custo da missão

Cinco imagens 2K saíram nesta sessão: v1-a, v1-b (edição), v2-a, v3-a e v3-b. A US$ 0,0504 cada pela tabela (2026-10-15), são cerca de **US$ 0,25**, mais os tokens de raciocínio e de entrada. A tarifa do raciocínio no 2.1 eu não verifiquei. Duas chamadas falharam sem gerar imagem: um 400 (PNG não aceito) e um 429 (teto de gasto do projeto, que o Pai ajustou).

## Hashes das tentativas recusadas

Os originais das tentativas não entraram no repositório; ficam na folha de contato `tentativas/`. Os hashes provam o que existiu:

| Tentativa | sha256 do original 2048 |
|---|---|
| v1-a | `a000981ea14c68b37e0b0c270072f1914c9f3dce0d3afec17ec4f6d4393949a0` |
| v1-b | `42a7d269045505266f37b3cd12273439b4ae70e5cebdfeffcb6e688429fa0d6f` |
| v2-a | `2ee8618d1750c9507f5321216fe004c7eca0014a3bf01dbc8e515dd19090b373` |
| v3-a | `51b694afc1de4d4d7e9d95b1d9bf3d8562d18251d4a54188621a969428e52881` |

Os prompts dessas tentativas: [`v1.txt`](./prompts/v1.txt), [`v1-edit1.txt`](./prompts/v1-edit1.txt), [`v2.txt`](./prompts/v2.txt). A v3-a usou o mesmo [`v3.txt`](./prompts/v3.txt).
