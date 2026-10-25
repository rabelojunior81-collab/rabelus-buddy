# Checagem real: rede por cartão nos comandos contidos (M2.3)

**Classe:** REGISTRO · **Data:** 2026-10-25T10:05:02-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-983845`) · **Para:** [SPEC 0003](../../40-specs/0003-execucao-isolada/SPEC.md), critério 4; [plano do M2](../../50-planos/m2/PLANO.md), M2.3

## Por quê

A M2.3 faz a rede do comando contido sair só pelo proxy do núcleo. Cada destino passa pela política, e o destino novo vira o cartão "rede". Os testes provam isso com um destino local e com a MXC de verdade. A checagem real prova com o Buddy, um modelo real e a internet.

## Como

- **Núcleo de ensaio** iniciado pelo `bd serve` com o código da branch `feat/m2-3-rede-por-cartao`, com estado próprio e as chaves do Pai. Foi encerrado depois de cada rodada.
- **O Buddy** rodou com o modelo `opencode-go/kimi-k3`, e as aprovações foram dadas pelo mesmo método do cartão (`approval.resolve`).
- **Primeiro pedido:** `npm view left-pad version`. Comando aprovado uma vez, cartão "rede" aprovado "nesta conversa".
- **Segundo pedido:** `npm view is-odd version --registry https://registry.yarnpkg.com`. Comando aprovado, cartão "rede" negado.

## Resultado final (CONFIRMADO)

| Pedido | Cartões | Rede (log) | Comando |
|---|---|---|---|
| `npm view left-pad` | comando (uma vez) e `network registry.npmjs.org` (nesta conversa) | duas conexões para `registry.npmjs.org:443`, liberadas, e **uma pergunta só** | código 0, `1.3.0`, contido |
| `npm view is-odd` pelo yarnpkg | comando (uma vez) e `network registry.yarnpkg.com` (negado) | uma conexão, negada | código 1, `E403` do npm; o Buddy explicou o bloqueio |

## O que deu errado antes, e como achei

**Nas três primeiras rodadas, o `npm` caiu antes da rede** ("Cannot read package config …\Roaming\npm\node_modules\npm\package.json: operation not permitted"), dentro do núcleo e não no experimento direto.
- **Duas hipóteses minhas foram REFUTADAS pela própria checagem:** o PATH divergente e a pasta global do npm fora do PATH. As duas correções ficaram, porque são coerentes: o comando contido roda com o PATH do perfil, e a pasta global do npm entra no perfil do Windows. Mas nenhuma das duas era a causa.
- **A causa veio do log de auditoria,** que passou a guardar o perfil de cada comando. O núcleo de ensaio sobe pelo `npm run`, e o npm põe no PATH uma pasta funda dentro do próprio npm global. As pastas entre ela e a pasta global entravam em "só listar", e "só listar" rebaixa a leitura da pasta (achado do spike). A regra que eu tinha posto só para a pasta de trabalho passou a valer para toda pasta liberada, com teste antes.

## Limites declarados

- **O proxy aceita só CONNECT** (HTTPS e outros túneis). Uma ferramenta que fala HTTP puro pelo proxy recebe 405.
- **O cartão vale para o host,** com qualquer porta. Liberar `registry.npmjs.org` libera todas as portas dele.
- **A rede do agente de fora** (M2.2) ainda não passa por aqui.
