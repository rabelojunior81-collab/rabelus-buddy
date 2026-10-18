# Checagem real: catálogo do registro ACP e detecção de harnesses

**Classe:** REGISTRO · **Data:** 2026-10-18T14:22:05-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-33be25`) · **Para:** SPEC 0002, critérios 1 e 2 (AGENTS §5.9: teste com servidor falso prova o contrato imaginado; a checagem real prova o mundo)

## Como

`refreshRegistry` contra a CDN oficial (`cdn.agentclientprotocol.com/registry/v1/latest/registry.json`) e `detectHarnesses` no PATH real do computador do Pai, numa pasta temporária: o estado do núcleo do Pai não foi tocado e nada foi instalado. Saída completa em [saida.txt](./saida.txt), com os caminhos de usuário trocados por `%USERPROFILE%`.

## Resultado (CONFIRMADO)

- **Registro:** versão 1.0.0, **42 agentes**, cerca de 1 s, **42 ícones** SVG guardados.
- **Lançamento:** npx em 23, binário em 17 e uvx em 2. O registro tem 19 entradas com binário, mas duas também têm npx, e o npx é preferido.
- **Encontrados, exatamente os seis medidos à mão:**

  | Harness | Sinal | Lançamento |
  |---|---|---|
  | Claude Agent | `claude` | npx `@agentclientprotocol/claude-agent-acp@0.93.0` |
  | Codex | `codex` | npx `@agentclientprotocol/codex-acp@2.2.2` |
  | Copilot | `copilot` | npx `@github/copilot@1.0.98` |
  | OpenCode | `opencode` | binário |
  | pi ACP | `pi` | npx `pi-acp@0.0.34` |
  | Hermes Agent | `hermes` | `hermes acp`, pela tabela própria, fora do registro |

- **Não instalados:** 37.

## Para a M1.2

Quando o harness já está instalado e fala ACP direto, o lançamento deve preferir o **executável local**, com os argumentos do registro, em vez de baixar outra cópia:
- `opencode acp`;
- `copilot --acp`;
- `hermes acp`.

Os adaptadores npx do Claude e do Codex continuam vindo do registro, com a primeira execução aprovada pelo Pai (critério 4).
