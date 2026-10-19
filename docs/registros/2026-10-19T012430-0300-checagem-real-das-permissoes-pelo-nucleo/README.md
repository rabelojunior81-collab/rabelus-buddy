# Checagem real: permissões do harness pelo núcleo (M1.2d)

**Classe:** REGISTRO · **Data:** 2026-10-19T01:24:30-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-571284`) · **Para:** SPEC 0002, critério 6 (AGENTS §5.9)

## Como

Um script fora do repositório subiu o **dono do núcleo** com o código desta branch e o estado numa pasta temporária, sem console. Pelo IPC, como a console faz, ele pediu ao harness real: "Crie o arquivo saida.txt nesta pasta com a palavra ok". O script resolveu cada aprovação que apareceu, negando ou aprovando, e no fim leu o log e a pasta. O dono e os harnesses foram encerrados, e a lista de processos não mostrou sobra (só o núcleo do Pai, que é de antes).

No estado temporário, a primeira execução do `@agentclientprotocol/codex-acp@2.2.2` precisou de aprovação. É o mesmo pacote e versão que o Pai aprovou na casa dele em 2026-10-18, e aprovei só para esta checagem.

## Resultado

| Harness | Postura aplicada | Aprovação mostrada | Negar | Aprovar |
|---|---|---|---|---|
| OpenCode 2.0.31 | `permission: ask` no processo filho (modo `build` mantido; não há `read-only`) | "Harness OpenCode: write_file saida.txt" | nada escrito; parou por `permissionDenied` (7,8 s) | escreveu `ok`; concluída (8,9 s) |
| Codex (`codex-acp` 2.2.2) | modo `read-only` por `session/set_config_option` | "Harness Codex: run_command Set-Content … saida.txt …" | nada escrito; `permissionDenied` (14,1 s) | escreveu `ok`; concluída (14,8 s) |

Em nenhum caso houve escrita sem pedido (`harness.unasked` vazio).

## Achados e correções, cada um com teste antes

1. **Recusa não é parada do Pai.** Nos dois harnesses, negar encerra o turno com `stopReason: cancelled`, e o núcleo registrava "parado pelo usuário". Agora a execução para com `permissionDenied`.
2. **Título genérico no Codex.** O pedido de permissão do Codex diz só "Run command", e o Pai não veria o que aprova. A aprovação passou a usar o comando que o harness anunciou no `tool_call` de mesmo id. Reconferido no Codex real: a aprovação mostra o `Set-Content` inteiro.
3. **Relógio de inatividade.** Os 10 minutos corriam enquanto o Pai decidia, e uma decisão demorada derrubaria o turno. Agora o relógio para durante o pedido.
4. **Ficha corrigida.** O OpenCode declara `mode` (`build`/`plan`), e o Codex declara também `reasoning_effort` e `fast-mode`. A primeira leitura cortava a saída e concluía ausência ([ficha](../../20-conhecimento/acp-permissoes-dos-harnesses.md)).

## Limites

- O Pai ainda não consegue iniciar uma conversa com harness pela console: a escolha do harness na caixa de mensagem é da M1.5. As aprovações já aparecem no painel Aprovações que ele conhece, e a validação dele pela console vem com a M1.5.
- O ícone do harness na aprovação também chega com a console nova (M1.5). Hoje aparece o nome.
- Copilot, Hermes, Claude e pi ainda não foram medidos.
