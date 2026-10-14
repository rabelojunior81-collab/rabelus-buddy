# Relatório de pesquisa — Harness agnóstico para agentes de IA

**Data de corte:** 14/10/2026. **Solicitação:** briefing `BRAINSTORM.md` (pesquisa determinada), com as decisões da seção 9 do briefing como premissas. **Método:** fontes primárias (documentação oficial, repositórios, licenças, preços), com data de acesso registrada; fatos verificados separados de interpretações; itens não confirmados marcados. **Notas de origem:** `research_notes/Harness agnóstico para agentes de IA/01` a `12`.

## Premissas (decisões do usuário, seção 9 do briefing)

- Produto: harness de agentes de IA agnóstico, extensível e "multi-tudo" — pluralidade técnica desde o início: SDKs, provedores de modelos, LLMs, linguagens, protocolos e frameworks. **Multiusuário, equipes e tenants isolados estão fora do escopo.**
- Primeiro usuário: desenvolvedor individual. Modo de operação: híbrido (núcleo local, com componentes ou gateway em servidor).
- Escopo completo, sem recorte superficial; nada de versão mínima. Estão no escopo: plugins de terceiros, scripts arbitrários, skills, protocolos MCP, ACP e A2A. Modelos locais apenas como disponibilidade e preparação, sem prioridade de implementação.
- Canais: WhatsApp, Telegram, Slack, Microsoft Teams, Discord, E-mail e Buzz (github.com/block/buzz). O Buzz é canal a integrar e também referência de produto.
- Aprovação humana obrigatória para oito classes de ação: criar ou alterar arquivos; executar comandos no terminal; apagar arquivos ou dados; alterar sistemas externos por API; enviar mensagens em canais; usar credenciais ou segredos; instalar pacotes ou plugins; gastar acima de um limite de custo. Leitura livre apenas dentro do workspace (inferido: pesquisa na web exige aprovação — a confirmar).
- Memória em cinco níveis: pessoa, projeto, workspace, agente e organização. Usuário dono, administrador, membros do projeto e o próprio agente podem inspecionar, corrigir e apagar; o agente só corrige ou apaga a própria memória com aprovação humana.
- Plataformas: Windows, macOS, Linux, navegador (Web UI), Android e iOS. Recursos mínimos: 4 GB de RAM, GPU não necessária, até 50 GB de disco.
- Orçamento: US$ 50 por mês para APIs e infraestrutura. Sem receita (projeto pessoal ou open source).

## 1. Resumo executivo

**O produto é viável dentro das restrições.** A pesquisa sustenta uma arquitetura com núcleo local em TypeScript/Node, estado em SQLite, ferramentas via MCP, agentes externos via ACP, três camadas de modelo com orçamento fechado, memória em cinco níveis com aprovação humana e um gateway mínimo em servidor para o que exigir endpoint público. O custo estimado de operação cabe em US$ 50/mês com a camada de trabalho usando cache de prompt (≈ US$ 45 a 47/mês, ver seção 10).

**Sete decisões centrais:**

1. **Runtime próprio, enxuto, com portas estáveis.** O loop do agente, o estado, as aprovações e o orçamento ficam no núcleo. LangGraph, LangChain, Deep Agents, Managed Deep Agents, OpenCode, Claude Agent SDK e DeepSeek Harness entram como adaptadores ou referências — nunca como donos do estado (notas 01, 03, 11, 12).
2. **MCP para ferramentas e skills; ACP para agentes de código externos; A2A apenas registrado.** MCP é a especificação corrente (2026-07-28), com extensão de skills; ACP cobre o ciclo de agente de código com `session/request_permission`; A2A é agente-a-agente e não é requisito (nota 01).
3. **Três camadas de modelo com orçamento fechado e cache obrigatório.** Barata (Claude Haiku 5.5, gpt-5-nano, Gemini 3.5 Flash-Lite), trabalho (Claude Sonnet 5.5, gpt-6.1-sol, Gemini 4 Argon, gpt-5.1) e topo (Claude Opus 5.5, Fable 5.1, gpt-6-astra) — a última só com aprovação de custo. Cache de prompt é requisito de arquitetura, não otimização (nota 02).
4. **SQLite em WAL como estado canônico; arquivos versionados como fonte de verdade de identidade e conhecimento.** Log de eventos com projeções; FTS5 + sqlite-vec para busca; Litestream para backup. Um único escritor por banco (notas 06, 07).
5. **Execução em camadas, conforme o risco:** processo restrito (padrão), WSL 2 (opcional), sandbox descartável (scripts de terceiros) e execução remota (opt-in). Docker Desktop está fora do perfil local: a documentação exige 8 GB de RAM (nota 04).
6. **Gateway mínimo para o que exige endpoint público.** Só o WhatsApp obriga webhook público; Telegram (polling), Slack (Socket Mode) e Discord (Gateway) funcionam com conexões de saída. O gateway fica em VPS de entrada; o Buzz, com relay próprio, também no servidor (notas 05, 12).
7. **Observabilidade com OTel GenAI + Langfuse Cloud.** Self-hosting de Langfuse ou LangSmith não cabe em 4 GB nem em US$ 50/mês (nota 03).

**Riscos principais:** preços promocionais com expiração (Gemini dobra em janeiro de 2027); política de "AI Providers" do WhatsApp ainda não lida; ausência de assinatura de código Windows para o Brasil; estabilidade de APIs em previa (DeepSeek Harness); decisão de mobile pendente.

## 2. Respostas às perguntas do briefing (seção 3)

**1. Qual é o problema e o público prioritário?** Um desenvolvedor individual que quer um único sistema para operar agentes de IA em vários provedores, com ferramentas, memória e canais, sob aprovação humana e orçamento fechado. As tarefas que justificam reunir tudo: programar e revisar código em workspaces isolados, pesquisar com fontes, manter conhecimento de projeto verificável, operar o agente por canais de mensagem e controlar custo. Público: quem já usa CLI de agente e querDonos dos dados, do estado e das regras.

**2. O que significa "agnóstico" em termos verificáveis?** Cinco compromissos mensuráveis: (a) trocar de provedor sem reescrever o núcleo — adaptador fino por provedor atrás de interface comum; (b) portabilidade de sessão — estado canônico em SQLite e arquivos versionados, independente de provedor; (c) compatibilidade de ferramentas — ferramentas próprias como servidor MCP, Consumptioníveis por outros agentes; (d) formato de eventos único, exportado por OTel GenAI; (e) protocolos abertos (MCP, ACP, A2A) como fronteiras. O que não se abstrai sem perda: tokenizadores (Anthropic 4.7+ gera ~30% mais tokens), semântica de cache, estrutura de preço por contexto longo e ferramentas nativas de busca (nota 02).

**3. O que é próprio e o que é integrado?** Próprio: loop do agente, política de permissões e aprovações, sessões e eventos, memória e identidade, orçamento, auditoria, gateway de canais. Integrado como dependência: SDKs de provedores, OTel, FTS5/sqlite-vec, bibliotecas de CLI/TUI. Integrado como serviço gerenciado opcional: Langfuse Cloud, OpenRouter ou LiteLLM. Integrado como subprocesso atrás de adaptador: OpenCode (ACP), DeepSeek Harness (ACP), Claude Agent SDK. Referência sem dependência: Hermes (padrões de identidade), OpenWiki (padrão de claims), Buzz (produto). Nada de fork.

**4. O que preserva melhor segurança, confiabilidade, experiência, portabilidade e evolução?** A combinação: aprovação determinística por classe de ação (não detecção de injeção), rede desligada por padrão, cofre do SO para segredos, estado e eventos com auditoria sem conteúdo sensível, cache de prompt estável, contratos versionados e adaptadores isolados por provedor e por canal (notas 02, 05, 08).

**5. Qual é a sequência de entrega do escopo completo e o que pode bloquear?** Ver seção 11. Bloqueios prováveis: estabilidade das APIs em previa; preço do VPS (não confirmado); política de AI Providers do WhatsApp; desempenho real em 4 GB; decisão de mobile.

**6. O produto é local, self-hosted, multiusuário ou SaaS?** Local/individual com híbrido: núcleo local, gateway mínimo em servidor. Multiusuário fora do escopo; SaaS fora do escopo. Self-hosting completo (Buzz, Langfuse) é opção futura em hardware maior.

## 3. Arquitetura de referência

```
┌────────────────────────── NÚCLEO LOCAL (Windows/macOS/Linux) ─────────────────────────┐
│                                                                                      │
│  CLI/TUI ─┐                                                                          │
│  Web UI ──┼──► ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐            │
│  Desktop ─┘    │ Loop do      │   │ Sessões e     │   │ Aprovações e     │            │
│  (Tauri+Rust)  │ agente       │◄─►│ eventos       │◄─►│ orçamento        │            │
│                │ (estado,     │   │ (SQLite WAL,  │   │ (8 classes,      │            │
│                │  checkpoint) │   │  projeções)   │   │  limite por mês) │            │
│                └──────┬───────┘   └───────────────┘   └──────────────────┘            │
│                       │                                                              │
│   ┌───────────────┬───┴────────┬─────────────────┬──────────────────┐                  │
│   │ Adaptadores   │ Memória    │ Identidade      │ Auditoria        │                  │
│   │ de provedor   │ 5 níveis   │ (arquivos       │ (hashes, sem     │                  │
│   │ (3 camadas)   │ FTS5+vec   │  versionados)   │  conteúdo)       │                  │
│   └───────────────┴────────────┴─────────────────┴──────────────────┘                  │
│                                                                                      │
│   Servidor MCP próprio (ferramentas) │ Cliente MCP (ferramentas externas)             │
│   Cliente ACP (agentes externos)     │ Runners de plugins/scripts (stdio, isolados)   │
└──────────────────────────────────────────────────────────────────────────────────────┘
        │ conexões de saída (polling/Gateway/Socket Mode/HTTPS) │
        ▼                                                        ▼
┌─────────────────── GATEWAY (VPS de entrada) ───────────┐   ┌── Observabilidade ──┐
│ Webhook WhatsApp (obrigatório)                          │   │ OTel GenAI         │
│ Webhook Slack (opcional)                                │──►│ → Collector        │
│ Fila + idempotência + retransmissão ao núcleo            │   │ → Langfuse Cloud   │
│ Relay do Buzz (Postgres/Redis/MinIO) quando integrado    │   │ (Hobby → Core)     │
└─────────────────────────────────────────────────────────┘   └─────────────────────┘
```

**Fronteiras e contratos**

| Fronteira | Mecanismo | Contrato |
|---|---|---|
| Interfaces ↔ núcleo | SDK interno (TS) | Tipos + JSON Schema 2020-12 |
| Núcleo ↔ agentes externos | ACP (subprocesso, JSON-RPC stdio) | ACP v1; `request_permission` ligado às aprovações |
| Núcleo ↔ ferramentas | MCP (cliente e servidor) | MCP 2026-07-28; tools, resources, prompts; extensão Skills |
| Núcleo ↔ gateway | HTTPS, conexão de saída do núcleo | OpenAPI 3.2.1, versionado; idempotência por evento |
| Núcleo ↔ provedores | SDKs oficiais | Interface comum mínima + capacidades declaradas |
| Núcleo ↔ observabilidade | OTLP | OTel GenAI (`gen_ai.*`), conteúdo desligado por padrão |
| Plugins/scripts | Processo filho, stdio | JSON-RPC; permissões mínimas; rede desligada |

**Fluxo de um evento** (exemplo, mensagem no Telegram): adaptador de canal recebe → evento de sessão persistido com chave de idempotência → política de permissão avalia a intenção → se a ação é de risco, pedido de aprovação é criado (*pending*, com expiração e canal de resposta) → execução serializa passos no executor da sessão → chamadas de ferramenta via MCP ou local, cada uma registrada → resultado vira evento e delta de streaming para o canal → spans OTel sem conteúdo → custo acumulado no orçamento da sessão, do dia e do mês → em 80% do orçamento, degradação de camada; em 100%, bloqueio com aviso.

## 4. Decisões recomendadas

| # | Decisão | Justificativa (notas) |
|---|---|---|
| D1 | Loop próprio enxuto; portas para orquestração, ferramentas e agentes | Regras de aprovação, memória e orçamento não podem depender de terceiros (01, 03) |
| D2 | TypeScript/Node LTS no núcleo, UI e adaptadores; Rust só no Core do Tauri | Maior cobertura de SDKs oficiais; mesma linguagem da Web UI; Permission Model estável (09) |
| D3 | Tauri 2 + React no desktop; mobile como cliente fino (Tauri mobile ou Flutter — decisão pendente) | Reuso de componentes; diretriz 2.5.2 da Apple impede plugins no iOS (09) |
| D4 | Monólito modular + processos separados para runners de plugins e gateway | Um desenvolvedor; multi-tudo sem multiplicar toolchains (09) |
| D5 | SQLite WAL canônico + arquivos versionados; log de eventos com projeções; Litestream | Um escritor, sem servidor, cross-platform, retomada barata (06, 07) |
| D6 | Memória em cinco níveis com claims e evidência; aprovação para escrita; padrões do Hermes e do OpenWiki | Governança contra envenenamento desde o início (07) |
| D7 | Identidade como arquivos versionados (SOUL/USER/AGENTS/policy/tools), snapshot no início da sessão | Cache-friendly; auditável; inspirado no Hermes (07) |
| D8 | Três camadas de modelo, roteamento por tarefa, cache obrigatório, orçamento fechado com degradação automática | Único formato que cabe em US$ 50/mês (02, 10) |
| D9 | Execução em quatro níveis: processo restrito (padrão), WSL 2, sandbox descartável, execução remota (opt-in) | 4 GB de RAM descarta Docker local (04) |
| D10 | MCP como padrão de ferramentas e skills; ACP para agentes externos; A2A apenas registrado | Especificações correntes; ACP já tem permissão e terminal (01, 11, 12) |
| D11 | Canais iniciais sem endpoint público (Telegram, CLI, Slack Socket Mode, Discord Gateway, e-mail); gateway mínimo só para WhatsApp; Buzz via relay próprio | Só o WhatsApp obriga webhook (05, 12) |
| D12 | OTel GenAI + Langfuse Cloud; sem self-hosting de observabilidade | Requisitos de 16+ GB inviabilizam (03) |
| D13 | Segredos no cofre do SO; rede desligada por padrão; allowlist anti-SSRF; auditoria sem conteúdo; SBOM no release | Modelo de ameaças de agentes (08) |
| D14 | Distribuição: instaladores primeiro, lojas depois; Windows sem assinatura (aviso do SmartScreen) até haver razão | Artifact Signing não cobre o Brasil (09, 10) |
| D15 | i18n pt-BR e inglês; Web UI com alvo WCAG AA | Requisito de qualidade, sem custo de plataforma (10) |

## 5. Alternativas descartadas

| Alternativa | Motivo (nota) |
|---|---|
| LangGraph como dono do estado | Acoplaria o domínio; checkpointer "community contributed" no open source (03) |
| Deep Agents / Managed Deep Agents no núcleo | Empilha LangChain/LangGraph; beta; instruções e segredos vão para o LangSmith; Engine pode alterar memória entre execuções (03) |
| Claude Agent SDK como núcleo | Não é open source; Termos Comerciais; regras de marca (01, 11) |
| Docker Desktop na máquina local | Documentação exige 8 GB de RAM (04) |
| LangSmith ou Langfuse self-hosted | 16 GB ou mais; LangSmith self-hosted é Enterprise (03) |
| PostgreSQL local como estado canônico | Servidor em 4 GB; sem ganho para uso individual (06, 07) |
| Event sourcing completo (replay total) | Complexidade sem necessidade; log + projeções basta (06) |
| Sincronização offline com CRDTs | Sem requisito confirmado (06) |
| Graphiti, Honcho, Mem0 self-hosted ou Basic Memory (AGPL) como núcleo de memória | Infraestrutura de grafo/servidor ou licença AGPL; entram só como adaptadores (07) |
| Fork de OpenCode, Hermes, Buzz ou DeepSeek Harness | Integração entrega o valor; fork de produto ativo custa sincronização e segurança (11, 12) |
| Multiusuário, equipes e tenants | Fora do escopo por decisão do usuário |
| SaaS operado pelo projeto | Fora do escopo; custo e operação incompatíveis com o orçamento |
| Publicação nas lojas na fase inicial | Contas, revisões e testes de 12 a 14 dias atrasam sem agregar ao uso individual (09, 10) |
| Modelos locais como prioridade | Decisão do usuário: apenas disponibilidade e preparação (02) |

## 6. Matrizes comparativas

**Provedores (preços de 14/10/2026; US$/1M tokens)**

| Modelo | Entrada | Saída | Cache hit | Camada |
|---|---|---|---|---|
| Claude Haiku 5.5 (≤100k) | 0,10 | 0,50 | 0,01 | Barata |
| gpt-5-nano | 0,05 | 0,40 | 0,005 | Barata |
| Gemini 3.5 Flash-Lite | 0,30 | 2,50 | — | Barata |
| Claude Sonnet 5.5 | 2 | 10 | 0,10 | Trabalho |
| gpt-6.1-sol | 2 | 10 | 0,10 | Trabalho |
| Gemini 4 Argon (até 30/11/2026) | 2 | 10 | 0,10 (implícito) | Trabalho |
| gpt-5.1 | 1,25 | 10 | 0,125 | Trabalho |
| Claude Opus 5.5 | 4 | 20 | 0,20 | Topo |
| gpt-6-astra | 10 | 50 | 1,00 | Topo |
| Claude Fable 5.1 | 10 | 50 | 0,25 | Topo (acesso limitado) |

Observações: Anthropic 4.7+ tem tokenizador ~30% mais verboso; Google dobra preços em janeiro de 2027; camada gratuita do Gemini usa conteúdo para melhorar produtos (inadequada a dados sensíveis).

**Orquestração e observabilidade**

| Opção | Papel | Licença | Veredito |
|---|---|---|---|
| Loop próprio | Núcleo | — | Adotar |
| MCP 2026-07-28 | Ferramentas e skills | Especificação aberta | Adotar |
| ACP v1 | Agentes de código externos | Especificação aberta | Adotar (cliente) |
| A2A 1.0.0 | Agente-a-agente | Apache-2.0 (Linux Foundation) | Registrar, não implementar |
| LangGraph | Engine opcional | MIT | Adaptador, não núcleo |
| LangChain | Integrações | MIT | Adaptador |
| Deep Agents | Referência de padrões | MIT | Referência |
| Managed Deep Agents | Serviço gerenciado | Conflito de licença (beta) | Fora do núcleo |
| Langfuse Cloud | Observabilidade | MIT (core) | Adotar (Hobby → Core) |
| LangSmith Cloud | Observabilidade alternativa | Proprietário | Comparação |
| OpenRouter / LiteLLM | Roteamento multi-provedor | — / MIT | Opcional, atrás de adaptador |

**Persistência**

| Opção | Papel | Veredito |
|---|---|---|
| SQLite WAL (≥ 3.51.3) | Estado canônico, eventos, FTS5 | Adotar |
| Arquivos Markdown/YAML versionados | Identidade, políticas, conhecimento | Adotar (fonte de verdade) |
| sqlite-vec | Índice vetorial local | Adotar (com ressalvas de maturidade) |
| Litestream | Backup contínuo | Adotar |
| PostgreSQL + pgvector | Vetores compartilhados no gateway | Só se o gateway exigir |
| Object storage (MinIO/S3) | Artefatos do gateway | Só no gateway |

**Execução**

| Nível | Quando | Controles |
|---|---|---|
| Processo restrito (padrão) | Ferramentas no workspace | Aprovação por classe, timeout, sem rede, sem elevação |
| WSL 2 (opcional) | Ferramenta que exige Linux | Mesmos controles + namespaces |
| Windows Sandbox (opt-in) | Plugin ou script de terceiro | Rede desligada, pasta somente leitura, instância única |
| Execução remota (opt-in) | Tarefa pesada | Aprovação, orçamento, aviso de privacidade |
| Docker no gateway (servidor) | Relay do Buzz, serviços | Fora da máquina local |

**Canais**

| Canal | Custo de mensagem | Endpoint público | Streaming | SDK oficial |
|---|---|---|---|---|
| Telegram | Grátis | Não (polling) | Sim (rascunho) | Não confirmado |
| Slack | Grátis (plano à parte) | Não (Socket Mode) | Por edição | Sim (Bolt JS/Python) |
| Discord | Grátis | Não (Gateway) | Por edição | Não confirmado |
| WhatsApp | Por mensagem de template | **Sim** | Não | Não (API HTTP) |
| E-mail | Grátis | Não (SMTP/IMAP) | Não | Protocolo padrão |
| Teams | Grátis (plano à parte) | Depende do SDK | Por edição | Sim (M365 Agents SDK) |
| Buzz | Grátis (relay próprio) | Sim (relay) | Por eventos | `buzz-cli` (JSON) |

**Linguagens e UI**

| Camada | Escolha | Motivo |
|---|---|---|
| Núcleo, UI, adaptadores | TypeScript/Node LTS | SDKs de provedores, MCP Tier 1, ACP, Bolt, M365 Agents |
| Desktop | Tauri 2 + React | Reuso da Web UI; Rust só no Core |
| Mobile | Cliente fino (Tauri mobile ou Flutter — pendente) | Regras das lojas; execução fica no host |
| Runners de plugin | Qualquer linguagem, processo separado, protocolo | Multi-tudo sem multiplicar toolchains |

## 7. Avaliação de projetos (seis critérios da seção 5)

| Projeto | Repositório e licença | Estado | Arquitetura e extensão | Forma recomendada | Fork? |
|---|---|---|---|---|---|
| **OpenCode** | `anomalyco/opencode` (antes `sst/opencode`); MIT, Copyright 2025 | Ativo; v1 e v2 em paralelo; documentação atualizada em 14/10/2026 | TS monorepo cliente-servidor; SDK TS; 75+ provedores (AI SDK/Models.dev); permissões `allow`/`ask`/`deny` com glob; agentes primários e subagentes; skills; MCP; plugins; ACP (`opencode acp`, stdio) | Agente plugável via ACP (preferencial) ou SDK; referência de modelo de permissões | Não |
| **Hermes Agent** | `NousResearch/hermes-agent`; MIT, Copyright 2025 | v0.21.7 | Instalação nativa Windows; SOUL.md/USER.md/MEMORY.md/AGENTS.md; `write_approval`; FTS5 em sessões; padrão agentskills.io; migração do OpenClaw | Referência de padrões (identidade, memória, aprovações); sem dependência | Não |
| **DeepSeek Harness** | `deepseek-ai/deepseek-harness`; SDK Python MIT 0.1.5rc1 (repo não lido) | Developer preview; APIs devem evoluir | "Tudo é plugin" (Cordis); perfis `web`/`headless`/`sdk`/`sdk-minimal`/`acp`; `dsh-base` com sandbox, aprovação, credenciais; requer endpoint DeepSeek; `sdk-minimal` fixa `danger-full-access`; log de sessão sobe para a DeepSeek por padrão | Estudo arquitetural obrigatório; agente plugável opcional via ACP, com telemetria desligada | Não |
| **OpenWiki** | `langchain-ai/openwiki`; MIT; npm 0.7.2 | Criado em jun/2026 | Wiki Markdown de repositório ou conhecimento pessoal, com Claims ligados a evidência (`arquivo#Lx-Ly`) e versão; construído sobre Deep Agents | Padrão de claims e ponteiros em AGENTS.md; uso opcional como gerador de wiki | Não |
| **Buzz** | `block/buzz`; Apache-2.0, Copyright 2026 Block, Inc. | ~35,9k estrelas; instalador Windows em alfa sem assinatura | Relay Nostr (NIP-01/42/34); Rust (crates); Postgres+Redis+MinIO; desktop Tauri+React; mobile Flutter; `buzz-cli` JSON; harness ACP (Goose, Codex, Claude Code); agentes como membros com chaves e auditoria | Canal a integrar (relay próprio + `buzz-cli`/ACP) e referência de produto | Não |

**Comparação das formas (pontuação 1-5, julgamento qualitativo)**

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| OpenCode via ACP | 5 | 4 | 4 | 4 | 4 | 5 | 4 |
| OpenCode via SDK | 4 | 4 | 5 | 3 | 3 | 5 | 3 |
| Padrões do Hermes adotados | 4 | 4 | 4 | 5 | 4 | 5 | 4 |
| dsh como referência | 5 | 3 | 5 | 4 | 4 | 5 | 5 |
| dsh como agente plugável | 3 | 2 | 4 | 2 | 2 | 4 | 3 |
| Buzz como canal (relay próprio) | 4 | 3 | 4 | 3 | 4 | 4 | 3 |
| Fork de qualquer um | 1-2 | 2-3 | 5 | 2 | 2-3 | 2 | 1 |

## 8. Modelo de dados (proposta inicial)

```
usuario — workspace(n) — projeto(n)
sessao(id, workspace_id, canal, estado, orcamento_sessao/dia/mes)
execucao(id, sessao_id, agente, modelo, camada, estado, inicio, fim)
passo(id, execucao_id, seq, tipo, latencia, tokens_in/out, custo)
chamada_ferramenta(id, passo_id, ferramenta, args_hash, resultado_ref, status)
aprovacao(id, chamada_id, classe, status, expira_em, canal, respondido_em)
evento(id, sessao_id, seq, tipo, payload, ts, ator, idempotencia_key)
orcamento(id, escopo, mes, teto, gasto)
artefato(id, caminho, hash, tamanho, sessao_id)
memoria(id, nivel, escopo, conteudo_ref, proveniencia, confianca, expira_em, versao)
auditoria(id, ts, ator, acao, alvo, antes_hash, depois_hash, aprovacao_id)
```

- **Máquina de estados da sessão:** `aberta → executando → aguardando_aprovacao → executando → pausada → concluida | falhou | cancelada`.
- **Memória:** unidade atômica é o *claim* com evidência; níveis com herança e precedência por tipo de chave (políticas com deny-overrides; identidade com base no agente; conhecimento pelo mais específico aprovado; preferências da pessoa como autoridade; notas do agente com confiança baixa e ativação só após aprovação). Conflitos ficam "contestados" e saem da recuperação automática até decisão humana.
- **Identidade:** arquivos versionados com front matter (id, versão, nível, dono, hash, escopo, revisão, expiração); carregados como snapshot no início da sessão; mudanças valem na sessão seguinte; edição do agente vira diff para aprovação.
- **Concorrência e retomada:** um escritor por banco; executor serializado por sessão; sessões concorrentes em paralelo; subagentes como execuções filhas; idempotência por chave; checkpoint em thread separada; reprojeção do estado a partir do log ao reiniciar; aprovações pendentes sobrevivem a restart.
- **Artefatos:** referência por caminho e hash; nada de binário no banco; Git para texto; object storage só no gateway.
- **Backup:** Litestream contínuo + exportação periódica; restore testado por spike.

## 9. Modelo de ameaças e controles prioritários

| Ameaça | Vetor | Controle principal | Controles de apoio |
|---|---|---|---|
| Injeção de prompt → ação não aprovada | Página, e-mail, mensagem de canal, memória, saída de ferramenta | Aprovação determinística por classe de ação (8 classes) | Varredura de escritas de memória; não reingerir saída do próprio agente; quarentena de fontes externas |
| Exfiltração por rede | Ferramenta com acesso à rede | Rede desligada por padrão; classe própria com aprovação | Allowlist de destinos; bloqueio de faixas privadas e de metadados |
| SSRF no gateway | URL controlada em webhook ou integração | Aceitar só host em allowlist; conectar no IP validado preservando Host/SNI; sem redirecionamentos | Deny-list de último recurso (127/8, 10/8, 172.16/12, 192.168/16, 169.254.169.254, fc00::/7, fe80::/10, multicast) |
| Vazamento de segredos | Log, trace, diff, memória | Cofre do SO (Credential Manager/Keychain/libsecret); segredo nunca em artefato | Auditoria por hash; tracing sem conteúdo; redação no processo antes do exporter |
| Envenenamento de memória (ASI06; AgentPoison >80% de sucesso; MINJA) | Conteúdo externo ingerido | Aprovação para escrita; proveniência e confiança por item | Expiração de memória não verificada; snapshots e rollback; testes adversariais |
| Plugin ou script hostil | Instalação de terceiro | Processo separado, permissões mínimas, hash fixado, instalação com aprovação | Sandbox descartável para casos de risco; sem rede |
| Cadeia de suprimentos | Dependência comprometida | Lockfile; CI hospedado; SBOM no release (SLSA L1/L2) | Atualização com revisão; assinatura de releases (Sigstore, a avaliar) |
| Conteúdo de terceiros em canais multiusuários | Salas do Buzz, canais de grupo | Só processar mensagens endereçadas ao agente | Tratar conteúdo de sala como não confiável |
| Custo descontrolado | Loop caro, buscas, modelo de topo | Orçamento fechado por camada; degradação em 80%; bloqueio em 100% | Limite diário de web search; batch para jobs |
| Privacidade e dados pessoais | Canais, provedores, memória | Uso pessoal (LGPD art. 4º, I — fora da lei; não é aconselhamento jurídico); exportar/corrigir/eliminar desde já | Retenção configurável; traces sem conteúdo; ciência da transferência internacional |

## 10. Orçamento e operação

**Modelo mensal (cálculos sobre preços de 14/10/2026; 1.000 interações de 30k tokens de contexto e 2k de saída)**

| Item | Valor | Base |
|---|---|---|
| API — camada de trabalho com cache (Sonnet 5.5, 80% cache hit) | ≈ US$ 34 | 24M×0,10 + 6M×2 + 2M×10 |
| API — camada barata (tarefas mecânicas) | ≈ US$ 4 | Haiku 5.5 |
| Web search (200 buscas) | US$ 2 | US$ 10/1.000 |
| VPS do gateway | US$ 4 a 6 (**não confirmado**) | Estimativa de mercado |
| Langfuse Hobby | US$ 0 | Página de preços |
| Backup (Litestream → objeto storage) | < US$ 1 | Estimativa |
| **Total** | **≈ US$ 45 a 47** | Cabe em US$ 50, margem curta |
| Fora do mensal: Apple US$ 99/ano; Google Play US$ 25 uma vez | | Nota 09 |

**Vetores de estouro:** modelo de topo sem controle (Opus 5.5 ≈ US$ 160/mês no mesmo cenário); web search em volume (1.000 buscas = US$ 10); Grounding do Google (US$ 14/1.000 após 5.000 grátis); container sessions da OpenAI; Serverless do LangSmith 24×7 (≈ US$ 62/mês).

**Regras de operação:** orçamento fechado por camada com degradação automática; cache obrigatório no prefixo estático; métricas desde o primeiro dia (sucesso da tarefa, intervenções humanas, custo e latência por sessão, erro e recuperação de ferramenta); configuração e migrações versionadas; distribuição por instaladores primeiro; i18n pt-BR/en; Web UI com alvo WCAG AA.

## 11. Roadmap incremental (sequência de entrega do escopo completo)

Cada marco entrega capacidade que funciona de forma demonstrável; nenhum marco é uma versão superficial do produto.

| Marco | Conteúdo | O que será demonstrado | Métricas | Decisões adiadas |
|---|---|---|---|---|
| M0 Fundações | Repositório, núcleo TS, loop mínimo com 1 provedor, CLI, SQLite + eventos, aprovações, orçamento | Sessão completa com aprovação e custo registrados | Custo por sessão; latência p50/p95; zero ação sem aprovação | Provedores 2 e 3 |
| M1 Multi-provedor | 3 provedores, 3 camadas, cache, contagem de tokens, roteador | Mesma tarefa nos 3 provedores com comparação | Paridade de recursos; custo por camada | OpenRouter/LiteLLM |
| M2 Ferramentas e workspace | 8 classes de aprovação, worktree por sessão, diff/rollback, servidor MCP próprio | Alteração de código aprovada e revertida | Taxa de aprovação/rejeição; tempo até aprovação | Sandbox descartável |
| M3 Memória e identidade | 5 níveis, FTS5+sqlite-vec, claims, arquivos versionados, anti-envenenamento | Memória escrita só com aprovação; consulta com citação | Precisão de recuperação; cobertura de proveniência | Vetor compartilhado no gateway |
| M4 Protocolos e extensibilidade | Cliente MCP, ACP (OpenCode), skills, plugins e scripts em processo separado | Agente externo executando com permissão do núcleo | Isolamento efetivo; falhas contidas | A2A |
| M5 Canais | Telegram, CLI, Slack (Socket Mode), Discord (Gateway), e-mail | Tarefa iniciada e concluída por mensagem | Entrega de eventos; duplicatas tratadas | WhatsApp; Buzz |
| M6 Gateway e Buzz | VPS, webhook WhatsApp, relay do Buzz, `buzz-cli`/ACP | Sessão operada pelo WhatsApp e por sala do Buzz | Custo de canal; disponibilidade | Política de AI Providers |
| M7 Observabilidade e avaliação | OTel GenAI, Langfuse, métricas, evals offline/online, adversariais | Regressão bloqueando mudança ruim | Queda de qualidade; custo de avaliação | Self-hosting |
| M8 Superfícies e distribuição | Web UI, desktop Tauri, mobile cliente fino, instaladores | Uso nos 6 alvos | Memória medida em 4 GB | Lojas |
| M9 Endurecimento | Backup/Litestream, restore testado, SBOM, revisão de segurança | Recuperação de desastre | RTO/RPO medidos | Assinatura Windows |

## 12. Spikes recomendados (maior risco primeiro)

1. **ACP com OpenCode** (notas 01/11): harness como cliente, `session/request_permission` ligado às aprovações; medir em Windows nativo e via WSL. Resolve: integração de agente externo e consumo de memória em 4 GB.
2. **Custo com cache** (nota 02): 1.000 interações reais com prefixo estável; medir cache hit efetivo e custo por camada. Resolve: a viabilidade do orçamento.
3. **Retomada de sessão** (nota 06): matar o processo no meio de uma execução e reprojetar o estado a partir do log. Resolve: confiabilidade do modelo de estado.
4. **Memória com aprovação** (notas 07/08): escrita de memória exigindo aprovação sem travar a aprendizagem; medir adesão. Resolve: a política por tipo de memória.
5. **Sandbox em 4 GB** (nota 04): RAM de WSL 2 e do Windows Sandbox no hardware real; viabilidade de script de terceiro. Resolve: a camada de execução.
6. **Buzz ponta a ponta** (nota 12): relay do Buzz em Docker no VPS; agente de teste via `buzz-cli`. Resolve: a integração de canal mais complexa.
7. **Telemetria e privacidade** (notas 03/08): trace sem conteúdo chegar ao Langfuse; validar redação. Resolve: observabilidade sem vazamento.
8. **dsh como plugável** (nota 12): rodar com telemetria desligada e workspace descartável; avaliar estabilidade de previa. Resolve: usar ou descartar o DeepSeek Harness.

## 13. Riscos e questões abertas

- **Preços com expiração:** promoções do Gemini (dobra em jan/2027) e do gpt-6.1-sol (até 21/11/2026); reavaliar o orçamento em janeiro de 2027.
- **WhatsApp:** política de "AI Providers" (vigente desde 16/02/2026) e tabelas de preço do Brasil não lidas.
- **Limites de taxa** de OpenAI e Anthropic não confirmados; preço do VPS e Always Free da Oracle não confirmados.
- **APIs em previa:** DeepSeek Harness (developer preview) e sqlite-vec (work-in-progress) podem mudar.
- **Decisões do usuário pendentes:** assinatura do Windows; mobile (Tauri mobile ou Flutter); papel de "membros do projeto" em um produto individual; confirmação de que pesquisa na web exige aprovação.
- **Lacunas de pesquisa:** canais do Hermes; licença do repositório do dsh; API do `buzz-cli`; retenção de dados dos provedores; RAM medida de WSL 2 e do Sandbox; limites de taxa de Telegram e Discord; GDPR (não lido).
- **Risco de privacidade:** telemetria de sessão do dsh para a DeepSeek por padrão; camada gratuita do Gemini usa conteúdo para melhorar produtos.

## 14. Fontes (rastreáveis)

Documentação oficial, repositórios e preços, acessados em 13-14/10/2026 (lista completa por frente nas notas 01 a 12):

- OpenAI — API Pricing: https://platform.openai.com/docs/pricing (14/10/2026)
- Anthropic — Pricing: https://platform.claude.com/docs/en/about-claude/pricing (14/10/2026)
- Google — Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing (14/10/2026); Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits (14/10/2026)
- OpenRouter — FAQ: https://openrouter.ai/docs/faq (14/10/2026)
- LiteLLM — Providers: https://docs.litellm.ai/docs/providers (14/10/2026)
- Ollama — Windows: https://docs.ollama.com/windows (14/10/2026); biblioteca: https://ollama.com/library (14/10/2026)
- MCP — Specification 2026-07-28: https://modelcontextprotocol.io/specification/latest (14/10/2026)
- ACP — Overview v1: https://agentclientprotocol.com/protocol/v1/overview (14/10/2026)
- A2A — Página inicial: https://a2a-protocol.org/latest/ (14/10/2026)
- OpenCode — docs: https://opencode.ai/docs/ (14/10/2026); SDK: https://opencode.ai/docs/sdk/ (14/10/2026); ACP: https://opencode.ai/docs/acp/ (14/10/2026); LICENSE: https://raw.githubusercontent.com/anomalyco/opencode/dev/LICENSE (14/10/2026)
- Claude Agent SDK — overview: https://code.claude.com/docs/en/agent-sdk/overview (14/10/2026)
- LangChain — pricing: https://www.langchain.com/pricing; self-hosted e FAQ (via nota 03, 13/10/2026)
- Langfuse — pricing: https://langfuse.com/pricing; self-hosting (via nota 03, 13/10/2026)
- OpenTelemetry — convenções GenAI: https://github.com/open-telemetry/semantic-conventions-genai (via nota 03, 13/10/2026)
- Hermes Agent — repositório e docs: https://github.com/NousResearch/hermes-agent; https://hermes-agent.nousresearch.com/docs/ (via nota 07, 13/10/2026)
- OpenWiki — https://github.com/langchain-ai/openwiki; docs: https://docs.langchain.com/oss/openwiki (via nota 07, 13/10/2026)
- DeepSeek Harness — https://github.com/deepseek-ai/deepseek-harness; https://deepseek.com/harness/en/; PyPI: https://pypi.org/project/deepseek-harness-sdk (14/10/2026)
- Buzz — https://github.com/block/buzz; LICENSE: https://raw.githubusercontent.com/block/buzz/main/LICENSE (14/10/2026)
- Docker — Install on Windows: https://docs.docker.com/desktop/setup/install/windows-install/ (14/10/2026)
- Microsoft — Windows Sandbox: https://learn.microsoft.com/en-us/windows/security/application-isolation/windows-sandbox/windows-sandbox-overview (14/10/2026); WSL: https://learn.microsoft.com/en-us/windows/wsl/about (14/10/2026); Credential Manager: https://learn.microsoft.com/en-us/windows/win32/secauthn/credential-manager (14/10/2026)
- OWASP — LLM Top 10 2025: https://genai.owasp.org/llm-top-10/; Agentic Top 10 2026 (ASI06): https://genai.owasp.org/download/52117; SSRF Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html (14/10/2026)
- Meta — WhatsApp Business Platform pricing: https://developers.facebook.com/docs/whatsapp/pricing/ (14/10/2026)
- Slack — Events API: https://docs.slack.dev/apis/events-api/ (14/10/2026)
- Telegram — Bot Features: https://core.telegram.org/bots/features (14/10/2026)
- Discord — Interactions: https://docs.discord.com/developers/interactions/receiving-and-responding (14/10/2026)
- SQLite — WAL: https://sqlite.org/wal.html (14/10/2026); Litestream: https://litestream.io/ (14/10/2026)
- Apple — Developer Program e App Review Guidelines: https://developer.apple.com/programs/; https://developer.apple.com/app-store/review/guidelines/ (via nota 09, 13/10/2026)
- Google Play — taxa e requisitos de teste: https://support.google.com/googleplay/android-developer/ (via nota 09, 13/10/2026)
- LGPD — Lei 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (14/10/2026)
- SLSA v1.0 — Security levels: https://slsa.dev/spec/v1.0/levels (14/10/2026)
- Hetzner Cloud: https://www.hetzner.com/cloud/ (14/10/2026; valores não renderizados — não confirmado)

## Apêndice — mapa das notas

| Nota | Conteúdo |
|---|---|
| 01_runtime_protocolos | Loop próprio; MCP, ACP, A2A; OpenCode, Claude Agent SDK, LangGraph |
| 02_provedores_sdks | Preços, limites, roteamento, runtimes locais, custo por camada |
| 03_langchain_observabilidade | LangChain, LangGraph, DeepAgents, LangSmith, Langfuse, OTel GenAI |
| 04_workspaces_containers | Docker (8 GB), Windows Sandbox, WSL 2, execução remota, quatro níveis |
| 05_gateway_canais | WhatsApp, Telegram, Slack, Discord, e-mail, Teams; endpoint público; aprovação no núcleo |
| 06_sessoes_persistencia | Modelo de dados, WAL, eventos, idempotência, retomada, Litestream |
| 07_memoria_identidade_openwiki | Cinco níveis, claims, embeddings locais, Hermes, OpenWiki, envenenamento |
| 08_seguranca_governanca | Ameaças, SSRF, segredos, LGPD, SLSA, controles priorizados |
| 09_linguagens_composicao | TypeScript, Tauri, Flutter, lojas, assinatura, contratos, composição híbrida |
| 10_operacao_custos_plataformas | Orçamento de US$ 50/mês, métricas, distribuição |
| 11_projetos_opencode_hermes | Licenças, arquitetura, integração, veredito sem fork |
| 12_projetos_deepseek_buzz | DeepSeek Harness (tudo-é-plugin) e Buzz (canal e referência) |
