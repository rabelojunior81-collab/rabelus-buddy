# 01 — Runtime, ciclo do agente e protocolos

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. "Não confirmado" indica informação ausente nas fontes consultadas. Cobertura de linguagens dos SDKs e a análise de stack estão na nota 09; a avaliação de projetos (OpenCode, Hermes, Buzz) está nas notas 11 e 12.

## Resumo

- **Modelos de execução.** Três formas viáveis: (a) runtime próprio, com loop de ferramentas e estado sob controle do harness; (b) runtime de terceiro como processo subordinado (OpenCode, Claude Agent SDK, que executa o binário do Claude Code); (c) runtime de orquestração como biblioteca (LangGraph). A forma (a) é a que preserva o requisito multi-tudo; (b) e (c) entram como adaptadores [1][2][3].
- **OpenCode** é o agente open source `anomalyco/opencode` (antes `sst/opencode`), com interfaces TUI, desktop e IDE, arquitetura cliente-servidor, SDK TypeScript `@opencode-ai/sdk`, sessões com abort, revert, summarize e permissões por ferramenta, agentes primários e subagentes, skills, MCP e suporte a ACP. Usa o AI SDK e o Models.dev, com 75+ provedores, incluindo modelos locais [4][5][6].
- **Claude Agent SDK** é a biblioteca que roda o binário do Claude Code em Python e TypeScript, com ferramentas embutidas, hooks, subagentes, MCP, permissões, sessões com resume e fork, skills e plugins. É regida pelos Termos Comerciais da Anthropic, não é open source, e há regras de marca que proíbem apresentar o produto como "Claude Code" [1].
- **MCP 2026-07-28** é a especificação corrente: JSON-RPC 2.0, recursos, prompts e ferramentas do lado do servidor; elicitation do lado do cliente; extensões opt-in para tarefas assíncronas (Tasks), skills sobre MCP e apps interativas. O documento trata descrições de ferramentas como não confiáveis e exige consentimento do usuário [7].
- **ACP v1** cobre exatamente o ciclo de um agente de código: inicialização, sessão, prompt, atualizações, cancelamento, permissão por chamada de ferramenta (`session/request_permission`), sistema de arquivos e terminais. Agentes rodam como subprocessos do cliente [8].
- **A2A** é agente-para-agente, Apache-2.0, doado à Linux Foundation e hoje sob a Agentic AI Foundation; SDKs em seis linguagens; CLI lançada em outubro de 2026. Não é protocolo de ferramentas nem de subagentes [9].
- **Recomendação preliminar.** Runtime próprio enxuto (loop, estado, aprovações, eventos) atrás de portas estáveis; MCP como padrão de ferramentas e skills; ACP como fronteira para agentes de código externos; A2A apenas como opção futura. LangGraph e Claude Agent SDK como adaptadores opcionais.

## Fatos verificados

### 1. OpenCode

- Produto: agente open source de código, em terminal (TUI), desktop e IDE; site opencode.ai; repositório `anomalyco/opencode` (o mesmo produto já foi publicado como `sst/opencode`) [4][5][6].
- Provedores: usa o AI SDK e o Models.dev, com 75+ provedores de LLM e suporte a modelos locais; IDs no formato `provedor/modelo`; OpenCode Zen é uma lista curada de modelos verificados pela equipe [4][5].
- Arquitetura: cliente-servidor; todas as interfaces usam o `@opencode-ai/sdk`; pacotes compartilhados de UI (SolidJS) e de lógica; desktop com Tauri e Electron; CLI e TUI; integração com IDE [6].
- SDK: cliente TypeScript para o servidor; cria sessões (`session.create`), envia prompt (`session.prompt`, com `noReply` e `outputFormat` para saída estruturada), lista e edita mensagens, aborta (`session.abort`), resume (`session.revert`/`unrevert`), resume de executáveis (`session.shell`), responde a pedidos de permissão (`postSessionByIdPermissionsByPermissionId`), compartilha e resume sessões (`share`, `children`, `summarize`) [5].
- Permissões: chaves por ferramenta (`read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `external_directory`, `webfetch`, `websearch`, `lsp`, `skill`, `question`, `doom_loop`), com ações `allow`, `ask` e `deny`; casamento por padrão glob, inclusive para ferramentas MCP; `external_directory` controla acesso fora do worktree [4].
- Agentes: dois primários embutidos (Build, com tudo liberado; Plan, somente leitura) e três subagentes (General, Explore, Scout); configuráveis por JSON ou Markdown; subagente herda o modelo do primário, salvo configuração [4].
- Ferramentas embutidas: `read`, `edit`, `write`, `apply_patch`, `grep`, `glob`, `lsp`, `webfetch`, `shell`, `task`, `skill` [6].
- Privacidade: a documentação afirma que o OpenCode não armazena código nem dados de contexto [4].
- Windows: a documentação recomenda WSL para a melhor experiência; há instalação por Chocolatey, Scoop, npm, Mise e Docker [4].

### 2. Claude Agent SDK

- É uma biblioteca que executa o binário do Claude Code, em Python e TypeScript; outras linguagens usam o CLI como subprocesso com `-p` e `--output-format json` [1].
- Capacidades: ferramentas embutidas (ler, escrever, editar arquivos, rodar comandos, buscar na web), hooks no ciclo de vida, subagentes, MCP, permissões (quais ferramentas rodam automáticas e quais exigem aprovação), sessões com manutenção de contexto, resume e fork; skills, comandos e memória carregados de `.claude/` e `~/.claude/`; plugins que empacotam skills, agentes, hooks e servidores MCP [1].
- Termos: uso regido pelos Termos Comerciais da Anthropic; terceiros não podem oferecer login do claude.ai nem limites de taxa do claude.ai em seus produtos; regras de marca proíbem "Claude Code" como nome do produto de terceiro [1].

### 3. LangGraph (resumo; detalhes na nota 03)

- Runtime de orquestração com estado, com execução durável, streaming, human-in-the-loop e persistência; checkpointer "community contributed" no open source; licença MIT [3].

### 4. MCP (especificação 2026-07-28)

- Protocolo aberto sobre JSON-RPC 2.0; papéis de host, cliente e servidor; mensagens stateless com negociação de capacidades por requisição [7].
- Servidor oferece recursos, prompts e ferramentas; cliente oferece elicitation (pedidos de informação ao usuário); utilidades de configuração, progresso, cancelamento e erro [7].
- Extensões opt-in: Tasks (execução assíncrona de operações longas, com polling, entrada em voo e handles duráveis), Skills over MCP (instruções estruturadas descobertas via MCP) e MCP Apps (UI interativa renderizada na conversa) [7].
- Segurança: consentimento explícito do usuário antes de expor dados ou invocar ferramentas; descrições de ferramentas (anotações) são não confiadas, salvo de servidor confiável; hosts não devem transmitir dados de recursos sem consentimento [7].
- SDKs oficiais Tier 1: TypeScript, Python, C#, Go, Rust e Ruby (detalhe da nota 09) [10].

### 5. ACP v1

- JSON-RPC 2.0; agentes são programas que modificam código e rodam como subprocessos do cliente [8].
- Fluxo: `initialize` (negociação de versão e capacidades), `authenticate` opcional, `session/new` ou `session/load`, `session/prompt` com `session/update` de progresso, `session/cancel` para interromper, resposta no fim do turno com razão de parada [8].
- Cliente: `session/request_permission` para autorização de chamadas de ferramenta; `fs/read_text_file`, `fs/write_text_file`; `terminal/create`, `output`, `release`, `wait_for_exit`, `kill`; `elicitation/create` [8].
- Atualizações de sessão incluem blocos de mensagem, chamadas de ferramenta, planos, comandos disponíveis, mudança de modo, avisos e compactação de contexto [8].
- Caminhos absolutos obrigatórios; linha 1-based; extensibilidade por `_meta` e métodos com prefixo `_` [8].

### 6. A2A

- Protocolo aberto para comunicação entre agentes opacos; originalmente do Google, doado à Linux Foundation; mantido por comitê com AWS, Cisco, Google, IBM Research, Microsoft, Salesforce, SAP e ServiceNow; em agosto de 2026 passou a integrar a Agentic AI Foundation [9].
- Licença Apache-2.0; SDKs em Python, JavaScript, Java, C#/.NET, Go e Rust; CLI própria lançada em outubro de 2026 [9].
- Escopo: descoberta, delegação e troca de resultados entre agentes; explicitamente não é kit de desenvolvimento, não é protocolo de subagentes nem de chamada de ferramentas, e não substitui o MCP [9].
- Bindings: JSON-RPC, gRPC e HTTP; cabeçalho `A2A-Version` com erro `VersionNotSupportedError` (detalhe da nota 09) [11].

## Interpretações

- **I1. O harness precisa de um loop próprio mínimo.** Aprovação humana obrigatória antes de oito classes de ação, memória em cinco níveis, orçamento fechado e identidade versionada são regras de domínio. Colocá-las dentro do loop de outro projeto (OpenCode, Claude Agent SDK, LangGraph) significa que as regras passam a depender das capacidades de permissão dele. Um loop próprio com 100 a 200 linhas, com portas para ferramentas e provedores, é o que mantém o controle.
- **I2. ACP é a fronteira natural para agentes externos.** ACP já traz `session/request_permission`, terminal e filesystem, exatamente as fronteiras do requisito de aprovação. O harness pode ser cliente ACP de agentes de código (OpenCode, e outros) sem absorver o loop deles. O suporte do OpenCode a ACP (página de documentação) reduz o trabalho de integração [4][8].
- **I3. MCP é o padrão de ferramentas e de skills.** A extensão Skills over MCP e o próprio conceito de skills do usuário convergem: um pacote de instruções e ferramentas descoberto via MCP. Ferramentas locais (arquivo, terminal, memória, aprovação) devem ser expostas como servidor MCP do próprio harness, o que as torna testáveis e reutilizáveis por outros agentes [7].
- **I4. Onde LangGraph entra.** Como engine opcional atrás da porta de orquestração (nota 03): dá execução durável, HITL e persistência, mas com checkpointer não nativo e tipos próprios. Serve para workflows longos; não deve ser o dono do modelo de domínio.
- **I5. Onde o Claude Agent SDK entra.** Como agente plugável de código, com sessão, permissões e MCP. Riscos: não é open source; termos comerciais; marca; exige o binário do Claude Code; consome API da Anthropic. Para um harness agnóstico, é um adaptador entre vários.
- **I6. Onde o OpenCode entra.** Agente open source, multi-provedor (75+), com SDK e permissões. Como adaptador (subprocesso ou SDK), não como núcleo: o núcleo precisa de canais, memória e aprovações que o OpenCode não cobre. A recomendação de WSL no Windows pesa contra o uso nativo no ambiente do usuário.
- **I7. A2A ainda é opcional.** Comunicação agente-a-agente não é requisito das decisões do usuário. Registrar a porta (A2A) sem implementar evita retrabalho se a necessidade surgir.
- **I8. Interrupção e retomada precisam de estado próprio.** ACP e OpenCode têm cancelamento e resume, mas o estado do usuário (sessão, aprovações, memória, orçamento) não pode morar no processo do agente. O modelo de sessão e a persistência são assuntos da nota 06.
- **I9. Separação determinístico e probabilístico.** Registros de sessão, aprovações, limite de gasto e auditoria são determinísticos; a escolha de ferramenta e o texto são probabilísticos. O loop deve permitir que etapas determinísticas aconteçam sem o modelo (ex.: validação de argumentos, política de permissão, orçamento).

## Hipóteses e pontos não confirmados

- H1. O suporte do OpenCode a ACP: a página de documentação existe no menu [4], mas o comportamento (cliente, servidor ou ambos) não foi lido.
- H2. Estabilidade da API do SDK `@opencode-ai/sdk` entre as versões 1 e 2: não confirmada.
- H3. Licença do OpenCode: não lida nesta rodada (avaliação na nota 11).
- H4. Se o Claude Agent SDK permite hooks de permissão arbitrários ou só os modos documentados: não confirmado.
- H5. Estado das extensões MCP (Tasks, Skills over MCP, MCP Apps): estágio de maturidade e adoção não confirmados.
- H6. Desempenho do ACP e do MCP por stdio em Windows: não medido.
- H7. Se o A2A CLI é adequada para uso individual: não avaliada.

## Lacunas e conflitos

- Organização do OpenCode: buscas e documentação alternam entre `sst/opencode` e `anomalyco/opencode`; o site atual aponta para `anomalyco/opencode`. A renomeação em si não foi documentada na fonte lida.
- "OpenCode 1" e "OpenCode 2" coexistem e não podem ser instalados lado a lado pelo comando padrão; as docs de v2 trazem Console e Zen. Qual versão é base de integração é decisão da nota 11.
- LangSmith Deployment e Managed Deep Agents (nota 03) também são runtimes hospedados; a comparação completa está na nota 03.
- Runtime do Hermes Agent (mecanismo de sessão e identidade) será tratado na nota 07 e 11.

## Recomendação preliminar

### Arquitetura de execução

1. **Loop próprio no núcleo.** Estados: sessão → execução → passo → chamada de ferramenta → aprovação → resultado. Eventos imutáveis; cancelamento por token; timeout e retry por política; checkpointer próprio em SQLite (nota 06).
2. **Porta de ferramentas local via MCP.** Ferramentas próprias (arquivo, terminal, memória, aprovação, custo) como servidor MCP; ferramentas externas via MCP também. Consentimento e permissão no núcleo, não no servidor.
3. **Porta de agente externo via ACP.** Adaptador cliente ACP para rodar OpenCode e similares como subprocesso, com `request_permission` ligado ao sistema de aprovações do usuário.
4. **Porta de orquestração.** LangGraph opcional, atrás de interface própria; Claude Agent SDK como agente plugável, com sessão e permissões.
5. **Porta A2A registrada, não implementada.**
6. **Streaming e eventos um único formato interno**, exportado para OTel GenAI (nota 03) e para os canais (nota 05).

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo com base nas fontes)

| Opção (pergunta de arquitetura) | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| Loop próprio + MCP + ACP | 5 | 4 | 5 | 5 | 5 | 5 | 3 |
| OpenCode como runtime do produto | 3 | 4 | 4 | 4 | 3 | 5 | 2 |
| OpenCode como agente plugável via ACP | 4 | 4 | 4 | 4 | 4 | 5 | 4 |
| Claude Agent SDK como agente plugável | 3 | 5 | 4 | 2 | 3 | 3 | 4 |
| LangGraph como engine opcional | 4 | 4 | 4 | 3 | 4 | 5 | 3 |
| Managed Deep Agents como runtime hospedado | 2 | 2 | 3 | 1 | 2 | 2 | 4 |

Justificativas curtas: o loop próprio é o único que mantém as regras de aprovação, memória e orçamento sob controle do projeto, ao custo de implementar estado e checkpoint; OpenCode traz muito pronto, mas impõe seu modelo de sessão e recomenda WSL no Windows; Claude Agent SDK não é open source e tem regras de marca; LangGraph é maduro, mas com checkpointer comunitário; MDA é beta e envia dados ao LangSmith.

### Próximos passos (não executados)

1. Ler a licença do OpenCode e a página de ACP (nota 11).
2. Spike: harness mínimo como cliente ACP, pedindo permissão via `session/request_permission`.
3. Spike: expor uma ferramenta própria como servidor MCP e consumi-la pelo loop.
4. Medir custo de stdio de MCP/ACP no Windows.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | Agent SDK overview | Anthropic | https://code.claude.com/docs/en/agent-sdk/overview | 14/10/2026 |
| 2 | LangGraph overview | LangChain | https://docs.langchain.com/oss/python/langgraph/overview | via nota 03 (13/10/2026) |
| 3 | Self-hosted LangSmith: FAQ | LangChain | https://docs.langchain.com/langsmith/faq | via nota 03 (13/10/2026) |
| 4 | Intro, Models, Agents (documentação) | OpenCode (Anomaly) | https://opencode.ai/docs/ | 14/10/2026 |
| 5 | SDK | OpenCode | https://opencode.ai/docs/sdk/ | 14/10/2026 |
| 6 | Página inicial e interfaces | OpenCode | https://opencode.ai/ | 14/10/2026 |
| 7 | Specification (2026-07-28) | Model Context Protocol | https://modelcontextprotocol.io/specification/latest | 14/10/2026 |
| 8 | Overview (protocolo v1) | Agent Client Protocol | https://agentclientprotocol.com/protocol/v1/overview | 14/10/2026 |
| 9 | A2A Protocol (página inicial) | A2A Project / Linux Foundation | https://a2a-protocol.org/latest/ | 14/10/2026 |
| 10 | SDKs (Develop with MCP) | Model Context Protocol | https://modelcontextprotocol.io/docs/2026-07-28/sdk | 14/10/2026 |
