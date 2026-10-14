# R2 — Isolamento de execução em Windows, macOS e Linux

**Revisão:** 0.2 · **Limite tratado:** 4 (sandbox só Windows na 0.1) · **Autor:** buddy-dev (claude-code-5c038b), com extração por subagente conferida por amostragem · **Data:** 2026-10-14

## Resumo

1. **Há um padrão consolidado, sem VM e sem Docker:** **Seatbelt** (`sandbox-exec`) no macOS e **bubblewrap + seccomp** no Linux, com **rede negada por padrão** e um **proxy no host** que libera só domínios permitidos. Claude Code, Codex CLI e Gemini CLI usam variações disso. Cabe em 4 GB.
2. **O Windows nativo é o elo fraco.** O Claude Code roda comandos sem sandbox no Windows nativo e recomenda WSL2. O Codex usa o **MXC** (Microsoft eXecution Containers), com modos de reserva. O Windows Sandbox é pesado (mínimo de 4 GB, 8 GB recomendados), aceita uma instância só e a CLI `wsb` não devolve a saída dos comandos.
3. **Duas bibliotecas candidatas para um núcleo em TypeScript:** `@anthropic-ai/sandbox-runtime` (Apache-2.0, beta, Windows em alfa) e `@microsoft/mxc-sdk` (MIT, 1.0.0, três sistemas). Nenhuma está madura o bastante para ser escolhida sem um spike.
4. **Correção à 0.1:** os 8 GB do Docker Desktop valem **só para Windows**; no macOS e no Linux o mínimo é 4 GB.

## Fatos verificados

✔ = conferido pelo buddy-dev na fonte; os demais vêm da extração do subagente, com URL.

| Fato | Fonte | Data |
|---|---|---|
| ✔ "The sandbox runs on macOS, Linux, and WSL2. On native Windows, Claude Code runs commands unsandboxed." | https://code.claude.com/docs/en/sandboxing | 2026-10-14 |
| Claude Code: Seatbelt no macOS; `bubblewrap` e `socat` no Linux/WSL2; proxy no host verifica o hostname de cada conexão; domínios permitidos "start empty" | idem | 2026-10-14 |
| No Ubuntu 24.04+, a política AppArmor padrão impede o bubblewrap de criar user namespaces; o Claude Code documenta um perfil `/etc/apparmor.d/bwrap` | idem | 2026-10-14 |
| ✔ `@anthropic-ai/sandbox-runtime` 0.0.79, Apache-2.0; README: macOS por `sandbox-exec`, Linux por bubblewrap, Windows "Alpha" | npm + github.com/anthropic-experimental/sandbox-runtime | 2026-10-14 |
| ✔ `@microsoft/mxc-sdk` 1.0.0, MIT; repositório `microsoft/mxc` criado em 2026-02-06 | npm + API do GitHub | 2026-10-14 |
| MXC: backends Windows (ProcessContainer padrão, Windows Sandbox, WSLC, MicroVM, Hyperlight), Linux (Bubblewrap padrão, LXC…), macOS (Seatbelt); vários marcados "experimental" | github.com/microsoft/mxc | 2026-10-14 |
| Codex CLI: Seatbelt no macOS; `bwrap` + `seccomp` no Linux; MXC no Windows (exige Win11 24H2 build 26100.9278 ou 25H2 26200.9278); rede desligada por padrão; modos `read-only`, `workspace-write`, `danger-full-access` | learn.chatgpt.com/docs/sandboxing e /windows/windows-sandbox | 2026-10-14 |
| Gemini CLI: Seatbelt no macOS; Docker/Podman; gVisor; no Windows nativo, `icacls` com "Low Mandatory Level" | github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md | 2026-10-14 |
| OpenCode: só regras allow/ask/deny; nenhuma isolação de SO documentada | opencode.ai/docs/permissions/ | 2026-10-14 |
| `sandbox-exec` marcado como **DEPRECATED** no man page, mas ainda distribuído e usado em produção pelos harnesses acima | keith.github.io/xcode-man-pages/sandbox-exec.1.html | 2026-10-14 |
| ✔ bubblewrap **v0.13.1** (publicado em 2026-10-14); precisa de user namespaces sem privilégio; o modo setuid foi removido | API do GitHub, `containers/bubblewrap` | 2026-10-14 |
| Landlock: restrição sem privilégio; ABI 4 (kernel 6.7) restringe TCP por porta, não por domínio | docs.kernel.org/userspace-api/landlock.html | 2026-10-14 |
| Windows Sandbox: Pro/Enterprise/Education; "At least 4 GB of RAM (8 GB recommended)"; rede ligada por padrão; uma instância por vez; `wsb` CLI sem I/O de processo | learn.microsoft.com (Windows Sandbox: overview, install, CLI) | 2026-10-14 |
| WSL 2: memória padrão até 50% da RAM do host; `networkingMode=none` desliga a rede | learn.microsoft.com/en-us/windows/wsl/wsl-config | 2026-10-14 |
| AppContainer: isola arquivos e rede por classe (internet, intranet, servidor), sem lista de domínios | learn.microsoft.com (AppContainer isolation) | 2026-10-14 |
| Docker Desktop: Windows "8GB system RAM"; macOS e Linux "At least 4 GB of RAM" | docs.docker.com (install Windows, Mac, Linux) | 2026-10-14 |

## Proposta de camada de execução (substitui os "4 níveis" da 0.1)

| Nível | Quando | macOS | Linux | Windows |
|---|---|---|---|---|
| **S1 — processo isolado** (padrão) | Todo comando de shell e todo script dentro do workspace | Seatbelt com perfil gerado | bubblewrap + seccomp (perfil AppArmor no Ubuntu 24.04+) | MXC ProcessContainer, se o spike aprovar; senão, WSL2 + bubblewrap |
| **S2 — VM descartável** (opt-in) | Plugin ou script de terceiro não confiável | Apple `container` (Apple silicon, macOS 26) — a avaliar | gVisor ou microVM — a avaliar | Windows Sandbox (se houver RAM) |
| **S3 — remoto** (opt-in) | Tarefa pesada | idem 0.1: aprovação, orçamento, aviso de privacidade | | |

Regras transversais:
- **Rede negada por padrão** em S1, com proxy no host e lista de domínios por sessão (é a ação "rede" das aprovações, R3).
- **Ferramentas internas do núcleo** (ler e escrever arquivos, MCP) não passam pelo sandbox de shell no Claude Code; no Rabelus Buddy, a escrita de arquivos acontece no worktree da sessão (R5, requisito 4), e a integração é o ponto de aprovação.
- O isolamento de SO **substitui prompts**, não os complementa: comandos dentro do S1 e do workspace não pedem aprovação por chamada (R3).

## Spike obrigatório antes da SPEC do M2

Comparar `@anthropic-ai/sandbox-runtime` e `@microsoft/mxc-sdk` nos três sistemas, medindo:
- isolamento real: tentar ler fora do workspace, escrever fora, abrir a rede;
- RAM e latência por comando;
- comportamento no Windows deste host (Windows 11 Pro, build 10.0.26300 — **NÃO IDENTIFICADO** se atende ao requisito de build do MXC);
- licença, maturidade, cadência de releases.

## Estado do limite 4

**Resolvido no nível de pesquisa:** macOS e Linux cobertos com mecanismos usados em produção; o Windows nativo fica como risco declarado, com spike definido.

## Não confirmado

- Se o MXC é GA e se é fronteira de segurança (só imprensa secundária fala em GA em 2026-10-07; um fork diz que os perfis não devem ser tratados como fronteira).
- Mapeamento das ABIs 10 e 11 do Landlock para versões de kernel.
- Sobrecarga de RAM numérica de Seatbelt, bubblewrap e AppContainer: nenhuma fonte primária dá número; medir no spike.
