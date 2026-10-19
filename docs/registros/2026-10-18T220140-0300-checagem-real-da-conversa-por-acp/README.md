# Checagem real: conversa por ACP com o OpenCode e o Codex do Pai

**Classe:** REGISTRO · **Data:** 2026-10-18T22:01:40-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-4efb65`) · **Para:** SPEC 0002, critério 5 (AGENTS §5.9)

## Como

Um script chamou o mesmo `promptTurn` do núcleo (`packages/core/src/harness/session.ts`) com os harnesses instalados no computador do Pai, numa pasta temporária nova a cada turno. O script fica fora do repositório. Nenhuma permissão foi concedida pelo núcleo: todo pedido seria respondido com `cancelled`. Os processos subiram sem janela e foram encerrados com a árvore, e a lista de processos não mostrou sobra.

## Turno simples ("Responda apenas com a frase: conversa por ACP funcionando.")

| Harness | Lançamento | Tempo | `stopReason` | Atualizações | Resposta |
|---|---|---|---|---|---|
| OpenCode 2.0.31 | executável local (`opencode acp`) | 4,8 s | `end_turn` | 1 de texto | a frase pedida |
| Codex (`codex-acp` 2.2.2) | `npx`, primeira execução aprovada pelo Pai | 11,1 s | `end_turn` | 6 de texto | a frase pedida |

## Turno com ferramenta ("Leia nota.txt e crie saida.txt com a palavra ok")

| Harness | Tempo | Atualizações | O que aconteceu |
|---|---|---|---|
| OpenCode | 11,2 s | 10 de texto, 6 de ferramenta, 1 de raciocínio | `read` e `write`, cada uma com `pending`, `in_progress` e `completed`. O `tool_call_update` chega **sem título**, e o núcleo usa o título do `tool_call`. |
| Codex | 31,1 s | 49 de texto, 12 de ferramenta | A leitura direta falhou (`failed`) e ele caiu para `mcp.node_repl.js`, com passagens por "Guardian Review". |

Os dois leram o conteúdo certo e os dois **criaram `saida.txt`** (conferido no disco: `ok`).

## Achados

1. **Nenhum dos dois pediu permissão** (`session/request_permission`) para escrever. O OpenCode escreveu direto; o Codex passou pela revisão automática própria ("Guardian Review"). **CONFIRMADO.** A regra "permissão negada até a M1.2d" só vale quando o harness pergunta. Na configuração atual do Pai, o harness age pela política dele próprio. A M1.2d precisa descobrir como fazer o harness perguntar ao núcleo (modos e opções de sessão do ACP, configuração de cada harness) antes de escrever.
2. **Texto colado em volta da ferramenta:** o OpenCode anunciou "I'll read the file and create the output." e depois respondeu "**O que li:**…", e as duas falas chegavam coladas. Agora viram parágrafos separados, com teste.
3. A conversa por harness começa um turno novo a cada mensagem: o histórico da conversa ainda não vai junto, e a retomada depois de queda é recusada com motivo. O caminho é `session/load` ou manter a sessão do harness viva, e fica para depois.
