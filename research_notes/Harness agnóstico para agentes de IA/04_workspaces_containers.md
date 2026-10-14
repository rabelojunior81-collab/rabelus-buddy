# 04 — Workspaces, containers e execução de ferramentas

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. Esta frente trata do ambiente de execução das ferramentas; a estratégia de patches e auditoria no workspace cruza com as notas 06 e 08.

## Resumo

- **Docker Desktop está fora do perfil local.** A documentação de instalação lista 8 GB de RAM como pré-requisito de hardware (backend WSL 2 e Hyper-V). O perfil do usuário tem 4 GB [1].
- **Windows Sandbox** é a opção de isolamento forte no Windows: VM leve baseada no hipervisor, descartável, sem persistência, inicialização em segundos, com gestão de memória. Limites: rede ligada por padrão (desligável por arquivo de configuração), **apenas uma instância por vez** e somente Windows Pro, Enterprise e Education — não roda na Home [2].
- **WSL 2** é a camada que viabiliza execução Linux no Windows: VM utilitária leve, distros como containers isolados dentro dela, namespaces próprios (PID, mount, user, cgroup), rede compartilhada [3]. WSL 1 dispensa virtualização [3].
- **Execução local restrita sem container** é a base viável: processo filho com permissões restritas (Permission Model do Node, estável desde v22.13/v23.5 — nota 09), cwd fixo no workspace, listas de permissão por classe de ação, timeout, limites de processos e ausência de rede por padrão.
- **Execução remota** (Hosted Shell e Code Interpreter da OpenAI) existe como alternativa paga: sai do limite de 4 GB e troca isolamento local por envio de código a terceiro [4].
- **Recomendação preliminar.** Três níveis de execução, escolhidos por risco: (1) ferramentas locais em processo restrito, com aprovação; (2) WSL 2 opcional, quando a ferramenta exigir Linux; (3) execução remota ou sandbox descartável, apenas com aprovação explícita. Docker fica como opção de gateway no servidor, não de máquina local.

## Fatos verificados

### 1. Docker Desktop no Windows [1]

- Pré-requisitos de hardware para o backend WSL 2: processador 64-bit com SLAT, **8 GB de RAM**, virtualização ligada no BIOS/UEFI.
- Backend WSL 2 (padrão) exige WSL 2.1.5+; Enhanced Container Isolation exige WSL 2.6+ (kernel Linux 6.6).
- Windows 10 22H2 (build 19045) Pro/Enterprise/Education ou Windows 11 23H2 (build 22631)+.
- Instalação por usuário (padrão) não precisa de administrador; instalação "all users" exige administrador e é a única que suporta contêineres Windows.
- Grupo `docker-users` dá acesso ao socket do daemon, equivalente a privilégio administrativo no host; com backend WSL 2 para contêineres Linux, não é necessário.
- Licenciamento: gratuito para uso pessoal, educação, open source não comercial e empresas com menos de 250 funcionários e menos de US$ 10 milhões de receita; do contrário, assinatura paga.
- Docker VMM (beta) é um hipervisor otimizado para contêineres que recupera memória ociosa.

### 2. Windows Sandbox [2]

- Ambiente de desktop leve e isolado, com virtualização baseada no hipervisor da Microsoft; kernel separado do host.
- Descartável: fechar apaga tudo; cada execução é uma instância nova; software do host não aparece no sandbox; estado persiste apenas em reinícios feitos de dentro (Windows 11 22H2+).
- Rede: **ligada por padrão**; pode ser desligada por arquivo de configuração `.wsb`; a documentação alerta que rede ligada expõe aplicações não confiáveis à rede interna.
- Incluída no Windows Pro, Enterprise e Education; **não suportada na Home**.
- **Não permite múltiplas instâncias simultâneas.**
- Inicialização em segundos, vGPU e "smart memory management" que otimiza o footprint de memória (sem números publicados).

### 3. WSL 2 [3]

- VM utilitária leve rodando kernel Linux; distros são containers isolados dentro da VM gerenciada.
- Compartilham namespace de rede, device tree (exceto `/dev/pts`), CPU, kernel, memória, swap e `/init`; têm namespaces próprios de PID, mount, user e cgroup, além de processo `init` próprio.
- WSL 2 aumenta desempenho de sistema de arquivos e tem compatibilidade total de syscalls em comparação ao WSL 1.
- Código aberto (github.com/microsoft/WSL).

### 4. Execução remota e outras camadas

- OpenAI Hosted Shell e Code Interpreter: cobrança por sessão de 20 minutos por contêiner (US$ 0,03 a US$ 1,92 conforme tamanho) — nota 02 [4].
- Anthropic execução de código: gratuita quando combinada com web search ou web fetch; 1.550 horas/mês grátis por organização e US$ 0,05/hora depois — nota 02 [5].
- Node.js Permission Model (estável desde v23.5.0 e v22.13.0): restringe acesso a sistema de arquivos, rede, criação de processos, worker threads, addons, WASI, FFI e inspector quando iniciado com `--permission`; `vm` explicitamente **não** é mecanismo de segurança — nota 09 [6].

### 5. Ameaças (referências; detalhamento na nota 08)

- OWASP LLM Top 10 2025: LLM01 Prompt Injection e LLM04 Data and Model Poisoning [7].
- OWASP Top 10 for Agentic Applications 2026: ASI06 Memory & Context Poisoning, com controles de segmentação, validação de escritas e revisão humana — nota 07 [8].
- O ciclo de patches do workspace exige diff, revisão, aprovação, rollback e auditoria (briefing, seção 4.4).

## Interpretações

- **I1. 4 GB muda o desenho.** Com Docker Desktop documentado para 8 GB, a execução local precisa de: (a) ferramentas em processo filho restrito; (b) permissões por classe de ação iguais às do requisito do usuário; (c) WSL 2 como opção, não como padrão. Container completo vira luxo de gateway.
- **I2. Windows Sandbox serve a scripts de terceiros, não ao loop diário.** É descartável e instância única: ótimo para rodar plugin ou script não confiável uma vez, com rede desligada e pasta mapeada como somente leitura; ruim para workspace persistente de projeto.
- **I3. WSL 2 é a ponte Linux.** Quando a ferramenta precisa de Linux (ripgrep, git, python), o harness pode rodar dentro de WSL 2 por decisão explícita, com cwd mapeado. Custo: memória da VM utilitária; números não medidos.
- **I4. Aprovação substitui isolamento onde isolamento é caro.** O requisito do usuário já exige aprovação para oito classes de ação. Com processo restrito, aprovação e auditoria, o risco residual de script arbitrário dentro do workspace é aceitável; fora dele, exige sandbox.
- **I5. Rede como padrão desligada.** Nenhuma ferramenta deveria ter rede por padrão. Acesso à rede (incluindo web search e web fetch) é classe de ação com aprovação própria — coerente com "leitura livre só no workspace" e com o orçamento de US$ 50/mês (buscas a US$ 10/1.000).
- **I6. Patch como diff, não como escrita.** Toda alteração no workspace deve gerar diff revisável, com aprovação humana antes do commit, seguindo o padrão do OpenCode (`revert`/`unrevert`) e do ACP (`request_permission`). Git worktrees por sessão dão isolamento de filesystem barato, sem container.
- **I7. Execução remota é opt-in de privacidade.** Hosted Shell resolve o limite de 4 GB, mas envia código do usuário ao provedor. Fazer como ferramenta opcional, desligada por padrão.

## Hipóteses e pontos não confirmados

- H1. Consumo real de RAM da VM utilitária do WSL 2 e do Windows Sandbox: não medido.
- H2. Eficácia do Permission Model do Node contra scripts arbitrários: não testada; a documentação é clara sobre `vm`, mas não sobre o modelo de permissões como sandbox.
- H3. Job Objects e AppContainer do Windows como controles de processo: não pesquisados nesta rodada.
- H4. microVMs (Firecracker, Kata) e gVisor: não pesquisados; candidatos apenas para o gateway no servidor.
- H5. Se o usuário tem Windows Pro/Enterprise/Education (pré-requisito do Windows Sandbox): não confirmado. Se for Home, a opção de sandbox nativo desaparece.
- H6. Desempenho de execução de testes e builds dentro de WSL 2 com 4 GB: não medido.
- H7. Tempo de inicialização e viabilidade de criar um Windows Sandbox por execução de script: não medido.

## Lacunas e conflitos

- Docker Desktop documenta 8 GB, mas há relatos de execução com menos memória; a fonte primária permanece como 8 GB. A decisão aqui segue a fonte primária.
- Windows Sandbox exige virtualização; máquinas sem suporte ficam sem nenhuma forma de sandbox nativo no Windows.
- A nota 09 registra que o Tauri exige WebView2 e Visual Studio C++ no Windows; empilhado com WSL, o custo de setup do desenvolvedor cresce.
- Consumo de RAM de Ollama junto com workspaces e runtime na mesma máquina de 4 GB: não somado; risco de pressão de memória.

## Recomendação preliminar

### Níveis de execução

| Nível | Quando | Mecanismo | Controles |
|---|---|---|---|
| 1. Processo restrito (padrão) | Ferramentas do harness no workspace do usuário | Processo filho, cwd fixo, sem rede, sem elevação; Permission Model quando em Node | Aprovação por classe de ação; timeout; limites de CPU, processos e tempo; auditoria |
| 2. WSL 2 (opcional) | Ferramenta que exige Linux | Sessão dentro de WSL 2, cwd mapeado, rede desligada por padrão | Mesmos controles do nível 1, mais isolamento de namespace |
| 3. Sandbox descartável (opt-in) | Plugin ou script de terceiro não confiável | Windows Sandbox (rede desligada, pasta somente leitura) ou contêiner no gateway | Aprovação humana obrigatória; instância única; nada persiste |
| 4. Execução remota (opt-in) | Tarefa pesada que não cabe em 4 GB | Hosted Shell/Code Interpreter | Aprovação; orçamento; aviso de privacidade |

### Regras de workspace

- Um git worktree por sessão, criado sob aprovação; alterações como diff; commit só após aprovação; `revert` como operação deprimeira classe.
- Diretório de trabalho, arquivos e variáveis de ambiente por sessão; nada de escrita fora do worktree sem a classe `external_directory` aprovada.
- Limites por sessão: tempo total, processos concorrentes, uso de disco, chamadas de rede (zero por padrão) e gasto.
- Log de auditoria por execução: comando, argumentos, duração, bytes escritos, aprovação e resultado.

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo)

| Opção (pergunta de arquitetura) | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| Processo restrito local | 5 | 4 | 5 | 5 | 3 | 5 | 5 |
| WSL 2 opcional | 4 | 5 | 4 | 3 | 4 | 4 | 4 |
| Windows Sandbox descartável | 3 | 4 | 2 | 1 | 5 | 5 | 3 |
| Docker Desktop local | 1 | 5 | 5 | 2 | 4 | 3 | 2 |
| Docker no gateway (servidor) | 4 | 5 | 5 | 3 | 4 | 3 | 3 |
| Execução remota (OpenAI) | 3 | 4 | 3 | 2 | 2 | 3 | 4 |

Justificativas curtas: processo restrito é o único que cabe em 4 GB e mantém aprovação e auditoria, com isolamento mais fraco; WSL 2 dá Linux sem container; Sandbox é forte, mas descartável, instância única e só em edições Pro+; Docker local esbarra nos 8 GB documentados; execução remota resolve memória ao custo de privacidade.

### Próximos passos (não executados)

1. Confirmar a edição do Windows do usuário (Pro/Enterprise/Education)?
2. Medir RAM de WSL 2 e do Windows Sandbox no hardware real.
3. Pesquisar Job Objects e AppContainer como controles de processo no Windows.
4. Spike: worktree por sessão com diff e aprovação, sem container.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | Install Docker Desktop on Windows | Docker | https://docs.docker.com/desktop/setup/install/windows-install/ | 14/10/2026 |
| 2 | Windows Sandbox overview | Microsoft Learn | https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview | 14/10/2026 |
| 3 | What is Windows Subsystem for Linux | Microsoft Learn | https://learn.microsoft.com/en-us/windows/wsl/about | 14/10/2026 |
| 4 | API Pricing (ferramentas: Hosted Shell) | OpenAI | https://platform.openai.com/docs/pricing | 14/10/2026 |
| 5 | Pricing (execução de código) | Anthropic | https://platform.claude.com/docs/en/about-claude/pricing | 14/10/2026 |
| 6 | Permission Model | Node.js | https://nodejs.org/api/permissions.html | via nota 09 (13/10/2026) |
| 7 | OWASP Top 10 for LLM Applications (2025) | OWASP GenAI Security Project | https://genai.owasp.org/llm-top-10/ | via nota 07 (13/10/2026) |
| 8 | OWASP Top 10 for Agentic Applications 2026 (ASI06) | OWASP GenAI Security Project | https://genai.owasp.org/download/52117 | via nota 07 (13/10/2026) |
