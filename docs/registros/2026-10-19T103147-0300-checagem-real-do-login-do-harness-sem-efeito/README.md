# Checagem real: login do harness, sem efeito para o Pai (M1.2e)

**Classe:** REGISTRO · **Data:** 2026-10-19T10:31:47-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-51d166`) · **Para:** SPEC 0002, critério 7 (AGENTS §5.9)

## Por que só esta parte

Chamar o `authenticate` com um método de agente faz o harness abrir o navegador na conta do Pai. Em 2026-10-19 o Pai decidiu que a participação dele no login vai para depois da console nova (M1.5), no ensaio da M1.6, porque o layout antigo impede ver, testar e validar. Esta checagem confere o que dá para conferir sem nenhum efeito para ele.

## Como

Um script fora do repositório subiu o dono do núcleo com o código da branch `feat/m1-2e-login` e o estado numa pasta temporária, sem console, e chamou pelo IPC a sonda e o `harness.login`.

## Resultado

| Harness | Estado | Métodos de login declarados |
|---|---|---|
| OpenCode | pronto | `opencode-login` ("Login with opencode") |
| Copilot | pronto | `copilot-login` ("Log in with Copilot CLI") |
| Hermes | pronto | `openai-codex` ("openai-codex runtime credentials") e `hermes-setup` ("Configure Hermes provider", **tipo terminal**) |

- `harness.login` com o `hermes-setup` foi **recusado antes do `authenticate`**: "o método "Configure Hermes provider" abre um terminal: o Buddy não faz login por terminal". O ACP proíbe passar método de terminal ao `authenticate`, e o Pai não faz nada por terminal.
- Método desconhecido também foi recusado. Nenhum evento `harness.login` foi gravado, e nenhum navegador abriu.
- Os processos do Hermes vivos depois da checagem são do aplicativo desktop do Pai, aberto pelo Explorer às 23:59 de 18/10. Não são meus e não foram tocados.

## O que fica para o ensaio da M1.6

O Pai entra num harness que pede login pelo "Entrar" da console nova. O núcleo chama o `authenticate`, o harness abre o navegador, e a conversa seguinte roda.
