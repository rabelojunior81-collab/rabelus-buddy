# Checagem real: o Codex contido (M2.2)

**Classe:** REGISTRO · **Data:** 2026-10-25T16:36:10-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-901c38`) · **Para:** [SPEC 0003](../../40-specs/0003-execucao-isolada/SPEC.md), critério 3; decisão do Pai em 2026-10-25 ("Codex primeiro + 2 depois")

## Como

- **Experimento direto** (antes do código): o `codex-acp` 2.2.2, do cache do npx, contido pela MXC com o perfil da pasta mais `~/.codex`, falando ACP pelos fluxos, com um proxy que registrava os domínios.
- **Checagem pelo produto:** núcleo de ensaio da branch `feat/m2-2-codex-contido`, com estado próprio, e o Codex escolhido como agente. Dois pedidos: criar `teste.txt` na pasta e escrever fora dela.

## Resultado (CONFIRMADO)

| Pedido | Contido | Cartões | Rede | Resultado |
|---|---|---|---|---|
| criar `teste.txt` com `x` | sim, `mxc:base-container` | nenhum | `chatgpt.com` e `registry.npmjs.org` (provedor do agente) | arquivo criado na pasta |
| escrever fora da pasta | sim | nenhum | os mesmos | falhou, mesmo na tentativa com "permissão ampliada" do Codex; nada no disco |

- **No experimento direto,** o Codex respondeu ("oi contido"), criou o arquivo e usou só `chatgpt.com`.
- **O sandbox próprio dele** ("Guardian Review") rodou dentro do nosso.

## Achados

- **Modo só leitura forçado quebrava o Codex contido.** Com o modo só leitura imposto (a postura do Buddy sem contenção), a ação aprovada do Codex esbarrava na contenção (`os error 1920`), e nada era escrito. Agora, agente contido não é forçado ao modo só leitura: a contenção do sistema é a guarda. As permissões que ele pede dentro da pasta passam como as do comando contido (critério 6). O caminho protegido continua negado, e fora da pasta também.
- **O id do Codex no registro do ACP é `codex-acp`.** O meu perfil e o meu teste usavam `codex`, e a checagem achou.

## Erro meu durante a checagem (grave)

O primeiro script da checagem aprovava qualquer cartão de "primeira execução". Ele aprovou também a do **Claude Agent**, que o Pai nunca aprovou.
- **O que aconteceu:** o npx baixou `@agentclientprotocol/claude-agent-acp@0.95.0` para o cache do npm do Pai, às 16:29:31 (pasta `_npx/304981f1e6ac6717`). É PROVÁVEL que tenha rodado a abertura de conversa (`initialize`).
- **Onde:** foi no núcleo de ensaio, com estado próprio. O núcleo do Pai continua sem essa aprovação.
- **Correção:** o script passou a aprovar só os cartões da própria conversa.
- **O pacote baixado continua no cache.** Apagá-lo é decisão do Pai.

## Limites declarados

- O perfil do Codex foi medido nesta máquina e nesta versão (2.2.2). Versão nova pede nova medição.
- O OpenCode continua sem contenção, porque o serviço de fundo dele não sobe contido. O próximo passo, decidido pelo Pai, é o servidor privado dentro da contenção.
