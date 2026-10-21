# Ensaio: opções do agente e permissões com o OpenCode real

**Classe:** REGISTRO · **Data:** 2026-10-20T22:20:40-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-e8da5a`) · **Para:** SPEC 0002, critérios 17 e 18; a cobrança do Pai de 2026-10-20 à noite

## Por quê

O OpenCode continuava travando na console do Pai: a primeira mensagem respondia, e a segunda ficava muda por 75 s. A caixa não deixava escolher nada para o agente. A especificação das permissões estava escrita, mas não implementada. O Pai cobrou que tudo fosse resolvido agora.

## A causa da trava (CONFIRMADA)

Ao abrir a sessão, o OpenCode do Pai declara o modelo em uso: `opencode-go/minimax-m3.1-flash-free`, a versão gratuita, com fila e limite. Ele também declara três seletores:
- **modelo**, com 496 opções;
- **esforço** (low a max, quando o modelo tem);
- **modo** (build ou plan).

O Buddy não mostrava nem aplicava nenhum deles. A trava era o modelo gratuito; a correção é deixar o Pai escolher.

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código da branch `fix/opencode-opcoes-permissoes`, com estado próprio, porta 47399 e o OpenCode real do Pai; encerrado no fim.
- **Navegador:** o navegador in-app do Claude Code Desktop, a 1440 px.

## O que aconteceu

1. **Seletores do agente.** Com o OpenCode escolhido, a caixa mostrou "Modelo" e "Modo".
   - A lista de modelos abre compacta (315×149 px na busca) e filtra pelo texto ([captura](./1-seletor-de-modelo-do-opencode.jpg)).
   - Escolhi `opencode-go/kimi-k3`.
   - A primeira leitura das opções levou cerca de 15 s; depois fica guardada por 10 minutos.
2. **A trava sumiu.** "Olá" e, em seguida, "quem é você?" responderam os dois. A resposta "Eu sou o Kimi, um assistente da Moonshot AI" confirma o modelo aplicado, e o log registra `harness.options.applied` com o modelo nas duas execuções.
3. **A escolha fica guardada.** Numa conversa nova, o seletor lembrou o Kimi K3.
4. **Cartão com escopos.**
   - Pedido de escrita do OpenCode: o cartão ofereceu Negar · Uma vez · Nesta conversa · Neste projeto · Sempre ([captura](./2-cartao-com-escopos.jpg)).
   - Primeira execução do Claude Agent: só Negar · Uma vez.
5. **O escopo vale.** Aprovei "Nesta conversa" para criar `escopo.txt` ("um"). Pedi, na mesma conversa, para sobrescrever o mesmo arquivo com "dois": passou **sem cartão**, e o arquivo ficou com "dois".
6. **Pílula Permissões.** A caixa mostra o modo, com Manual como padrão; no modo "Sem perguntas", o aviso aparece fixo.

## Achados e correções

- **O aviso de silêncio contava a espera da aprovação do Pai.** Agora ele fica parado enquanto o agente espera a decisão, e o relógio recomeça depois dela. Teste antes.
- **O enviar caía de linha.** Com o agente, o modelo, o modo e as permissões, a barra encheu. Os rótulos dessas pílulas viraram título (o valor já diz o que é), e a barra coube.
- **A suíte inteira pegou uma regressão minha.** A concessão "de projeto" dada pelo cliente local, sem pasta, passou a ficar presa à pasta do núcleo. Corrigido: sem pasta, vale como antes. O teste antigo não foi tocado.
- **Comando continua só "uma vez".** O teste do critério 13 do marco anterior exige isso até existir o isolamento (sandbox). A primeira versão contrariava esse teste, e voltou atrás. A decisão de mudar isso é do Pai.

## Limites declarados

- O modo Automático usa um classificador **por regra** (comando só de leitura, sem encadear nem redirecionar), registrado em cada decisão; não é um modelo julgando.
- A proteção da `main` foi ligada no GitHub; a prova do fluxo é o merge do PR desta sessão.
