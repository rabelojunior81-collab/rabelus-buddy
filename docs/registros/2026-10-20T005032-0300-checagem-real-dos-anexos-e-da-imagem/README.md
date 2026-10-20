# Checagem real: anexos e imagem no núcleo (M1.3a)

**Classe:** REGISTRO · **Data:** 2026-10-20T00:50:32-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-d51ce9`) · **Para:** SPEC 0002, critério 9 (AGENTS §5.9)

## Como

- **A imagem:** um PNG de 16×16 pixels, todo na cor RGB (220, 20, 20), um vermelho, gerado na hora (79 bytes). Ele foi guardado pelo módulo de anexos do núcleo, com o hash no nome, e lido de volta com o hash conferido.
- **O pedido:** os adaptadores reais montaram o pedido com a pergunta "Qual é a cor desta imagem? Responda com uma palavra."
- **Credenciais:** as do Pai, para o ChatGPT; a do ambiente, para o OpenRouter. Nenhuma chave foi impressa, e os scripts ficam fora do repositório.

## Resultado

| Caminho | Formato | Resposta | Tempo |
|---|---|---|---|
| ChatGPT `gpt-6.1-sol` (API de respostas) | `input_image` | "Vermelha" / "Vermelho" | 7,4 s / 2,6 s |
| OpenRouter `nvidia/nemotron-3.5-super-vl:free` (Chat) | `image_url` | vazio com limite de 300 tokens; "Vermelho" com 2.000 (170 tokens, com raciocínio) | 2,5 s / 3,2 s |
| OpenCode 2.0.32 (ACP) | bloco `image` | "Vermelho." | 8,9 s |
| Codex, `codex-acp` 2.2.2 (ACP) | bloco `image` | "Laranja" (leitura imprecisa; a imagem chegou) | 16,8 s |

O OpenCode foi atualizado de 2.0.31 para 2.0.32 desde a medida de 18/10.

## Achado e correção, com teste antes

**Resposta vazia que não era detectada.** Com limite baixo, o Nemotron gastou tudo em raciocínio e devolveu texto vazio, cortado pelo limite (`finish: length`). A regra de resposta vazia do agente exigia zero tokens de saída, e esse caso terminaria como "concluída", muda.

Agora ele também é resposta vazia: a ordem troca de rota, e o motivo diz que o limite acabou antes do texto. O agente usa 16.000 tokens de limite, o que torna o caso improvável no produto (PROVÁVEL), mas ele fica coberto.

## Limites

- **Sem rota com visão:** o caminho de pular a rota foi provado com o provedor falso (`anexos-console.test.ts`), não com uma chamada real recusada. A tabela medida diz que o `gpt-oss` não enxerga, e o núcleo nem o chama.
- **Console:** os anexos na console nova (anexar, arrastar, colar) são a M1.3b.
