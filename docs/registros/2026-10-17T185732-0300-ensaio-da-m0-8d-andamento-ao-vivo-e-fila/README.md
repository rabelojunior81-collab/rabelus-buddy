# Ensaio da M0.8d: andamento ao vivo, fila e direcionamento

**Classe:** REGISTRO · **Data:** 2026-10-17T18:57:40-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-822419`) · **Para:** SPEC 0001 rev. 6 (critérios 31–34), validação `demonstracao-m0`

## Por que existe

Primeiro uso real do Pai, com o ChatGPT no esforço Alto. As respostas foram boas, mas uma delas levou **248 s com a tela parada**. Achando que tinha quebrado, ele mandou outra mensagem, e **duas execuções rodaram ao mesmo tempo** na mesma conversa. Ele pediu três coisas: sinal de espera, o texto aparecendo em cadência, e o raciocínio e os comandos visíveis, registrados e recolhíveis à escolha de quem usa. Para as mensagens concorrentes, decidiu: "primariamente queued, com opção para steer".

## Medição antes do desenho (CONFIRMADO, serviços reais)

| Provedor | O que transmite |
|---|---|
| ChatGPT (`gpt-6.1-sol`) | aceita `reasoning.summary` (`auto` e `detailed`, com ou sem ferramentas); manda `response.reasoning_summary_text.delta` **só às vezes** (sim no problema dos trens com esforço médio; não em três tentativas com outra pergunta no Alto); texto em `response.output_text.delta` |
| Ollama (`gpt-oss:20b`) | raciocínio bruto em `delta.reasoning` desde 0,5 s; texto depois |
| OpenRouter (`nemotron-3.5-super-vl:free`) | raciocínio em `delta.reasoning` (e `reasoning_details`) desde 0,7 s; texto só aos 5,9 s; uso no último pedaço com `include_usage` |

Script: `workspace/diag-fluxo.ts` (fora do git; imprime só tipos de evento, contagens e trechos curtos).

## Ensaio no navegador real, como o Pai usa

Núcleo com o código da branch, aberto pelo mesmo caminho, e a console clicada e digitada. O Go segue sem saldo (402) e aparece como recusa à vista.

| # | Passo | Resultado |
|---|---|---|
| 1 | Pergunta pela rota automática, esforço Alto | Go recusa (402, à vista); a Ollama responde em ~3 s; o grupo "Raciocínio e ações (4)" fica recolhido conforme a preferência |
| 2 | Recarregar a página | a conversa continua aberta (critério 34) |
| 3 | Marcar "Mostrar raciocínio e ações" | os grupos abrem; o raciocínio da Ollama aparece |
| 4 | ChatGPT no Alto, continuando a conversa | "Pensando · N s" com o relógio correndo; o modelo pede um comando; "Aguardando sua aprovação · 20 s" ([captura](./m08d-01-aguardando-aprovacao.png)) |
| 5 | Mandar outra mensagem com a conversa ocupada | entra **na fila**, com "Direcionar agora" e "Cancelar" ([captura](./m08d-02-fila.png)) |
| 6 | Direcionar agora e Negar o comando | a mensagem entra na execução marcada "direcionamento"; o ChatGPT refaz as contas sem comando ([captura](./m08d-03-direcionado.png)) |
| 7 | Tarefa longa no ChatGPT, amostrando a tela a cada 0,5 s | "Pensando" por 7 s com o relógio; depois "Escrevendo", com o texto crescendo cerca de 200 caracteres/s, de forma contínua, até 2.648 caracteres em 21 s. Antes: 21 s parados e tudo de uma vez |
| 8 | Parar no meio | a execução encerra em ~1,5 s, "parada por você", sem efeito desconhecido ([captura antes do conserto](./m08d-04-parar-e-latex-cru.png)) |
| 9 | OpenRouter, esforço Médio | raciocínio ao vivo desde 1 s, aberto pela preferência ([captura](./m08d-06-raciocinio-ao-vivo.png)) |
| 10 | Recarregar | conversa e provedor escolhido voltam |

## Defeitos que o ensaio achou (todos corrigidos com teste antes)

| Achado | Correção |
|---|---|
| O SDK da OpenAI encerra o fluxo **em silêncio** quando a chamada é abortada; a parada voltaria como resposta parcial "boa" | adaptadores Chat e SIWC conferem o sinal no fim e lançam aborto |
| Seletor da chave e seletor da rota com o mesmo nome acessível, "Provedor" (introduzido no hotfix #38) | "Provedor da chave"; teste exige nomes distintos |
| ChatGPT escreve contas em LaTeX: `\(30 \times 1\)`, `\mathbf{240\text{ km}}`, `v_{perseguidor}` | `delatex` converte para texto (×, ÷, ≤, frações, negrito, subscrito), fora do código ([captura](./m08d-05-latex-legivel.png)) |
| Motivo de parada como código ("userStopped") | frase do catálogo para cada motivo conhecido, pt-BR e en |
| Aviso "a mensagem entrou na fila" ficava depois de a fila esvaziar | some quando a fila esvazia |
| Provedor escolhido voltava para "Automático" ao recarregar (o esforço era lembrado) | rota lembrada com a conversa e a preferência |
| Raciocínio ao vivo não acompanhava o fim enquanto crescia | acompanha, se a pessoa não rolou para cima |
| Raciocínio **repetido**: no grupo (do log) e na área ao vivo durante a aprovação ([captura](./m08d-07-raciocinio-repetido.png)) | passo concluído limpa o andamento; teste do dono exige |

## Limites declarados

- O resumo do raciocínio do ChatGPT depende do serviço e às vezes não vem. A console mostra "Pensando" com o relógio, sem inventar raciocínio.
- A rolagem automática do raciocínio ao vivo está coberta por teste. Na segunda tentativa o raciocínio não chegou a encher a caixa, então não foi observada na tela.
- O Go segue sem saldo (402), e não houve fluxo real pelo Go.
- A fila sobrevive à queda do núcleo nos testes, com `kill -9`. No navegador real, a queda com fila não foi ensaiada.
