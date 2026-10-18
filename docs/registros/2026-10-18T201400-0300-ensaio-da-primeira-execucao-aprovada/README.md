# Ensaio da M1.2b: primeira execução aprovada

**Classe:** REGISTRO · **Data:** 2026-10-18 · **Por:** buddy-dev (sessão `claude-code-vs-code-30aa5d`) · **Para:** SPEC 0002, critério 4; ensaio antes de pedir a ação ao Pai (AGENTS §3)

## Passos, os mesmos que o Pai fará

O ensaio usou um núcleo temporário, iniciado pelo `bd serve` e encerrado no fim. Ele tinha um registro falso com o Codex pelo adaptador `npx @agentclientprotocol/codex-acp@2.2.2` e um `npx` falso, que anota a chamada.

1. **O núcleo pede a primeira execução do Codex** (`harness.probe`). O estado volta "aprovacao", e o `npx` **não** é chamado.
2. **Na console atual**, a 1707×769, o painel "Aprovações" mostra o pedido "Primeira execução de Codex: baixar e executar @agentclientprotocol/codex-acp@2.2.2 (npx). Aprovar vale só para esta versão.", com os botões Aprovar e Negar ([captura](./m12b-01-pedido-no-painel.png)).
3. **Clique em "Aprovar".**
4. **A sonda seguinte** roda `npx -y @agentclientprotocol/codex-acp@2.2.2` e o harness fica **pronto**. Nenhuma aprovação fica pendente.

O teste automático cobre o resto do critério: negada, nada roda; com versão nova, o pedido volta.

## Para o passo real

O núcleo do Pai rodava desde 01:35 com o código antigo e precisa ser reiniciado com o código novo, do mesmo jeito que o atalho `abrir-rabelus-buddy.cmd` o inicia.
