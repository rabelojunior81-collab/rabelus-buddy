# 12 — Avaliação de projetos: DeepSeek Harness e Buzz

**Data de referência:** 14/10/2026. Aplicação dos seis critérios da seção 5 do briefing. O Buzz é canal a integrar e referência de produto (decisão do usuário, seção 9.3).

## Resumo

- **DeepSeek Harness existe**: `deepseek-ai/deepseek-harness` (`dsh`), harness de agentes open source da DeepSeek AI, em **developer preview com código-fonte incluído**. Arquitetura "tudo é plugin" sobre o framework Cordis; perfis (`web`, `headless`, `sdk`, `sdk-minimal`, `acp`); camada base `dsh-base` com adaptadores de modelo, ferramentas, persistência, sandbox e política de aprovação, settings, credenciais e telemetria; SDK Python (MIT, 0.1.5rc1) que lança o `dsh` por JSON-RPC em stdio; requer endpoint compatível com DeepSeek (modelo padrão `deepseek-v4-flash`) [1][2][3][4].
- **Pontos de atenção do dsh:** o perfil `sdk-minimal` fixa `danger-full-access` — o shell persistente pode modificar qualquer caminho visível ao runtime (a documentação recomenda checkout descartável ou contêiner); o contributor de log de sessão **envia eventos de log não aceitos junto com as requisições à DeepSeek por padrão** (até 8 MiB por requisição, desligável por patch); APIs de previa devem evoluir [3][4].
- **Buzz** (`block/buzz`): workspace auto-hospedável onde pessoas e agentes dividem salas; relay Nostr (NIP-01, NIP-42, NIP-34); licença **Apache-2.0** confirmada no LICENSE ("Copyright 2026 Block, Inc."); workspace Rust (crates), Postgres, Redis, S3/MinIO; desktop Tauri + React; mobile Flutter; `buzz-cli` (JSON in/JSON out, feito para chamadas de ferramenta de LLM); harness ACP integrado (Goose, Codex, Claude Code); agentes são membros com chaves próprias e trilha de auditoria; workflows YAML; eventos de git; instalador do Windows sem assinatura em alfa [5][6][7].
- **Veredito dsh:** referência arquitetural de alto valor (perfis, patches, plugins, arestas de substituição) e candidato a runtime plugável; **não** como núcleo nem como fork. Riscos: previa, provedor único por padrão, shell full-access no perfil mínimo, telemetria para a DeepSeek por padrão.
- **Veredito Buzz:** integração via relay próprio + `buzz-cli` ou ACP; auto-hospedar o relay no gateway (Postgres, Redis e MinIO não cabem nos 4 GB locais). ComoReferência: agentes como membros, auditoria por eventos, workflows declarativos. Dependência do protocolo Nostr é o principal custo de manutenção.

## Fatos verificados

### 1. DeepSeek Harness [1][2][3][4]

- Repositório oficial: `github.com/deepseek-ai/deepseek-harness`; página oficial: deepseek.com/harness/en; documentação: deepseek-harness.github.io/deepseek-harness.
- Posicionamento: "open-source agent harness developed by DeepSeek AI", "everything is a plugin", powered by Cordis ("A Programming Paradigm for Spatiotemporal Composability").
- Estado: **developer preview**; "core plugins and APIs will continue to evolve".
- Instalação: clone + pnpm (Node/TypeScript); `pnpm dsh web`; Python SDK por `pip install deepseek-harness-sdk` (versão 0.1.5rc1, licença **MIT**, Python ≥ 3.10; instala `deepseek-harness-runtime-bin` da mesma versão).
- Arquitetura: plugins contribuem serviços, eventos tipados e efeitos reversíveis a um contexto compartilhado; tudo é plugin — adaptador de modelo, registro de ferramentas, log de sessão e o loop do agente.
- Perfis: `web`, `headless`, `sdk`, `sdk-minimal`, `acp`; `dsh-base` é a camada comum (adaptadores, ferramentas, persistência, sandbox e política de aprovação, settings, credenciais, telemetria); `dsh-acp-app` é o servidor ACP de automação.
- Pacotes observáveis no repositório: core (session, system-prompt, tools, agent, agent-loop, scope), llm, shell, subprocess, ssh, terminal, sandbox, fs, lsp, skill, web, computer-use, browser-use, compaction, subagent, jobs, bundle, workflow, todo, plan, goal, schedule, guard, extensions, session, session-query, attachment, spill, storage, workspace, feedback, identity, settings, credentials, **acp**, interaction, boot, **sdk**, host, client, **mcp**, experimental, test-support.
- Python SDK: lança `dsh --profile sdk` com home explícito (`DSH_HOME` obrigatório; nunca descobre `~/.dsh`); JSON-RPC newline-delimited em stdio; `provider`/`model`/`reasoning_effort`/`max_tokens` na inicialização; sessões em JSONL em `<dsh_home>/sessions`.
- Perfil `sdk-minimal`: apenas shell persistente (`bash` em Linux/macOS, `pwsh` no Windows), execução local e sessões JSONL; **sem** arquivos de sistema, settings, credenciais gerenciadas, telemetria OTel, web, subagentes, compactação; fixa `danger-full-access` (shell pode modificar qualquer caminho visível); timeout de shell de 300 s.
- Privacidade: o contributor de log de sessão faz upload de eventos de log não aceitos com as requisições à DeepSeek por padrão (até 8 MiB por requisição); desligável com `session-log-deepseek.enabled: false` em patch de perfil.
- Requisitos do SDK Python: Git; Linux x64/arm64, macOS 14+ (arm64) ou Windows x64; endpoint e credencial compatíveis com DeepSeek; workspace isolado e home isolado.

### 2. Buzz [5][6][7]

- LICENSE: Apache License 2.0, "Copyright 2026 Block, Inc." (arquivo LICENSE do repositório).
- Produto: "workspace where humans and agents build together, on a relay you own"; relay Nostr; comunidade por URL; cliente é autoridade para o workspace; estado observável por tenant é community-local.
-栈: workspace Rust (crates); relay com NIP-01, autenticação NIP-42, REST de canais/DM/mídia/workflow/git e log de auditoria; Postgres (eventos + FTS), Redis (pub/sub), S3/MinIO (Blossom); desktop Tauri + React; mobile Flutter (iOS e Android, em construção); `buzz-cli` JSON in/JSON out "designed for LLM tool calls"; harness ACP (Goose, Codex, Claude Code).
- Agentes: membros com chaves próprias, memberships de canal e trilha de auditoria; escopo por identidade, não por flags de permissão; mesma superfície de ações que um humano (abrir repositórios, enviar patches, revisar código, rodar workflows, editar canvases, orquestrar agentes, voice huddles, criar canais).
- Status: relay, canais, threads, DMs, canvases, mídia, busca e log de auditoria funcionam hoje; mobile em construção; workflows YAML com gatilhos de mensagem, reação, agendamento e webhook; eventos de git NIP-34 e backend de hospedagem git; instalador do Windows **não assinado** (alfa), com aviso do SmartScreen; deploy em Railway com um clique; quick start com Docker e Hermit (ou Rust 1.88+, Node 24+, pnpm 10+, just).
- Governança de agentes: chave Nostr, relay, REST/WebSocket, formato de eventos; AGENTS.md, ARCHITECTURE.md, VISION_*.md, GOVERNANCE.md, NOSTR.md no repositório.

## Interpretações

- **I1. dsh é o parente mais próximo do produto desejado.** "Tudo é plugin", perfis compostos por patches, arestas de substituição para modelo, ferramentas, sessão, sandbox, credenciais e telemetria: é a materialização do requisito multi-tudo. Estudar a arquitetura é obrigatório; adotar como runtime é opcional.
- **I2. Riscos de previa e de privacidade.** Developer preview com APIs instáveis; perfil mínimo com shell full-access; telemetria de sessão para a DeepSeek por padrão. Nenhum dos três é aceitável no núcleo sem patch explícito e teste. Se usado, seria como agente plugável via ACP, em workspace descartável, com telemetria desligada.
- **I3. Provedor único por padrão.** O dsh registra `deepseek-official` e espera endpoint compatível; adaptadores de outros provedores são possíveis via composição (llm-pi-ai), mas não é o caminho padrão. Para o harness agnóstico, isso é work extra.
- **I4. Buzz como canal.** A integração natural é: relay próprio (docker compose no gateway), identidade de agente por chave Nostr, mensagens via `buzz-cli` (JSON) ou via harness ACP. O relay não cabe nos 4 GB locais — fica no servidor, coerente com a arquitetura híbrida.
- **I5. Buzz como referência.** Três lições diretas: agentes como membros com identidade e auditoria próprias (em vez de bots com tokens gigantes), evento assinado como log único (auditoria e busca em um só lugar) e workflows declarativos em YAML com gatilhos de mensagem, reação, agendamento e webhook — último item dialeta com o protocolo de eventos da nota 05.
- **I6. Custo de manutenção do Nostr.** Integrar com o Buzz assume o protocolo Nostr (chaves, relays, NIPs). É dependência de protocolo externo com ecossistema próprio; o harness deve isolar isso em um adaptador de canal, como faria com Slack ou Telegram.
- **I7. Multiusuário nas salas.** O harness é individual, mas as salas do Buzz são multiusuário: outras pessoas e outros agentes leem e escrevem. Regra obrigatória: só processar mensagens endereçadas ao agente (nota 05) e tratar conteúdo de sala como não confiável (notas 07 e 08).
- **I8. Licenças compatíveis.** Apache-2.0 (Buzz) e MIT (dsh SDK) são compatíveis com distribuição; atribuição e aviso de alterações são as obrigações práticas. Nada de AGPL no caminho crítico (nota 07).

## Hipóteses e pontos não confirmados

- H1. Licença do repositório do dsh: o PyPI declara MIT para o SDK; o LICENSE do repositório não foi lido.
- H2. Maturidade do `dsh acp` (servidor ACP de automação): documentado, não testado.
- H3. API exata do `buzz-cli` e do harness ACP do Buzz: escopo apenas pela documentação de superfície; leitura detalhada pendente.
- H4. Consumo de recursos do relay do Buzz (Postgres + Redis + MinIO + relay): não medido; estimativa é de servidor, não de máquina local.
- H5. Estabilidade dos NIPs usados (NIP-01, NIP-42, NIP-34): não avaliada.
- H6. Se o Buzz tem SDK oficial em TypeScript: `buzz-cli` é a via documentada; SDK de canal não confirmado.

## Lacunas e conflitos

- dsh: "developer preview" sem roadmap público de GA; conflito entre o que o perfil mínimo afirma (sem telemetria) e o upload de log de sessão para a DeepSeek por padrão — ler com atenção.
- Buzz: colunas de status do README (works today / being wired up) não foram todas confirmadas item a item; instalador do Windows em alfa e sem assinatura.

## Recomendação preliminar

### Decisões por projeto

| Projeto | Papel | Forma | Fork? |
|---|---|---|---|
| DeepSeek Harness | Referência arquitetural; candidato a agente plugável | Estudo da arquitetura; integração via ACP, se usada | Não |
| Buzz | Canal a integrar e referência de produto | Relay próprio + `buzz-cli`/ACP atrás de adaptador de canal | Não |

### Comparação das formas (seis critérios, 1-5)

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| Estudar dsh como referência | 5 | 3 | 5 | 4 | 4 | 5 | 5 |
| dsh como agente plugável via ACP | 3 | 2 | 4 | 2 | 2 | 4 | 3 |
| dsh como núcleo | 2 | 2 | 5 | 2 | 2 | 4 | 2 |
| dsh como fork | 1 | 2 | 5 | 2 | 2 | 2 | 1 |
| Buzz como canal (relay próprio) | 4 | 3 | 4 | 3 | 4 | 4 | 3 |
| Buzz como cliente de relay de terceiro | 3 | 3 | 3 | 3 | 2 | 5 | 4 |
| Buzz como fork | 1 | 3 | 3 | 2 | 3 | 3 | 1 |

Justificativas curtas: estudar custa pouco e rende arquitetura; plugar dsh herda previa e telemetria; Buzz como canal exige operar relay, o que combina com o gateway em servidor; fork de qualquer um dos dois não tem justificativa.

### Próximos passos (não executados)

1. Ler LICENSE do dsh e a página de canais/skills do Buzz; mapear API do `buzz-cli`.
2. Spike: subir relay do Buzz em Docker no VPS e conectar um agente de teste via `buzz-cli`.
3. Ler `docs/architecture.md` do dsh e extrair o modelo de perfis e patches.
4. Decidir o adaptador Nostr: biblioteca, CLI ou protocolo direto.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | deepseek-ai/deepseek-harness (README) | DeepSeek AI | https://github.com/deepseek-ai/deepseek-harness | 14/10/2026 |
| 2 | DeepSeek Harness developer preview | DeepSeek | https://deepseek.com/harness/en/ | 14/10/2026 |
| 3 | Architecture | DeepSeek AI (GitHub) | https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md | 14/10/2026 |
| 4 | deepseek-harness-sdk (PyPI) | DeepSeek | https://pypi.org/project/deepseek-harness-sdk | 14/10/2026 |
| 5 | LICENSE (Apache-2.0) | Block, Inc. (GitHub raw) | https://raw.githubusercontent.com/block/buzz/main/LICENSE | 14/10/2026 |
| 6 | README do Buzz | Block | https://github.com/block/buzz | 14/10/2026 |
| 7 | Python SDK do dsh (guia) | DeepSeek AI | https://deepseek-harness.github.io/deepseek-harness/en/guide/python-sdk.md | 14/10/2026 |
