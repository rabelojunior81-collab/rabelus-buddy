# Ensaio: harness na caixa da console nova (M1.5b)

**Classe:** REGISTRO · **Data:** 2026-10-19T11:17:29-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-51d166`) · **Para:** SPEC 0002, critérios 5, 6 e 11 (AGENTS §5.9)

## Como

- **Núcleo:** temporário, pelo `bd serve`, com o código da branch `feat/m1-5b-harness-na-caixa`, estado numa pasta própria e console na porta 47399. Foi reiniciado pelo `bd serve` a cada correção e encerrado no fim.
- **Harness:** o **OpenCode real** do computador, trabalhando numa pasta temporária.
- **Navegador:** Chromium real, a 1440 e a 375 px.

## O que aconteceu, passo a passo

1. **A lista mostrou quem pode executar:** o Buddy e os 6 harnesses encontrados, com os ícones do registro.
2. **Ao escolher o OpenCode:**
   - a pílula mostrou "conferindo…" e, depois da sonda, "pronto";
   - as pílulas de provedor e esforço saíram, porque o harness usa os dele;
   - o campo passou a dizer "Escreva para o OpenCode…".
3. **A tarefa "Crie o arquivo saida.txt nesta pasta com a palavra ok":**
   - o andamento mostrou "Aguardando sua aprovação · acp:opencode";
   - o cartão "Harness OpenCode: write_file saida.txt" apareceu sobre a caixa, com o ícone do OpenCode ([captura](./m15b-1440-permissao.png)).
4. **Aprovar pela console:**
   - o OpenCode escreveu o arquivo (conferido no disco: `ok`);
   - a resposta voltou em dois parágrafos;
   - os detalhes mostram a sequência: postura, ferramenta, aprovação pedida e concedida, permissão aprovada, escrita concluída e leitura de conferência ([captura](./m15b-1440-resposta.png)).
5. **No celular:** a lista abre como folha embaixo, na largura toda, com o foco no escolhido, sem rolagem para os lados, e o enviar fica na mesma linha da pílula ([captura](./m15b-375-lista.png)).

## Achados e correções, cada um com teste antes

1. **Postura enganosa.** "OpenCode trabalha com cautela: modo build" sugeria cautela no modo. No OpenCode, a cautela vem do "perguntar antes", e `build` não é cauteloso. Agora a frase diz o que vale:
   - "pede permissão antes de editar ou executar", quando há a instrução de perguntar;
   - "somente leitura", no modo `read-only`;
   - só o modo, sem prometer cautela, nos outros casos.
2. **Estados em inglês.** Os estados das ferramentas (pending, in_progress, completed) apareciam em inglês na tela em português. Agora passam pelo catálogo.
3. **Id no lugar do nome.** Na carga da página, a conversa era desenhada antes de chegar a lista de harnesses e mostrava "opencode". Quando a lista chega, a conversa é redesenhada; conferido no navegador: "OpenCode pede permissão…".

## Limites

- **"Entrar" com um harness real:** não foi exercitado aqui. Ele abriria o navegador na conta do Pai, e isso fica para o ensaio da M1.6, por decisão dele. Pela console, com o harness falso, está coberto por `console-harness.test.ts`.
- **Descrições:** as da lista vêm em inglês do registro oficial do ACP (dado de fora).
- **Seletor de modelo:** é da M1.5c.
