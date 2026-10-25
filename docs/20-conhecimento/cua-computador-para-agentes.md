# Cua: um computador para os agentes

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-25T17:22:02-03:00 · **Estado:** vigente · **Reverificar:** no início do spike e a cada 30 dias (o projeto publica quase todo dia)

## O que importa para o buddy

O Cua (`trycua/cua`) dá a cada agente um computador inteiro: um sandbox, que pode ser um contêiner ou uma máquina virtual. O SDK dele roda dentro desse computador os mesmos agentes que o Buddy orquestra (Claude Code, Codex, OpenCode, Gemini, goose, pi, Hermes), por ACP, cada um com a configuração dele.

Isso resolve de outro jeito o que a contenção por processo (MXC, [ADR 0019](../60-decisoes/0019-contencao-pelo-mxc.md)) não resolve: o OpenCode 2 precisa do serviço de fundo dele, e dentro de um computador inteiro esse serviço roda normalmente.

É o candidato natural ao nível **S2** do roadmap ("VM descartável"), adiantado para os agentes. Não substitui a MXC dos comandos do Buddy: complementa.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Repositório `trycua/cua`: Rust; 30.947 estrelas, 2.262 forks, 1.306 issues abertas; criado em 2025-01-31; push em 2026-10-25; releases quase diárias (Spaces 0.13 a 0.16 entre 22 e 25/10) | API do GitHub | 2026-10-25 |
| Licenças: SDK, CLI, `cua daemon`, Driver e Lume são MIT; o app Spaces, o `cua-spacesd` (o daemon dentro do sandbox), o Keyvault e o teleport são FSL-1.1-MIT (fonte disponível, uso e hospedagem própria livres, sem serviço hospedado concorrente, viram MIT em 2 anos) | README (Licensing) | 2026-10-25 |
| `@trycua/cua` **0.9.0** (MIT, 2026-10-24), com binários nativos por plataforma, inclusive `@trycua/cua-win32-x64-msvc`; 4 versões nos últimos 7 dias | registry.npmjs.org | 2026-10-25 |
| Runtimes locais: Linux, contêiner Docker/Podman (gVisor quando instalado, senão runc) e VM QEMU com KVM; macOS, contêiner, VM QEMU com HVF e VMs macOS pelo Lume; **Windows, VM QEMU com WHPX** (a página não lista contêiner nem cita WSL2 ou Hyper-V); `cua runtime doctor` e `cua runtime setup` | cua.ai/docs (local runtimes); `libs/cua/README.md` | 2026-10-25 |
| `sandbox.agents()` roda `claude-code`, `openai-codex`, `gemini-cli`, `google-antigravity`, `opencode`, `goose`, `pi`, `hermes` e `openclaw` **por ACP**. Os eventos são normalizados (`run.events`, `run.stream`), e a conversa segue com `run.send` e `run.interrupt`. As execuções ficam em `~/.cua/agents/<run>` e sobrevivem ao processo do host. `run.artifacts()` lista o que mudou | cua.ai/docs (run a coding agent) | 2026-10-25 |
| Credenciais: só por variáveis de ambiente por execução (`env`, `env_from_host`, gravadas com modo 0600 e ocultadas no log) ou por teleport aprovado. Nada é copiado de `~/.claude` nem de `~/.codex` | idem | 2026-10-25 |
| Arquivos do projeto: a documentação não descreve montagem de pasta. Há transferência explícita (`upload`, `download`, `files.write_text`) e um `--repo` na CLI | idem; own-harness | 2026-10-25 |
| Política de saída (`cua.EgressPolicy(allow, deny)`): **só IP e CIDR** (nome de domínio é recusado). É aplicada pelo host, fora do convidado (nftables em contêiner; iptables com `pasta` em VM Linux), e muda em execução (`spaces.set_egress`). **Recusada com `Unsupported` em QEMU no Windows e no macOS** e nas VMs macOS. DNS não é filtrado por nome. O loopback dentro do convidado é sempre liberado | cua.ai/docs (egress) | 2026-10-25 |
| Instalação no Windows: **prévia** ("expect rough edges"), pelo `install.ps1` ou pelo instalador `.exe`; `-CliOnly` instala só a CLI. O app abre no login por padrão. **Conta cua.ai não é necessária para uso local.** O "primeiro Space com um clique" só existe no Linux e no macOS Apple silicon | cua.ai/docs (install) | 2026-10-25 |
| Cua Cloud e Fleets acabaram em 18/10/2026. O pacote `cuabot` foi descontinuado com problemas de segurança conhecidos ("do not run it") | README; cua.ai/docs (cua-cloud-ended) | 2026-10-25 |
| Computador do Pai: Docker Desktop instalado (`docker.exe`), WSL presente, sem QEMU e sem `cua`; 32 GB de RAM e 12 núcleos lógicos. O estado dos recursos de virtualização do Windows (WHPX, Hyper-V) só se lê como administrador | leitura no Windows do Pai | 2026-10-25 |

## Encaixe no plano (análise do buddy-dev)

- **Onde resolve:**
  - **O OpenCode 2 e qualquer agente com serviço de fundo.** Dentro de um computador inteiro, o loopback interno é livre, que é justamente o que a MXC 1.0.1 não junta com o proxy.
  - **Cada agente com a configuração e as limitações dele,** em computadores separados ou compartilhados.
  - **A retomada depois de queda.**
- **O que exige do nosso lado:**
  - **Domínio:** a política de saída é por IP, então a lista por domínio e o cartão "rede" continuariam com o proxy do Buddy (deixar sair só para o IP do proxy).
  - **Arquivos:** entram e saem por cópia, o que casa com a M2.6 (cópia de trabalho por sessão, integração com diff e aprovação).
  - **Credenciais:** passam por variável de ambiente ou teleport. O login do ChatGPT no Codex não é copiado.
- **O que não sabemos ainda (para o spike):**
  - se a política de saída vale nos contêineres do Docker Desktop no Windows (a página diz "qualquer Docker engine", e o Docker Desktop usa uma VM WSL2);
  - qual o custo de tempo e memória por agente;
  - como o `--repo` e o upload tratam a pasta do Pai;
  - quanto a prévia no Windows aguenta o uso real.
- **Riscos:**
  - o ritmo de releases (versão nova quase todo dia);
  - a prévia no Windows;
  - o binário nativo novo no núcleo, que é dependência a aprovar.
