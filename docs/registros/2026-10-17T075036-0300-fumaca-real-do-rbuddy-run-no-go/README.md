# Fumaça real do `rbuddy run` no OpenCode Go (M0.7)

**Classe:** REGISTRO · **Data:** 2026-10-17T07:50:37-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-fe93fb`) · **Para:** SPEC 0001, M0.7 (caminho do critério 26)

## O que foi feito

`rbuddy run` de verdade, em processo, numa pasta temporária, com o dono subindo sob demanda e a rota padrão (OpenCode Go, `kimi-k3`). As chaves vêm de `.buddy-dev/.env.local`; o script ([`smoke-run.ts.txt`](./smoke-run.ts.txt)) só imprime os nomes das variáveis e troca qualquer valor de chave por `[segredo]` na saída. A aprovação da escrita é respondida pelo próprio script (`s`).

Tarefa: "Crie o arquivo ola.txt com o conteúdo \"oi do buddy\" e depois liste o diretório atual. Responda em uma frase."

## Resultado

| Rodada | Quando | Passos | Resultado | Consumo registrado |
|---|---|---|---|---|
| 1 | 2026-10-16, madrugada | 2 | `ola.txt` = "oi do buddy"; resposta final em uma frase; código 0 | **US$ 0,0000**: o `kimi-k3` não tinha preço na tabela |
| 2 | 2026-10-17, manhã (com os preços do Go) | 3 | idem | US$ 0,0055 + 0,0014 + 0,0011 por passo; janela `go/kimi-k3`: US$ 0,0095 |

Saída da rodada 2 (trecho, pelo catálogo): `aprovação pedida: write_file ola.txt` → `aprovação concedida` → `arquivo escrito: ola.txt` → `execução … concluída`. Nenhuma chave na saída.

## Achados

- **Consumo zero sem preço.** A decisão da M0.6e (modelo do Go sem preço conta 0; o 429 manda) deixava o `log` da demonstração sem consumo. Os preços por modelo da página oficial do Go entraram na tabela (ficha [precos-llm](../../20-conhecimento/precos-llm.md)), com teste que exige preço para todo modelo com janela.
- A ordem das linhas no acompanhamento mostra a liquidação antes do passo (os eventos nascem nessa ordem). Cosmético; fica para a M0.8.
- Houve uma terceira rodada idêntica à 2, só para ler o orçamento (cada rodada usa um diretório de estado novo).

## Limites

- Só a rota Chat Completions do Go foi exercitada pelo loop; as rotas Responses, Messages e Google foram provadas na M0.6a por chamada única.
- ChatGPT (SIWC) não entrou: o login real espera o Pai (validação `login-chatgpt-real`).
