# Ensaio: voz do Buddy, tabelas, densidade e a página pública (onda 3)

**Classe:** REGISTRO · **Data:** 2026-10-20T21:27:57-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-6e2164`) · **Para:** os pedidos do Pai de 2026-10-20, à noite

## Por quê

O Pai usou a console à noite e apontou cinco problemas:
- **Fala:** a resposta e a personalidade do Buddy estavam cruas e robóticas, e ele se descrevia como "a persona que este setup me deu".
- **Tabelas:** uma tabela aparecia como texto cru, com as barras à mostra.
- **Tamanho:** o seletor de modelo ocupava quase meia tela, mesmo num 4K; ele pediu para diminuir tudo.
- **OpenCode:** ele não respondeu pelo Buddy.
- **Idioma:** ele quer uma camada de inglês sob o app inteiro.

Ele decidiu ainda tornar o repositório público e publicar a página "diário de bordo".

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código integrado da branch `feat/onda-3-publico-voz-e-compacto`, com estado próprio, porta 47399, as chaves do `.env.local` só no processo filho e o OpenCode Go real; encerrado no fim.
- **Navegador:** o navegador in-app do Claude Code Desktop.
- **Página:** servida pelo `bd serve` a partir de `site/`.

## O que aconteceu

1. **Voz.** Perguntei: "Olá! Quem é você, qual modelo está usando agora e o que consegue fazer aqui? Se ajudar, use uma tabela pequena."
   - O Buddy respondeu como Buddy, o agente do Rabelus Buddy, criado no Rabelus Lab, sem falar de "persona" nem de "setup".
   - Disse o modelo real em uso (`opencode-go/kimi-k3`), que agora entra na instrução a cada chamada.
   - Listou o que consegue fazer numa tabela curta e fechou com o que faz quando não sabe ([captura](./voz-e-tabela.jpg)).
2. **Tabela.** A tabela foi desenhada como tabela, com cabeçalho e células, e não como texto com barras.
3. **Densidade.** O seletor de modelo, aberto a 1440×900, mede **335×355 px, 39% da altura**; antes eram 420×460 px. Um teste trava o limite: no máximo min(360 px, 52% da janela).
4. **Página pública.** Em português e em inglês: sem rolagem para os lados a 375 px, e todos os links e imagens respondem ([captura do topo](./pagina-topo.jpg)).

## O OpenCode que não respondeu (diagnóstico)

O que mostram o log do núcleo do Pai e as reproduções:
- Às 20:59, nas duas tentativas do Pai, a sessão abriu (a postura foi aplicada em 2 s) e o OpenCode **não mandou nada** por 40 a 50 s, até o Pai parar.
- Depois disso, pelo protocolo direto (com e sem a postura), pelo núcleo de ensaio e pelo próprio núcleo do Pai, ele respondeu em 5 a 7,5 s. **CONFIRMADO que funciona.**
- A causa da trava ficou **NÃO IDENTIFICADA**. O log do OpenCode 2.0.32 mostra a renovação da credencial da OpenAI logo antes, e nenhum erro (HIPÓTESE: a chamada do próprio OpenCode ao modelo travou).

A correção do nosso lado: quando um agente fica mais de 30 s em silêncio, a tela diz isso e oferece Parar.

## Achados

- Código dentro de negrito ainda mostra as crases (`**\`texto\`**`).
- O raciocínio do modelo continua no idioma em que o modelo pensa; a resposta segue o idioma da pessoa.
