# Sandbox e permissões em harnesses de agentes

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-21T13:36:00-03:00 · **Estado:** vigente · **Reverificar:** no início do spike do M2 e a cada 30 dias

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
| `@anthropic-ai/sandbox-runtime` **0.0.81** (publicada em 2026-10-20), Apache-2.0, Node >=22.12; dependências: zod, commander, node-forge, @pondwader/socks5-server; repositório `anthropics/sandbox-runtime` | registry.npmjs.org; API do GitHub | 2026-10-21 |
| `sandbox-runtime` no Windows: **alfa**. O comando roda como a conta local dedicada `srt-sandbox`, com barreira de rede WFP pela SID dessa conta (só o proxy local passa), token restrito para escrita e ACLs explícitas na pasta. Preparo único por máquina com UAC: `npx @anthropic-ai/sandbox-runtime windows-install` (cria a conta, o grupo e os filtros; desfaz com `windows-uninstall`) | README de `anthropics/sandbox-runtime` (seção "Windows (alpha)") | 2026-10-21 |
| `sandbox-runtime` no Windows não faz HTTPS com ferramentas que usam o TLS do sistema (Schannel) sob o token restrito: `curl.exe` do Windows, `Invoke-WebRequest`, .NET `HttpClient`, `winget`; Node, Python, Go e o Git para Windows (OpenSSL) funcionam | idem | 2026-10-21 |
| `@microsoft/mxc-sdk` **1.0.1** (publicada em 2026-10-17), MIT, Node >=24 (no Windows, transferência nativa de stdio com Node 26.8+); dependências: koffi, semver, node-pty; API em `@microsoft/mxc-sdk/v1` (`run`, `spawn`, `spawnWithPty`, `getPlatformSupport`) | registry.npmjs.org; README do pacote | 2026-10-21 |
| MXC: backend padrão no Windows 11 é `processcontainer` (outros: `isolation_session`, `wslc`; experimentais: `windows_sandbox`, `microvm`, `hyperlight`); Linux `bubblewrap`; macOS `seatbelt`. Windows 11 26H2 exige o build **26300.9550** ou superior | README e `docs/backends/process-container/os-version-support.md` de `microsoft/mxc` | 2026-10-21 |
| MXC: o lançador `wxc-exec.exe` nunca se eleva; o preparo com administrador (`wxc-host-prep.exe`: ACEs na raiz do disco e no dispositivo nulo, `\Device\Null`) só é preciso no nível AppContainer + DACL (Tier 3), quando a API BaseContainer do sistema não está disponível; a sonda diz quando | `docs/backends/process-container/host-prep.md` de `microsoft/mxc` | 2026-10-21 |
| Codex contido pela MXC (codex-acp 2.2.2, @openai/codex 0.160): precisa de ~/.codex e do cache do npm com escrita; rede só para chatgpt.com (e o registro do npm, pelo npx); com o modo read-only forçado, a ação aprovada esbarra na contenção (os error 1920); sem ele, escreve na pasta e é barrado fora | checagem real (../registros/2026-10-25T163610-0300-checagem-real-do-codex-contido-m2-2/README.md) | 2026-10-25 |
| OpenCode 2.0.32: o `acp` usa o serviço de fundo (`serve --service`), que não sobe contido (chdir para a pasta do usuário, EPERM); o `acp` não aceita `--standalone` | experimento no Windows do Pai; ajuda do opencode | 2026-10-25 |
| Computador do Pai: Windows 11 Pro **26H2, build 26300.9711** (acima do mínimo do MXC); `wsl.exe` presente; `bwrap` ausente (é Windows) | registro do Windows (leitura) | 2026-10-21 |

## Histórico de verificações

- 2026-10-14T11:40:00-03:00 · buddy-dev (claude-code-5c038b) · criação da ficha (Revisão 0.2)
- 2026-10-21T13:36:00-03:00 · buddy-dev (claude-code-desktop-2ea315) · reverificação ao vivo para a SPEC 0003 (M2): versões novas das duas candidatas, Windows em alfa no `sandbox-runtime`, requisitos do MXC no Windows e o build do computador do Pai
