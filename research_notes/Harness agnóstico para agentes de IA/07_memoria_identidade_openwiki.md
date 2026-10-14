# Memória, identidade e OpenWiki

Data de referência: 13/10/2026. Fontes acessadas em 13/10/2026, salvo indicação. Números entre colchetes ([n]) remetem à seção Fontes. Pontuações são julgamentos qualitativos do autor, não medições.

Limitações do método: a API do GitHub retornou HTTP 403 para metadados. Usei arquivos brutos do GitHub (raw.githubusercontent.com), redirecionamentos de releases e registros do npm e do PyPI. Não li o código-fonte do Hermes Agent; os detalhes de montagem do prompt vêm de documentação oficial e de espelhos de terceiros, marcados como secundários.

## Resumo

- **OpenWiki existe e é projeto oficial da LangChain.** É o repositório `langchain-ai/openwiki` (MIT), publicado no npm como `openwiki` (versão 0.7.2, em 09/10/2026) e documentado em docs.langchain.com [1][6][7][8][9]. Gera e mantém uma wiki Markdown de um repositório (modo `code`) ou de conhecimento pessoal (modo `personal`), com Claims ligados a evidências [3][7]. Não é memória de agente nem base vetorial. Há dois projetos homônimos que não aparecem como projetos da LangChain: `vercel-labs/openwiki` (licença não confirmada) e `pacifio/open-wiki` [10][11].
- **Tipos de memória.** Os cinco tipos pedem tecnologias diferentes. Para o perfil local (Windows, 4 GB de RAM, CPU, sem GPU), a base mais simples é SQLite com FTS5 e sqlite-vec, com Markdown versionado como fonte de verdade para identidade e fatos. pgvector só se justifica no gateway híbrido [25][26][28][29].
- **Ameaça real.** O OWASP incluiu "Memory & Context Poisoning" como ASI06 no Top 10 para aplicações agênticas 2026 [38]. No AgentPoison, a taxa média de sucesso foi "higher than 80%" com poison rate abaixo de 0,1% (resultado de artigo, não de produto) [40]. A governança de memória precisa ser projetada desde o início.
- **Identidade do Hermes.** Nas fontes consultadas, o termo "corpus de identidade" não aparece. O mecanismo documentado é um conjunto de arquivos Markdown carregados no início da sessão: SOUL.md (identidade), USER.md e MEMORY.md (memória) e AGENTS.md (projeto) [15][16][17].
- **Sistemas de memória.** A maioria (Mem0, Letta, Zep, Graphiti, Cognee, MemOS, LangMem) é Apache-2.0 ou MIT, mas os READMEs quase não descrevem RBAC, auditoria ou retenção. Zep Community Edition foi descontinuada [50]. Graphiti exige banco de grafos [52]. Honcho e Basic Memory são AGPL-3.0 [59][61].
- **Recomendação preliminar.** Núcleo próprio: SQLite + Markdown versionado + log de auditoria + políticas por escopo. Sistemas externos entram apenas como adaptadores opcionais.

## Fatos verificados

### OpenWiki (LangChain)

- O repositório `langchain-ai/openwiki` tem licença MIT [7][8]. O repositório aparece criado em 22/06/2026 em snapshot de busca [7].
- A documentação oficial fica em docs.langchain.com/oss/openwiki. O lançamento foi publicado no blog da LangChain em 01/07/2026 [1][6].
- Pacote npm `openwiki`: versão latest 0.7.2, publicada em 09/10/2026; 30 versões; licença MIT; pacote criado em 26/06/2026 [9]. Requer Node.js 22.22.0 ou superior [7].
- Construído sobre Deep Agents, framework da LangChain (repositório `deepagentsjs`). Traces para o LangSmith são opcionais, ativados por chave de API [6][7][2].
- Modo `code` escreve em `openwiki/` dentro do repositório. Modo `personal` documenta fontes conectadas e escreve em `~/.openwiki/wiki` [3][70].
- Arquivos gerados: `openwiki/INSTRUCTIONS.md` (brief do usuário, preservado nas regenerações), `openwiki/.claims/`, `openwiki/.page-manifest.json` e `openwiki/.run.json` (retomada de execuções interrompidas). `AGENTS.md` e `CLAUDE.md` recebem um bloco que aponta para a wiki [2][3][5].
- Cada Claim aponta para evidência exata, por exemplo `repo://src/server.ts#L40-L82`, com a versão de evidência observada. Claims são revistos quando a evidência muda [3][7].
- Fatos vindos de conectores, inclusive LangSmith, não viram Claims [3].
- `--init` regenera a wiki e os Claims, mas preserva `INSTRUCTIONS.md`. Se a falha ocorrer antes de o novo estado ficar durável, a wiki anterior é restaurada [2][3].
- Configuração e segredos ficam em `~/.openwiki/.env` [2].
- Provedores de modelo: a tabela de providers lista 13 [4]. O README diz "thirteen" em um snapshot e "fourteen" em outro [7].
- Nove conectores: Custom MCP, Notion, Slack, Gmail, X, Web Search, Hacker News, LangSmith e repositórios git locais [7].
- Integrações com Codex, Claude Code, OpenCode, Cursor e outros usam o modelo do próprio agente e não exigem credenciais do OpenWiki. Nessas integrações, o contexto de conectores (inclusive LangSmith) ainda não é suportado [7].
- Automação: um GitHub Action pode rodar agendado (por exemplo, diariamente) e atualizar a wiki a partir de diffs do git [6].
- O padrão de provedor no lançamento é OpenRouter com modelo aberto [6]. `--telemetry-file` grava a telemetria de uma execução em JSON local [5].
- Homônimos: `vercel-labs/openwiki` é uma aplicação Next.js com agente "eve", criada em 28/06/2026 (snapshot); o arquivo LICENSE retornou 404 em main e master [10]. `pacifio/open-wiki` tem licença MIT (snapshot), criado em 08/03/2026, e se descreve como alternativa ao "Code Wiki" do Google [11].

### LangMem (LangChain)

- Licença MIT (copyright LangChain, 2025) [22][23].
- Pacote PyPI `langmem` versão 0.0.30, último upload em 27/10/2025; requer Python 3.10 ou superior [24].
- Oferece API de memória que funciona com qualquer storage, ferramentas de memória usadas durante a conversa e um gerenciador em segundo plano que extrai e consolida memórias. Integra-se ao Long-term Memory Store do LangGraph. Usa InMemoryStore para testes e AsyncPostgresStore para produção [22].
- O README não descreve RBAC, auditoria nem retenção [22].

### Hermes Agent (Nous Research)

- Repositório `NousResearch/hermes-agent`, licença MIT (copyright 2025), release mais recente v0.21.7 [12][13][14].
- Suporta instalação nativa no Windows, sem WSL, em `%LOCALAPPDATA%\hermes` [12].
- Busca FTS5 em sessões passadas, com sumarização por LLM. Integração opcional com Honcho para modelagem dialética do usuário. Ciclo de aprendizado com criação autônoma de skills [12].
- SOUL.md fica em `~/.hermes/SOUL.md` ou `$HERMES_HOME/SOUL.md`, nunca no diretório de trabalho. É semeado automaticamente se não existir e nunca é sobrescrito [15][18].
- SOUL.md entra no prompt como "slot #1", sem texto envoltório, após varredura contra padrões de prompt injection e truncamento. Se estiver ausente ou vazio, usa a identidade padrão embutida [16][18].
- MEMORY.md e USER.md ficam em `~/.hermes/memories/`. O agente os escreve pela ferramenta `memory`; é possível exigir aprovação com `write_approval` [15].
- A memória entra no prompt como snapshot congelado no início da sessão, para preservar o prefix cache. Gravações feitas durante a sessão só aparecem na sessão seguinte [15].
- Contexto de projeto: só um tipo é carregado por sessão, o primeiro encontrado na ordem `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`. SOUL.md é carregado à parte [17].
- Escrita do agente em SOUL.md por ferramentas de arquivo exige aprovação. Acerto do scanner em SOUL.md gera aviso sem bloquear; em AGENTS.md, bloqueia [16][17].
- Subagentes com `skip_context_files` não carregam SOUL.md e usam a identidade padrão [18][19].
- `/personality` é um overlay de sessão. Personalidades próprias ficam em `agent.personalities` no `config.yaml`. `agent.system_prompt` é reservado para prompt manual [18].
- Segundo o texto oficial, `hermes profile install` e `hermes profile update` copiam SOUL.md de terceiros sem varredura nem confirmação, com ressalva ambígua (ver Lacunas) [17].
- A migração do OpenClaw importa SOUL.md, MEMORY.md, USER.md e skills [12].
- O repositório contém `hermes_state_fts.py`, `hermes_state_identity.py` e `native/fts5_cjk`. Não li o conteúdo desses arquivos [12].

### Sistemas de memória para agentes (estado em 13/10/2026)

| Sistema | Licença | Versão observada | Self-hosting | Governança e remoção (o que o README declara) |
|---|---|---|---|---|
| Mem0 | Apache-2.0 [45] | PyPI mem0ai 2.2.1, 25/09/2026 [46]; release GitHub ts-v3.3.1 (SDK TypeScript) [66] | Biblioteca, servidor self-hosted com `docker compose up` ou nuvem [44] | Extração "ADD-only" em uma chamada de LLM, sem UPDATE/DELETE nessa etapa [44]. RBAC e auditoria não aparecem no README [44] |
| Letta | Apache-2.0 [48] | Release 0.16.8 [65]; PyPI letta 0.34.12, 12/10/2026, descrito como "Letta Code" [49] | `letta server` para agentes locais ou self-hosted; app desktop para macOS, Windows e Linux [47] | Nada sobre governança no README [47] |
| Zep (Community Edition) | Apache-2.0 [51] | Edição descontinuada; código movido para `legacy/` ("no longer supported") [50] | n/a | Descontinuada; o README aponta "a new direction" para o open source [50] |
| Graphiti | Apache-2.0 [53] | graphiti-core 0.30.2, 08/09/2026 [54] | Requer Neo4j 5.26, FalkorDB 1.1.2 ou Amazon Neptune; Kuzu 0.11.2 está deprecated [52] | Não descrita no README [52] |
| Cognee | Apache-2.0 [56] | 1.6.4 (PyPI, 13/10/2026) [57] | Docker Compose; "Runs locally for free — no API key required" [55] | Operação `forget` para remover item ou dataset [55]; "your application can inspect the retrieved evidence" [55] |
| Basic Memory | AGPL-3.0 [59] | v0.23.2 [67] | "Local-first"; arquivos Markdown e índice SQLite local, "No servers required" [58] | Exportação para Markdown a qualquer momento [58]. Busca híbrida FTS + vetor com FastEmbed, em SQLite ou Postgres; reranking opcional [58]. Plano de nuvem a US$ 15/mês no README (menção a beta) [58] |
| Honcho | AGPL-3.0 [61] | v3.2.2 [68] | `honcho start` (stack local) ou servidor FastAPI próprio; seção de integração com Hermes [60] | Nada sobre RBAC ou auditoria no README [60] |
| MemOS | Apache-2.0 [63] | v2.0.34 [69] | Cloud API, self-host e plugin local para Hermes (SQLite persistente + FTS5 + vetor), lançado em 10/04/2026 [62] | API única para add, retrieve, edit e delete; "inspectable and editable by design" [62] |
| LangMem | MIT [23] | PyPI 0.0.30, 27/10/2025 [24] | Roda sobre o store do LangGraph; Postgres em produção [22] | Nada sobre governança no README [22] |
| Memory tool da Anthropic | API (helpers do SDK com prefixo "Beta") [35] | n/a | O cliente executa as operações; "Your application executes each request" [35] | Operações restritas a `/memories`, com proteção contra path traversal [35] |
| Claude Code (CLAUDE.md e auto memory) | n/a [34] | n/a | Arquivos locais e de projeto [34] | Política gerenciada "cannot be excluded by individual settings"; caminhos por SO (no Windows, `C:\Program Files\ClaudeCode\CLAUDE.md`) [34] |
| OpenWiki | MIT [8] | npm 0.7.2, 09/10/2026 [9] | Roda na máquina; a geração usa provedor de modelo [4] | Claims com evidência e versão [3]. Sem RBAC ou auditoria declarados [7] |

### Bases de dados e embeddings

- SQLite FTS5 tem tokenizers unicode61, ascii, porter e trigram (este último permite busca por substring). Oferece tabelas com conteúdo externo, contentless e contentless-delete, além de bm25(), highlight() e snippet() [25].
- sqlite-vec: documentação marcada como "work-in-progress", exibindo v0.1.10-alpha.4 [26]. Licença MIT (LICENSE-MIT) e Apache-2.0 [26][27]. PyPI 0.1.9, 31/03/2026, com wheel `win_amd64` [28]. Busca vetorial com `MATCH` e `ORDER BY distance LIMIT` [26]. Bindings listados: Python, Node.js, Ruby, Rust, Go e Datasette; não há binding móvel listado [26].
- pgvector: licença PostgreSQL [30]. Índices HNSW e IVFFlat. HNSW tem melhor trade-off de velocidade e recall, mas constrói mais devagar e usa mais memória [29]. Suporta PostgreSQL 13 ou superior; build no Windows com nmake [29]. O README cita v0.8.7 [29].
- multilingual-e5-small: licença MIT [31]. Cerca de 117,65 milhões de parâmetros em F32 (arquivo de ~470,6 MB) [31]. hidden_size 384, 12 camadas, 512 posições máximas e vocabulário de 250.037 tokens [32].
- EmbeddingGemma-300m: licença Gemma [33]. Cerca de 302,9 milhões de parâmetros em F32 (arquivo de ~1,21 GB) [33]. Saída de 768 dimensões, com truncamento Matryoshka para 512, 256 ou 128 [33]. Baixar o README bruto sem autenticação retornou HTTP 401 [33].

### Segurança e governança

- OWASP LLM Top 10 (2025): LLM01 Prompt Injection; LLM04 Data and Model Poisoning, que cobre dados de embedding; LLM08 Vector and Embedding Weaknesses [36][37].
- OWASP Top 10 for Agentic Applications 2026, ASI06 Memory & Context Poisoning. Exemplos: poisoning de RAG, contexto compartilhado, manipulação da janela de contexto, deriva de memória de longo prazo, backdoors por gatilho e propagação entre agentes. Controles prescritos: validar e varrer escritas de memória antes do commit; segmentar sessões e domínios; aceitar só fontes autenticadas e curadas; registrar proveniência e atribuição de fonte; não reingerir saídas do próprio agente; snapshots, rollback e controle de versão; revisão humana em ações de alto risco; expirar memória não verificada; ponderar a recuperação por confiança e tenancy [38].
- Blog do OWASP (publicado em 14/05/2026): a Cisco divulgou o "MemoryTrap"; depois da divulgação, a Claude Code v2.1.50 removeu memórias do usuário do system prompt [39].
- AgentPoison: envenena a memória de longo prazo ou a base RAG de agentes. Taxa média de sucesso "higher than 80%", com poison rate abaixo de 0,1% e impacto em tarefas benignas abaixo de 1% [40].
- MINJA: injeta registros maliciosos na memória apenas por consultas e observações de saída, sem modificar o banco diretamente [41]. O resumo oficial não traz taxa de sucesso [41].
- NIST: NIST AI 600-1 (Generative AI Profile) publicado em 26/07/2024. O AI RMF 1.0 está em revisão [42].
- OpenTelemetry: existe a página de convenções semânticas para GenAI [43]. O status de estabilidade não foi confirmado.

## Interpretações

### 1. O que é o OpenWiki e onde ele se encaixa

- A identidade mais provável de "OpenWiki" é `langchain-ai/openwiki` [1][7]. Os homônimos [10][11] não devem ser tratados como LangChain.
- Na taxonomia do projeto, o OpenWiki é memória de conhecimento de projeto (tipo 4), não memória de agente. A LangChain o descreve como "built for agents to read as memory" [7], mas ele não guarda estado por usuário nem faz busca vetorial.
- O que o harness pode reaproveitar: (a) wiki Markdown versionada; (b) Claims com evidência e versão, que tornam a memória verificável; (c) blocos-ponteiro em AGENTS.md e CLAUDE.md, que fazem o agente consultar a wiki [3][7].
- Como dependência, o OpenWiki traria Node.js 22.22 ou superior, uma conta de provedor com custo de tokens não confirmado e, opcionalmente, o LangSmith. Como padrão, não traz dependência de runtime.
- Relação com LangChain: o projeto é oficial, mas aceita vários provedores (Anthropic, OpenAI, Gemini, Bedrock, OpenRouter e outros) [4][6]. A dependência de LangChain se limita ao framework interno (Deep Agents) e ao tracing opcional [6][7].

### 2. Tipos de memória e tecnologia

| Tipo | Exemplo | Armazenamento local | Recuperação | Observação |
|---|---|---|---|---|
| Curto prazo da conversa | Mensagens da sessão | Lista em memória + transcrição em SQLite (WAL) | Recência; sem vetor | Compactação como `/compress` do Hermes [12] |
| Estado de workflow | Passos, checkpoints, aprovações | Tabelas SQLite com máquina de estados | Chave (ID da execução) | Aprovações são linhas auditáveis |
| Fatos duráveis do usuário | Preferências, perfil | Markdown/YAML versionado (padrão USER.md [15]) + índice | FTS5 | Consentimento e data de revisão obrigatórios |
| Conhecimento de projeto | Decisões, arquitetura, convenções | Markdown no repositório (AGENTS.md; wiki estilo OpenWiki [3]) + índice | FTS5 + vetor, com evidência `arquivo#Lx-Ly` | Claims ligam fatos a evidências |
| Corpus institucional | Políticas e documentos importados | Documentos com fonte, versão e hash + índice | Híbrida, com filtro por fonte | Postgres/pgvector só se o volume ou o gateway exigir |

### 3. Viabilidade local com 4 GB de RAM e CPU (estimativa, sem medição)

- **Viável por desenho:** SQLite com FTS5 e sqlite-vec, processo embutido, sem servidor [25][26]. Basic Memory, com Markdown e índice SQLite [58]. LangMem com InMemoryStore, para testes [22].
- **Viável com ressalvas:** multilingual-e5-small em CPU, com arquivo F32 de ~470 MB [31]. Quantização reduziria isso, mas não foi verificada (H3). Cognee e MemOS alegam execução local [55][62], sem medição.
- **Pesado para o perfil local:** Graphiti, que exige Neo4j, FalkorDB ou Neptune [52]; Honcho, como servidor [60]; Mem0 self-hosted, com containers [44]; pgvector, com servidor PostgreSQL [29]; EmbeddingGemma-300m, com arquivo F32 de ~1,2 GB [33]. Esses componentes fazem mais sentido no gateway em servidor.
- **Não verificado:** consumo de RAM do servidor do Letta [47].

### 4. Estrutura dos cinco níveis: herança, precedência e conflitos

Os níveis (organização > workspace > projeto > pessoa, com agente como eixo próprio) são uma proposta. Combinam padrões verificados: a política gerenciada do Claude Code, que "cannot be excluded by individual settings" [34]; a regra de primeiro arquivo encontrado, do Hermes [17]; e a ponderação de recuperação por confiança e tenancy, do OWASP [38].

Regra proposta: precedência por tipo de chave, e não uma ordem global.

1. **Políticas e permissões** (`policy.*`): deny-overrides. Níveis inferiores só restringem; nunca liberam o que um nível superior proíbe.
2. **Identidade e estilo** (`identity.*`): o agente tem a base; a pessoa ajusta o estilo; o projeto ajusta o contexto do projeto. Nenhum nível inferior redefine a identidade básica. Subagentes herdam políticas, mas não necessariamente a persona (no Hermes, subagentes não carregam SOUL.md [18]).
3. **Fatos de conhecimento** (`knowledge.*`): vale a entrada mais específica (projeto > workspace > organização), mas só entre entradas aprovadas. Duas entradas aprovadas em conflito no mesmo nível ficam "contestadas" e saem da recuperação automática até decisão humana.
4. **Preferências da pessoa**: a pessoa é a autoridade. Um projeto só altera uma preferência com aprovação dela.
5. **Notas aprendidas pelo agente**: confiança mais baixa. Nunca substituem política, identidade ou fato aprovado; só viram ativas após aprovação.

Todo conflito registra os valores, as fontes, os níveis e quem decide. Sem decisão, vale o último valor aprovado.

### 5. Ingestão, chunking, embeddings, busca, citações, proveniência, expiração e remoção

- **Ingestão:** coletar → normalizar para Markdown → varrer (regras e detecção de injeção; o OWASP recomenda varrer escritas de memória [38]) → classificar (nível, confiança, sensibilidade) → gerar unidades → embeddings → indexar em FTS5 e sqlite-vec → commit com aprovação e evento de auditoria.
- **Unidade de memória:** para fatos, usar claim atômico com evidência, como no OpenWiki [3]. Para documentos longos, chunks por cabeçalho Markdown, com IDs estáveis e intervalo de linhas. O tamanho do chunk precisa de calibração com avaliação própria; nenhum valor foi verificado nesta pesquisa.
- **Embeddings:** padrão proposto multilingual-e5-small (MIT; 384 dimensões; ~118 milhões de parâmetros) [31][32], com fallback FTS5-only para plataformas sem vetor. EmbeddingGemma-300m como opção posterior: as 768 dimensões podem ser truncadas para 512, 256 ou 128 [33], mas a licença Gemma e o acesso restrito exigem análise. Registrar modelo, versão e dimensão em cada linha, para permitir reindexação.
- **Busca híbrida:** FTS5 (bm25()) [25] + KNN do sqlite-vec [26], com fusão de rankings (por exemplo, RRF, não verificado nesta pesquisa). Basic Memory já faz busca híbrida FTS + vetor em SQLite [58], o que é precedente de arquitetura. Filtros por nível, escopo, confiança e expiração antes do ranking, para evitar vazamento entre escopos. O OWASP descreve o risco de "cross-tenant vector bleed" quando os filtros de namespace são frouxos [38].
- **Citações:** cada item recuperado devolve ID, nível, fonte (`arquivo#Lx-Ly` ou URL), hash do conteúdo, data e confiança. A resposta cita os IDs e a interface mostra a origem. Modelos: Claims do OpenWiki [3] e a inspeção de evidências recuperadas do Cognee [55].
- **Proveniência:** ator (agente, pessoa, ferramenta, conector), sessão, aprovação, data, transformações (por exemplo, sumarização) e versão do modelo de embedding [38].
- **Expiração:** contexto de sessão termina com a sessão; estado de workflow termina com a execução; fatos de pessoa têm data de revisão; memória não verificada expira [38]. Um claim também pode expirar quando a evidência muda, como faz o OpenWiki [7]. Os prazos concretos cabem à pessoa decidir; não há número verificado nesta pesquisa.
- **Remoção:** lápide (soft-delete) → remoção física em FTS5, vetor, Markdown e backups, com aprovação. FTS5 oferece tabelas contentless-delete, mas a documentação lista pitfalls de update e delete em tabelas contentless [25]. O comportamento de DELETE do sqlite-vec precisa de teste no Windows (não verificado).
- **Criptografia em repouso:** SQLite não cifra por padrão (não verificado nesta pesquisa). Avaliar SQLCipher ou criptografia de disco.

### 6. Governança

- **Origem:** toda entrada tem fonte e ator [38].
- **Consentimento:** fatos de pessoa e dados sensíveis exigem confirmação explícita. O Hermes oferece `write_approval` como opção [15]; o harness deve tornar a aprovação o padrão.
- **Escopo de acesso:** leitura livre só dentro do workspace (requisito do usuário). Acesso à organização ou a outros workspaces exige concessão explícita.
- **Aprovação humana:** criar, alterar ou apagar memória altera arquivos ou dados, o que exige aprovação (requisito do usuário). O agente só corrige ou apaga a própria memória com aprovação.
- **Auditoria:** log append-only em SQLite, com ator, ação, alvo, hash antes e depois, aprovação, sessão e versão do modelo. Avaliar encadeamento de hashes para detectar adulteração (proposta, não verificada como prática recomendada).
- **Revisão:** revisão periódica de fatos de pessoa e de projeto. Entradas não verificadas expiram [38].
- **Versionamento e rollback:** Markdown em Git; SQLite com tabela de versões e snapshots; rollback por nível. O OpenWiki restaura a wiki anterior se uma regeneração falhar antes de ficar durável [3].
- **Anti-envenenamento:** (a) varredura de escritas e de saídas do modelo [38]; (b) nenhuma reingestão automática de saídas do próprio agente [38]; (c) web, conectores, e-mail, ferramentas e outros agentes são não confiáveis por padrão, com quarentena; (d) memória de alto impacto só é recuperada com dois fatores (proveniência e verificação humana) [38]; (e) testes adversariais com os cenários de AgentPoison [40] e MINJA [41].
- **Conflito com autonomia:** o Hermes cria skills e memórias de forma autônoma [12]. Isso conflita com os requisitos de aprovação para criar arquivos, instalar plugins e alterar memória. O harness precisa de um gate explícito em cada um desses caminhos.
- **Referências:** OWASP LLM01, LLM04 e LLM08 [36][37]; OWASP ASI06 [38][39]; AgentPoison [40]; MINJA [41]; NIST AI 600-1 [42]; memory tool da Anthropic [35]; política gerenciada do Claude Code [34]; aprovações e scanner do Hermes [16][17].

### 7. Identidade do agente como configuração versionada

Layout proposto, inspirado no Hermes [15][17], com camadas adicionais:

```
<harness>/identity/            escopo agente/pessoa
  SOUL.md                      identidade e estilo (base)
  policy.yaml                  permissões e aprovações (deny-overrides)
  tools.yaml                   ferramentas, MCP servers e plugins autorizados, com hash fixado
  memory/USER.md               fatos da pessoa, com proveniência
  memory/AGENT.md              notas do agente (pendentes até aprovação)
<projeto>/.harness/
  AGENTS.md                    instruções do projeto, com ponteiro para a wiki
  policy.yaml                  restrições adicionais (só restringem)
  wiki/                        opcional, estilo OpenWiki
<organização>/                 importado, somente leitura
```

- Cada arquivo tem front matter com id, versão, nível, dono, aprovação, hash, escopo, data de revisão e expiração.
- Carregamento no início da sessão, como snapshot [15], com o hash registrado no log de auditoria. Mudanças valem na sessão seguinte.
- Versionamento em Git. Edição feita pelo agente vira uma proposta (diff) para aprovação.
- Ferramentas autorizadas declaradas por classe de ação: criar ou alterar arquivos, executar terminal, apagar, alterar sistemas externos por API, enviar mensagem em canal, usar credenciais, instalar pacote ou plugin e gastar acima de limite. Cada classe tem regra de aprovação (requisito do usuário).
- Skills e plugins: versionados, com hash e origem. A instalação exige aprovação (requisito do usuário). O Hermes segue o padrão aberto agentskills.io [12], o que facilita reuso, mas não substitui verificação.
- Lição do Hermes: pacotes de identidade de terceiros não devem ser aceitos sem varredura e aprovação. O harness deve tratá-los como plugins [17].

## Hipóteses e pontos não confirmados

- **H1.** sqlite-vec mantém consistência com FTS5 em transações e permite remoção confiável no Windows. Não testado.
- **H2.** A busca híbrida (FTS5 + vetor com fusão) supera cada método isolado no corpus do projeto. Não medido.
- **H3.** multilingual-e5-small roda em CPU com 4 GB de RAM junto com o restante do harness. A estimativa vem só do número de parâmetros e do tamanho F32 (~470 MB) [31]. Quantização não verificada.
- **H4.** EmbeddingGemma-300m cabe em 4 GB com quantização. Não verificado. O acesso restrito [33] pode impedir a distribuição.
- **H5.** As obrigações da AGPL-3.0 (Honcho [61], Basic Memory [59]) são acionadas se o harness for distribuído ou oferecido como serviço de rede. Exige análise jurídica; esta nota não é aconselhamento jurídico.
- **H6.** O padrão de Claims reduz a deriva da documentação de projeto. Sem benchmark.
- **H7.** O snapshot congelado preserva o prefix cache. Afirmação da documentação [15]; não medida.
- **H8.** Cognee roda localmente com modelos pequenos em CPU [55]. Alegação do fornecedor; não medida.
- **H9.** O plugin local do MemOS é "100% on-device" [62]. Alegação do fornecedor; não medida.
- **H10.** sqlite-vec e FTS5 funcionam em Android, iOS e Web UI. Não verificado; sqlite-vec não lista binding móvel [26].
- **H11.** sqlite-vec é maduro o suficiente para uso de longo prazo. A própria documentação o chama de "work-in-progress" [26]; a API pode mudar.
- **Não confirmado:** custo de tokens do OpenWiki e de sistemas que usam LLM na extração (Mem0, Cognee, Graphiti); preço atual do plano do Basic Memory (menção a beta [58]); disponibilidade do memory tool da Anthropic [35]; estabilidade das convenções OpenTelemetry GenAI [43]; suporte do OpenWiki ao Windows; licença de `vercel-labs/openwiki` [10].
- **Não confirmado:** a taxa de sucesso do MINJA. Fontes secundárias citam faixas de "80% a mais de 99%" [64]; não usei esses números.

## Lacunas e conflitos

- **Identidade do OpenWiki:** três projetos com nomes parecidos [7][10][11]. A identificação com `langchain-ai/openwiki` é uma inferência a confirmar com o coordenador.
- **Hermes, hierarquia:** a documentação oficial diz que SOUL.md não faz parte da cadeia de arquivos de projeto [17]. Um tutorial de terceiros diz que AGENTS.md "pode sobrescrever" SOUL.md no projeto e cita `hermes persona show` [20]. Prevalece a fonte oficial, mas o comportamento não foi testado.
- **Hermes, perfis:** o texto oficial diz que `hermes profile install` copia SOUL.md "without a scan or an approval prompt" e, na mesma passagem, que um acerto "still blocks it" quando `distribution.yaml` controla o arquivo [17]. Ambíguo.
- **Hermes, limite de SOUL.md:** o teto de 20 mil caracteres aparece só em espelho de terceiros [19]; não confirmado na documentação oficial.
- **Hermes, montagem do prompt:** os espelhos descrevem a ordem das camadas de formas diferentes: uma lista de dez itens [19] e três níveis [21]. Não li `prompt_builder.py`.
- **Hermes, subsistemas:** `hermes_state_identity.py` e `hermes_state_fts.py` existem no repositório [12], mas não foram lidos.
- **Versões de artefatos:** Letta tem release 0.16.8 no GitHub [65] e pacote letta 0.34.12 no PyPI [49]; não confirmei a relação entre os dois. Mem0 tem como "latest" no GitHub o release do SDK TypeScript (ts-v3.3.1) [66], enquanto o pacote Python está em 2.2.1 [46].
- **pgvector:** `releases/latest` redireciona para a lista de releases. A versão mais recente não foi confirmada; o README cita v0.8.7 [29].
- **LangMem:** último upload no PyPI em 27/10/2025 [24]. Manutenção recente não confirmada.
- **Mem0:** a extração é "ADD-only" [44], mas o caminho de remoção pela API não foi confirmado.
- **Cognee:** o README não menciona SQLite, LanceDB ou Kuzu como padrão; o armazenamento padrão não foi confirmado [55].
- **Governança nos READMEs:** a busca por termos de RBAC, auditoria e permissões não retornou ocorrências relevantes. Um acerto de "SSO" no Cognee veio de "lessons" (falso positivo). A ausência no README não prova ausência no produto.
- **Métricas de popularidade:** o OpenWiki aparece com 14,7 mil e com 17,1 mil estrelas em snapshots diferentes [7]. A API do GitHub retornou 403, então não há dado verificado de última atividade.
- **Número de provedores do OpenWiki:** "thirteen" e "fourteen" em snapshots diferentes do README [7]; a tabela de providers tem 13 entradas [4].
- **Requisitos do usuário em tensão:**
  - "membros do projeto" podem inspecionar e corrigir memória, mas multiusuário está fora do escopo. Decidir se são papéis reservados ou humanos em aprovação.
  - "organização" é um nível de memória, mas tenants isolados estão fora do escopo. Proposta: conjunto institucional importado, somente leitura, de um único dono.
  - "criar ou alterar arquivos" exige aprovação. Como a memória persiste em arquivos ou banco, toda escrita de memória precisaria de aprovação, o que pode travar a aprendizagem automática. Decidir uma política por tipo, por exemplo: notas efêmeras de sessão, sem persistência, sem aprovação.
- **Plataformas:** Android e iOS não foram verificados para sqlite-vec [26]. Para a Web UI, não há camada de storage verificada.

## Recomendação preliminar

### Arquitetura sugerida

1. **Núcleo local:** SQLite em WAL, com tabelas de sessão, workflow e memória (nível, escopo, proveniência, confiança, expiração e versão), FTS5, sqlite-vec e log de auditoria append-only.
2. **Fonte de verdade em arquivos:** Markdown/YAML versionados (identidade, políticas, fatos de pessoa, conhecimento de projeto). O SQLite é um índice reconstruível.
3. **Embeddings:** multilingual-e5-small como padrão, com fallback FTS5-only. Registrar modelo e dimensão.
4. **Gateway híbrido:** Postgres + pgvector apenas se houver vetores compartilhados, com a mesma interface do repositório local. Graphiti e Honcho também ficariam no servidor, se forem adotados.
5. **Sistemas externos** (Cognee, MemOS, Mem0, Honcho) como adaptadores atrás de uma interface de memória, não como núcleo. Zep Community Edition e Graphiti não são recomendados para o núcleo (descontinuação e infraestrutura de grafo). LangMem não é recomendado por acoplamento ao LangGraph, que conflita com o requisito de harness agnóstico (interpretação).
6. **OpenWiki:** adotar o padrão (Claims, ponteiros em AGENTS.md). Usar a ferramenta apenas como geradora opcional de wiki de projeto.

### Pontuação das opções

Escala de 1 (fraco) a 5 (forte). Em Custo, 5 = menor custo. Em Esforço, 5 = menor esforço de operação e manutenção. Pontuação qualitativa do autor, baseada nas fontes; não medida. Custo não inclui tokens de LLM, que não foram confirmados.

| Opção | Pergunta de arquitetura | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | Esforço |
|---|---|---|---|---|---|---|---|---|
| SQLite FTS5 [25] | Busca lexical com remoção em arquivo local? | 4 | 5 | 3 | 5 | 4 | 5 | 5 |
| sqlite-vec [26][27][28] | KNN no mesmo SQLite, sem servidor, no Windows? | 4 | 2 | 3 | 4 | 4 | 5 | 4 |
| pgvector [29][30] | Vetores compartilhados num gateway? | 4 | 5 | 4 | 3 | 4 | 3 | 2 |
| multilingual-e5-small [31][32] | Embedding leve para CPU, com licença permissiva? | 3 | 4 | 4 | 4 | 5 | 5 | 4 |
| EmbeddingGemma-300m [33] | Mais qualidade e MRL, com licença restrita? | 4 | 4 | 4 | 2 | 4 | 4 | 3 |
| Mem0 [44][45][46] | Extração automática de fatos como núcleo? | 3 | 4 | 4 | 3 | 2 | 3 | 3 |
| Letta [47][48][49] | Agente com estado como núcleo? | 3 | 3 | 3 | 3 | 2 | 3 | 3 |
| Zep CE [50][51] | Edição open source do Zep? | 1 | 1 | 2 | 2 | 2 | 4 | 2 |
| Graphiti [52][53][54] | Grafo temporal de fatos como núcleo? | 4 | 3 | 3 | 2 | 3 | 2 | 2 |
| Cognee [55][56][57] | Grafo e vetor locais, com `forget`? | 4 | 4 | 4 | 3 | 3 | 4 | 3 |
| Basic Memory [58][59] | Markdown local com índice SQLite e MCP? | 4 | 3 | 3 | 5 | 4 | 5 | 4 |
| Honcho [60][61] | Modelagem do usuário como camada opcional? | 3 | 4 | 3 | 3 | 3 | 3 | 2 |
| MemOS [62][63] | API editável de memória com plugin local? | 4 | 3 | 4 | 3 | 3 | 4 | 3 |
| LangMem [22][23][24] | Memória via LangGraph store num harness agnóstico? | 3 | 3 | 2 | 2 | 2 | 4 | 4 |
| Arquivos de identidade do Hermes [12][15][17] | Identidade e memória como arquivos com snapshot? | 4 | 4 | 4 | 4 | 3 | 5 | 4 |
| OpenWiki [3][7][9] | Conhecimento de repositório com Claims? | 4 | 3 | 3 | 4 | 3 | 3 | 4 |
| Memory tool da Anthropic [35] | Memória como ferramenta com execução no cliente? | 3 | 2 | 4 | 2 | 4 | 4 | 4 |

Critérios: Maturidade considera idade, releases e estado declarado (Zep CE descontinuada; sqlite-vec em "work-in-progress"; OpenWiki criado em junho de 2026). Segurança considera governança documentada (RBAC, auditoria, retenção e remoção), e não só criptografia.

### Decisões pendentes para o coordenador

1. Definir "organização" para uma instalação de um único dono (proposta acima).
2. Aceitar ou não dependências AGPL-3.0 (Honcho, Basic Memory). Exige análise jurídica.
3. Confirmar que escrita de memória exige aprovação por padrão.
4. Medir RAM e latência de multilingual-e5-small com sqlite-vec no Windows antes de fixar o padrão.
5. Definir o papel de "membros do projeto" dentro de um escopo de um único usuário.

## Fontes

| # | URL | Título | Organização | Data (publicação ou acesso) |
|---|---|---|---|---|
| 1 | https://docs.langchain.com/oss/openwiki/overview | OpenWiki — Docs by LangChain (overview) | LangChain | Acesso 13/10/2026 |
| 2 | https://docs.langchain.com/oss/openwiki/quickstart | Quickstart — Docs by LangChain | LangChain | Acesso 13/10/2026 |
| 3 | https://docs.langchain.com/oss/openwiki/code-mode | Code mode — Docs by LangChain | LangChain | Acesso 13/10/2026 |
| 4 | https://docs.langchain.com/oss/openwiki/providers | Model providers — Docs by LangChain | LangChain | Acesso 13/10/2026 |
| 5 | https://docs.langchain.com/oss/openwiki/cli-reference | Command reference — Docs by LangChain | LangChain | Acesso 13/10/2026 |
| 6 | https://www.langchain.com/blog/introducing-openwiki-an-open-source-agent-for-repo-documentation | Introducing OpenWiki, an open source agent for repo documentation | LangChain (blog) | Publicado 01/07/2026 |
| 7 | https://github.com/langchain-ai/openwiki | langchain-ai/openwiki (README e repositório) | LangChain (GitHub) | Acesso 13/10/2026 |
| 8 | https://raw.githubusercontent.com/langchain-ai/openwiki/main/LICENSE | LICENSE (MIT) | LangChain | Acesso 13/10/2026 |
| 9 | https://registry.npmjs.org/openwiki | Registro npm do pacote openwiki | npm | Última versão 09/10/2026; acesso 13/10/2026 |
| 10 | https://github.com/vercel-labs/openwiki | vercel-labs/openwiki | Vercel Labs | Criado 28/06/2026 (snapshot); acesso 13/10/2026 |
| 11 | https://github.com/pacifio/open-wiki | pacifio/open-wiki | pacifio (GitHub) | Criado 08/03/2026 (snapshot); acesso 13/10/2026 |
| 12 | https://github.com/NousResearch/hermes-agent | hermes-agent (README e repositório) | Nous Research | Acesso 13/10/2026 |
| 13 | https://raw.githubusercontent.com/NousResearch/hermes-agent/main/LICENSE | LICENSE (MIT) | Nous Research | Acesso 13/10/2026 |
| 14 | https://github.com/NousResearch/hermes-agent/releases/tag/v0.21.7 | Release v0.21.7 (latest, via redirecionamento) | Nous Research | Acesso 13/10/2026 |
| 15 | https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what | Which File Does What? | Nous Research | Acesso 13/10/2026 |
| 16 | https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes | Use SOUL.md with Hermes | Nous Research | Acesso 13/10/2026 |
| 17 | https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files | Context Files | Nous Research | Acesso 13/10/2026 |
| 18 | https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/personality.md | Personality (SOUL.md e overlays) | Nous Research | Acesso 13/10/2026 |
| 19 | https://github.com/mudrii/hermes-agent-docs/blob/main/developer-guide/prompt-assembly.md | prompt-assembly.md (espelho de terceiros; secundária) | mudrii (GitHub) | Acesso 13/10/2026 |
| 20 | https://lumadock.com/tutorials/hermes-soul-agents-user-memory-files | SOUL.md, AGENTS.md, USER.md and MEMORY.md explained (tutorial; secundária) | LumaDock | Acesso 13/10/2026 |
| 21 | https://hermesagent.org.cn/en/docs/developer-guide/prompt-assembly | Prompt Assembly — Hermes Agent CN (espelho; secundária) | Hermes Agent CN | Acesso 13/10/2026 |
| 22 | https://github.com/langchain-ai/langmem | langchain-ai/langmem (README) | LangChain | Acesso 13/10/2026 |
| 23 | https://raw.githubusercontent.com/langchain-ai/langmem/main/LICENSE | LICENSE (MIT) | LangChain | Acesso 13/10/2026 |
| 24 | https://pypi.org/pypi/langmem/json | PyPI: langmem 0.0.30 | PyPI | Upload 27/10/2025; acesso 13/10/2026 |
| 25 | https://sqlite.org/fts5.html | SQLite FTS5 Extension | SQLite | Acesso 13/10/2026 |
| 26 | https://alexgarcia.xyz/sqlite-vec/ | sqlite-vec (documentação) | Alex Garcia | Acesso 13/10/2026 |
| 27 | https://raw.githubusercontent.com/asg017/sqlite-vec/main/LICENSE-MIT | LICENSE-MIT | Alex Garcia | Acesso 13/10/2026 |
| 28 | https://pypi.org/pypi/sqlite-vec/json | PyPI: sqlite-vec 0.1.9 | PyPI | Upload 31/03/2026; acesso 13/10/2026 |
| 29 | https://github.com/pgvector/pgvector | pgvector (README) | pgvector | Acesso 13/10/2026 |
| 30 | https://raw.githubusercontent.com/pgvector/pgvector/master/LICENSE | LICENSE (PostgreSQL License) | pgvector | Acesso 13/10/2026 |
| 31 | https://huggingface.co/intfloat/multilingual-e5-small | multilingual-e5-small (model card) | Hugging Face | Acesso 13/10/2026 |
| 32 | https://huggingface.co/intfloat/multilingual-e5-small/raw/main/config.json | config.json | Hugging Face | Acesso 13/10/2026 |
| 33 | https://huggingface.co/google/embeddinggemma-300m | embeddinggemma-300m (model card) | Google DeepMind (Hugging Face) | Acesso 13/10/2026 |
| 34 | https://docs.claude.com/en/docs/claude-code/memory | Claude Code — memory (CLAUDE.md e auto memory) | Anthropic | Acesso 13/10/2026 |
| 35 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool | Memory tool | Anthropic | Acesso 13/10/2026 |
| 36 | https://genai.owasp.org/llm-top-10/ | OWASP Top 10 for LLM Applications (2025) | OWASP GenAI Security Project | Acesso 13/10/2026 |
| 37 | https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/ | LLM08:2025 Vector and Embedding Weaknesses | OWASP GenAI Security Project | Acesso 13/10/2026 |
| 38 | https://genai.owasp.org/download/52117 | OWASP Top 10 for Agentic Applications 2026 (PDF; ASI06) | OWASP GenAI Security Project | Edição 2026; acesso 13/10/2026 |
| 39 | https://genai.owasp.org/2026/05/13/memory-is-a-feature-it-is-also-an-attack-surface/ | Memory Is a Feature. It Is Also an Attack Surface | OWASP GenAI Security Project (blog) | Publicado 14/05/2026 |
| 40 | https://arxiv.org/abs/2407.12784 | AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases | arXiv (Chen et al.) | Jul/2024 (arXiv 2407); acesso 13/10/2026 |
| 41 | https://arxiv.org/abs/2503.03704 | Memory Injection Attacks on LLM Agents via Query-Only Interaction (MINJA) | arXiv (Dong et al.) | Mar/2025 (arXiv 2503); acesso 13/10/2026 |
| 42 | https://www.nist.gov/itl/ai-risk-management-framework | AI Risk Management Framework | NIST | NIST AI 600-1 em 26/07/2024; acesso 13/10/2026 |
| 43 | https://opentelemetry.io/docs/specs/semconv/gen-ai/ | Semantic conventions for generative AI | OpenTelemetry | Acesso 13/10/2026 |
| 44 | https://github.com/mem0ai/mem0 | mem0 (README) | Mem0 | Acesso 13/10/2026 |
| 45 | https://raw.githubusercontent.com/mem0ai/mem0/main/LICENSE | LICENSE (Apache-2.0) | Mem0 | Acesso 13/10/2026 |
| 46 | https://pypi.org/pypi/mem0ai/json | PyPI: mem0ai 2.2.1 | PyPI | Upload 25/09/2026; acesso 13/10/2026 |
| 47 | https://github.com/letta-ai/letta | letta (README) | Letta | Acesso 13/10/2026 |
| 48 | https://raw.githubusercontent.com/letta-ai/letta/main/LICENSE | LICENSE (Apache-2.0) | Letta | Acesso 13/10/2026 |
| 49 | https://pypi.org/pypi/letta/json | PyPI: letta 0.34.12 | PyPI | Upload 12/10/2026; acesso 13/10/2026 |
| 50 | https://github.com/getzep/zep | zep (README; Community Edition descontinuada) | Zep | Acesso 13/10/2026 |
| 51 | https://raw.githubusercontent.com/getzep/zep/main/LICENSE | LICENSE (Apache-2.0) | Zep | Acesso 13/10/2026 |
| 52 | https://github.com/getzep/graphiti | graphiti (README) | Zep | Acesso 13/10/2026 |
| 53 | https://raw.githubusercontent.com/getzep/graphiti/main/LICENSE | LICENSE (Apache-2.0) | Zep | Acesso 13/10/2026 |
| 54 | https://pypi.org/pypi/graphiti-core/json | PyPI: graphiti-core 0.30.2 | PyPI | Upload 08/09/2026; acesso 13/10/2026 |
| 55 | https://github.com/topoteretes/cognee | cognee (README) | Topoteretes | Acesso 13/10/2026 |
| 56 | https://raw.githubusercontent.com/topoteretes/cognee/main/LICENSE | LICENSE (Apache-2.0) | Topoteretes | Acesso 13/10/2026 |
| 57 | https://pypi.org/pypi/cognee/json | PyPI: cognee 1.6.4 | PyPI | Upload 13/10/2026; acesso 13/10/2026 |
| 58 | https://github.com/basicmachines-co/basic-memory | basic-memory (README) | Basic Machines | Acesso 13/10/2026 |
| 59 | https://raw.githubusercontent.com/basicmachines-co/basic-memory/main/LICENSE | LICENSE (AGPL-3.0) | Basic Machines | Acesso 13/10/2026 |
| 60 | https://github.com/plastic-labs/honcho | honcho (README) | Plastic Labs | Acesso 13/10/2026 |
| 61 | https://raw.githubusercontent.com/plastic-labs/honcho/main/LICENSE | LICENSE (AGPL-3.0) | Plastic Labs | Acesso 13/10/2026 |
| 62 | https://github.com/MemTensor/MemOS | MemOS (README) | MemTensor | Acesso 13/10/2026 |
| 63 | https://raw.githubusercontent.com/MemTensor/MemOS/main/LICENSE | LICENSE (Apache-2.0) | MemTensor | Acesso 13/10/2026 |
| 64 | https://vectorize.io/articles/owasp-asi06 | OWASP ASI06: Memory and Context Poisoning Explained (secundária) | Vectorize | Publicado 12/06/2026 |
| 65 | https://github.com/letta-ai/letta/releases/tag/0.16.8 | Release 0.16.8 | Letta | Acesso 13/10/2026 |
| 66 | https://github.com/mem0ai/mem0/releases/tag/ts-v3.3.1 | Release ts-v3.3.1 | Mem0 | Acesso 13/10/2026 |
| 67 | https://github.com/basicmachines-co/basic-memory/releases/tag/v0.23.2 | Release v0.23.2 | Basic Machines | Acesso 13/10/2026 |
| 68 | https://github.com/plastic-labs/honcho/releases/tag/v3.2.2 | Release v3.2.2 | Plastic Labs | Acesso 13/10/2026 |
| 69 | https://github.com/MemTensor/MemOS/releases/tag/v2.0.34 | Release v2.0.34 | MemTensor | Acesso 13/10/2026 |
| 70 | https://github.com/langchain-ai/openwiki/blob/main/openwiki/quickstart.md | openwiki/quickstart.md (repositório; modo personal) | LangChain (GitHub) | Acesso 13/10/2026 |
