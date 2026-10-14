# Sandbox e permissões em harnesses de agentes

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T11:40:00-03:00 · **Estado:** vigente · **Reverificar:** antes do spike do M2

## O que importa para o buddy

Isolamento de SO sem VM (Seatbelt no macOS, bubblewrap + seccomp no Linux) é o padrão dos harnesses atuais; o Windows nativo é o ponto fraco. Permissões com escopo e "negação vence" reduzem a fadiga de aprovação. Análises completas: [R2](../10-pesquisa/rev-0.2/r2-sandbox.md) e [R3](../10-pesquisa/rev-0.2/r3-aprovacoes.md).

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| "The sandbox runs on macOS, Linux, and WSL2. On native Windows, Claude Code runs commands unsandboxed." | code.claude.com/docs/en/sandboxing | 2026-10-14 |
| `@anthropic-ai/sandbox-runtime` 0.0.79, Apache-2.0 | registry.npmjs.org | 2026-10-14 |
| `@microsoft/mxc-sdk` 1.0.0, MIT; repo `microsoft/mxc` criado em 2026-02-06 | registry.npmjs.org; API do GitHub | 2026-10-14 |
| bubblewrap v0.13.1 (2026-10-14) | API do GitHub | 2026-10-14 |
| "Claude Code users approve 93% of permission prompts." Classificador do modo auto: 0,4% de falsos positivos, 17% de falsos negativos em ações excessivas reais | anthropic.com/engineering/claude-code-auto-mode (2026-03-25) | 2026-10-14 |
| ACP: `allow_once`, `allow_always`, `reject_once`, `reject_always`; "Clients MAY automatically allow or reject permission requests according to the user settings." | agentclientprotocol.com/protocol/tool-calls | 2026-10-14 |
| Docker Desktop: 8 GB no Windows; 4 GB no macOS e no Linux | docs.docker.com | 2026-10-14 |

## Histórico de verificações

- 2026-10-14T11:40:00-03:00 · buddy-dev (claude-code-5c038b) · criação da ficha (Revisão 0.2)
