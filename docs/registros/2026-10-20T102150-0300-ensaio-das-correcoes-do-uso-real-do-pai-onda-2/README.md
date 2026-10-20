# Ensaio: as correções do uso real do Pai (onda 2 do piloto)

**Classe:** REGISTRO · **Data:** 2026-10-20T10:21:50-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-6e2164`) · **Para:** as correções pedidas pelo Pai depois de usar a console em 2026-10-20

## Por quê

O Pai usou a console e achou quatro problemas:
- **Negação sem volta:** ele negou a primeira execução do Claude Agent, e não havia como rever.
- **Negação em silêncio:** o OpenCode pediu para ler um arquivo fora da pasta, a política negou sem perguntar, e o agente parou.
- **Fala atribuída ao Buddy:** a resposta do OpenCode aparecia no balão "BUDDY".
- **Pedido sem explicação:** pedi ao Pai o "M1.6" sem explicar o que era.

As correções foram feitas em paralelo por quatro subagentes, cada um em seu worktree, e integradas por mim ([plano do piloto](../../50-planos/piloto-paralelismo/PLANO.md)).

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código integrado da branch `docs/decisoes-e-paralelismo`, com estado próprio e porta 47399; encerrado no fim. O núcleo do Pai não foi tocado.
- **Navegador:** o navegador in-app do Claude Code Desktop. O OpenCode é o do computador do Pai.
- **Os mesmos passos do Pai:** negar o Claude Agent e pedir ao OpenCode a leitura de um arquivo fora da pasta de trabalho.

## O que aconteceu

1. **Negar e rever.** Escolhi o Claude Agent, e o cartão da primeira execução apareceu; neguei.
   - A pílula continuou dizendo "aguarda aprovação" até eu escolher o agente de novo. É um achado novo, abaixo.
   - Depois disso, a lista mostrou "NEGADO" e, logo abaixo, "Rever decisão" ([captura](./1-negado-e-rever.jpg)).
   - Ao clicar, o cartão voltou, com a mensagem "Pedido de aprovação refeito: aprove ou negue no cartão" ([captura](./2-pedido-refeito.jpg)).
   - Não aprovei: aprovar baixaria o adaptador do Claude, e instalar é decisão do Pai. A negação antiga continua no histórico.
2. **Fora da pasta.** Pedi ao OpenCode: "Leia o arquivo …\fora-da-pasta\nota-externa.txt".
   - Em vez de negar em silêncio, o núcleo perguntou: "Harness OpenCode: read_file <caminho completo> (fora da pasta de trabalho)", com o ícone do OpenCode ([captura](./3-fora-da-pasta-pergunta.jpg)).
   - Aprovei, e o OpenCode leu e respondeu sem parar ([captura](./4-opencode-responde.jpg)).
3. **Quem fala.** O balão da resposta diz "OPENCODE", com o ícone dele, ao vivo e na resposta final. As conversas do Buddy continuam com "BUDDY".
4. **A regra explicativa.** O `bd validacoes` passou a reprovar a pendência do Pai sem explicação em linguagem comum, e a lista do que aguarda o Pai mostra a explicação. As três pendências reais foram explicadas; a validação da console ficou bloqueada até as correções, com o motivo escrito.

## Achados novos

- **A pílula não se atualiza depois de uma decisão no cartão.** Ela só refaz a sonda ao escolher o agente de novo.
- **A mensagem "Pedido de aprovação refeito" fica na tela** depois que o cartão é respondido.
- **"Negada pela política (fora do workspace)"**: o motivo vem do núcleo em português e aparece assim também no inglês.

Os três vão para a próxima onda.

## O que este ensaio não cobre

- **A aprovação vale uma vez.** Cada pedido fora da pasta pergunta de novo. Os escopos que o Pai pediu (sessão, projeto, sempre) e os modos são do sistema de permissões, que depende da revisão da especificação.
- **Escolher modelo, modo e esforço de um agente** ainda não existe na tela. A pesquisa está [aqui](../../20-conhecimento/acp-opcoes-de-sessao.md).
