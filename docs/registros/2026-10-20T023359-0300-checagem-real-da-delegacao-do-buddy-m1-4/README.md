# Checagem real: a delegação do Buddy (M1.4)

**Classe:** REGISTRO · **Data:** 2026-10-20T02:33:59-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-d0610a`) · **Para:** SPEC 0002, critério 8 (AGENTS §5.9)

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código da branch `feat/m1-4-delegacao`, com estado próprio e porta 47399, e encerrado no fim. As chaves do `.buddy-dev/.env.local` foram só para o ambiente do processo filho, e nada foi impresso. O núcleo do Pai não foi tocado.
- **Modelo do Buddy:** a ordem padrão de provedores escolheu o OpenCode Go (`kimi-k3`).
- **Harness:** o OpenCode instalado no computador do Pai, com a postura do núcleo (`permission: ask` só no processo filho).
- **Navegador:** o navegador in-app do Claude Code Desktop, com a console aberta por um bilhete de uso único.
- **Pasta de trabalho:** a do estado de ensaio, com `README.md`, `notas.txt` e `dados.csv`.

## O que aconteceu

1. **Leitura delegada.** Pedi pela console: "Use a ferramenta delegate para pedir ao harness opencode: 'Liste os arquivos desta pasta e diga quantos são.'"
   - o `kimi-k3` chamou `delegate` com `harness: opencode`;
   - o OpenCode leu e listou a pasta (`read`, `glob`) sem pedir permissão, porque leitura é livre na política;
   - ele terminou com `end_turn`, e o Buddy respondeu: "3 arquivos: `README.md`, `dados.csv` e `notas.txt`" ([captura](./m14-1-resposta.jpg), [ações](./m14-2-acoes.jpg)).

   No log ficaram o efeito `harness.delegate` com o recibo, as ferramentas do harness na execução do Buddy e a postura.
2. **Escrita delegada.** Pedi: "Crie o arquivo resumo.txt com a frase: delegação ok."
   - o cartão de aprovação apareceu com o ícone e o nome de quem pedia: "Harness OpenCode: write_file resumo.txt" ([captura](./m14-4-aprovacao.jpg));
   - o OpenCode pediu duas vezes (`write` e depois `edit`), e aprovei as duas;
   - o arquivo ficou no disco com "delegação ok.", conferido byte a byte;
   - o Buddy ainda conferiu lendo o arquivo e respondeu que deu certo ([captura](./m14-5-escrita.jpg)).

## Achados e correções, com teste antes

- **A conversa não dizia a quem o Buddy delegou.** Ela mostrava só a chamada da ferramenta. Agora mostra "O Buddy delegou a OpenCode: …" e "OpenCode terminou a parte delegada", e o raciocínio do harness fica recolhível ([captura](./m14-3-a-quem.jpg)).
- **O texto do OpenCode aparecia ao vivo no balão "BUDDY".** Era a fala de outro atribuída ao Buddy. Agora, na delegação, o texto do harness não vai ao vivo: o raciocínio e as ferramentas continuam ao vivo, e o texto volta ao Buddy como resultado da ferramenta. Coberto por teste; não repeti a chamada real depois da correção.
- **Atraso em toda execução.** A primeira versão buscava o registro do ACP na rede no início de cada execução do Buddy, e o teste antigo de direcionar (critério 33) reprovou. Agora a lista dos harnesses usa a cópia local.

## Limites declarados

- **A ferramenta só aparece com o registro já copiado.** A console traz o registro ao abrir (`harness.list`); um núcleo novo, sem cópia, não oferece a delegação até lá.
- **Delegação a harness com primeira execução pendente.** Ela volta ao modelo como indisponível, com o motivo; a aprovação continua na console.
- **Uma delegação por vez.** Delegações em paralelo, e entre harnesses diferentes na mesma tarefa, não foram exercitadas.
