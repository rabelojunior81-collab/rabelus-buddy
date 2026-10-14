# LangChain, LangGraph, DeepAgents, LangSmith e observabilidade com Langfuse

**Data de referência:** 13/10/2026. Fontes acessadas em 13/10/2026. Datas de pacotes e releases vêm de metadados em UTC; por exemplo, 2026-10-14T01:12Z corresponde a 13/10/2026, 22:12, em Brasília.

**Convenções:** [n] remete à seção Fontes. "Cálculo" indica aritmética sobre valores publicados pelas fontes. "Não confirmado" indica informação que não apareceu nas fontes consultadas.

## Resumo

- **Papéis na família.** LangChain é o framework de agentes e de integrações (`create_agent`). LangGraph é o runtime de orquestração com estado e durabilidade. Deep Agents é um harness open source construído sobre LangChain agents. LangSmith é a plataforma de observabilidade, avaliação e gestão de prompts, com deployment opcional [24][25][26][38][39].
- **Licenças.** LangChain, LangGraph e Deep Agents são MIT, assim como os SDKs do LangSmith e do Langfuse. A plataforma LangSmith não é open source: o self-hosting exige chave de licença comercial. O core do Langfuse é MIT; as pastas `ee/` têm licença comercial [1–5][15–18][21][22][35].
- **"Managed DeepAgents" do briefing.** Nas fontes consultadas, o nome é Managed Deep Agents (MDA). É serviço gerenciado em public beta que executa o Deep Agents no LangSmith Agent Server. Segundo o README, o SDK não é open source durante o beta, mas os pacotes no PyPI e no npm declaram MIT. Há conflito a resolver [6][12][27–29][32].
- **Observabilidade.** A ClickHouse adquiriu o Langfuse em janeiro de 2026. Ambas as empresas afirmam que não há mudança de licença planejada [60–63].
- **Self-hosting não cabe nas restrições.** Somando os mínimos por serviço, o Langfuse exige cerca de 21,5 GiB de RAM (cálculo). O LangSmith recomenda pelo menos 16 GB de RAM no Docker e exige licença Enterprise para self-hosting. Com 4 GB de RAM e US$ 50/mês, nenhum dos dois é viável [33–38][48–53].
- **Nuvem dentro do orçamento.** Langfuse Hobby é gratuito (50k units/mês) e Core custa US$ 29/mês (100k units incluídos). LangSmith Developer é gratuito (5k base traces/mês) e Plus custa US$ 39 por assento [39][47].
- **Riscos de custo no LangSmith.** Um Serverless Small rodando 24×7 custaria cerca de US$ 62/mês; um Dedicated Small, cerca de US$ 389/mês (cálculos com as taxas publicadas). Com o Engine ligado, pode haver 840 a 5.400 LSU/mês (cálculo) [39][40].
- **Instrumentação.** As convenções GenAI do OpenTelemetry seguem em status Development. Captura de conteúdo é opt-in e tratada como sensível. O Langfuse mapeia atributos `gen_ai.*`; o exemplo de OTel do LangSmith usa nomes de atributos diferentes [41][55][64–67].
- **Recomendação preliminar.** LangGraph, LangChain, Deep Agents e MDA não devem ser donos do estado do harness; devem ser adaptadores atrás de interfaces próprias. Instrumentar com OTel GenAI, usar Langfuse Cloud (Hobby, depois Core) como backend inicial e manter LangSmith Developer como comparação. Self-hosting fica para quando houver servidor dedicado no orçamento.

## Fatos verificados

### 1. Produtos, licenças, repositórios e versões

| Produto | Papel (segundo a fonte) | Licença | Repositório | Versões atuais | Fontes |
|---|---|---|---|---|---|
| LangChain | Framework de agentes e integrações; `create_agent` como harness mínimo | MIT | github.com/langchain-ai/langchain | PyPI `langchain` 1.4.5 (upload 2026-10-12); npm `langchain` 1.5.16; release GitHub `langchain-core==1.6.10` (2026-10-12) | [1][7][15][25] |
| LangGraph | Runtime e framework de orquestração com estado | MIT | github.com/langchain-ai/langgraph | PyPI `langgraph` 1.2.15 (2026-10-12); npm `@langchain/langgraph` 1.5.0; release GitHub `langgraph-cli==0.4.34` (2026-10-13) | [2][8][16][24] |
| Deep Agents | Harness open source ("batteries-included") | MIT | github.com/langchain-ai/deepagents | PyPI `deepagents` 0.7.25 (2026-10-14 UTC); npm `deepagents` 1.15.0; release `deepagents==0.7.25` | [3][9][17][26] |
| Managed Deep Agents (briefing: "Managed DeepAgents") | Serviço gerenciado: `define_deep_agent` mais CLI `mda`, executado no LangSmith Agent Server; public beta | Conflito: PyPI e npm declaram MIT [6][12]; README diz que o SDK não é open source durante o beta [32]; licença do repositório não verificada (HTTP 403) [20] | github.com/langchain-ai/managed-deepagents (landing page e issues) | PyPI `managed-deepagents` 0.9.1 (2026-10-13 UTC); npm `managed-deepagents` 0.9.1 | [6][12][20][27–32] |
| LangSmith | Observabilidade, avaliação e prompts; também deployment, Engine, Fleet, Sandboxes e LLM Gateway | Plataforma proprietária; SDK MIT | github.com/langchain-ai/langsmith-sdk | PyPI `langsmith` 0.14.8 (2026-10-13 UTC); npm `langsmith` 0.10.13; release v0.14.8 | [4][10][18][33–35][39] |
| Langfuse | Observabilidade, datasets, experimentos, avaliação e gestão de prompts | MIT para o core; `ee/` com licença comercial | github.com/langfuse/langfuse | PyPI `langfuse` 4.17.0 (2026-10-05); npm `@langfuse/tracing` e `@langfuse/otel` 5.13.1 (MIT); npm `langfuse` 3.39.2 é o cliente v3 descontinuado; release v4.58.0 (2026-10-13) | [5][11][13][14][19][21–23] |

- Popularidade no GitHub em 13/10/2026: langchain 147.798 estrelas; langgraph 43.225; deepagents 30.228; langsmith-sdk 1.077; langfuse 35.790 [15–19].
- As "latest releases" do GitHub de langchain e langgraph são de sub-pacotes (`langchain-core` e `langgraph-cli`). Para a versão do pacote principal, use o PyPI [1][2][15][16].

### 2. Papéis declarados pelas próprias fontes

- **LangGraph:** "low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents". O foco é "durable execution, streaming, human-in-the-loop, and persistence" [24].
- **LangGraph frente ao LangSmith:** a documentação descreve o LangGraph open source como "stateful orchestration framework" e o LangSmith como "scalable infrastructure for deploying LangGraph applications". Na tabela, o checkpointer é "community contributed" no open source e "supported out-of-the-box" no LangSmith [38].
- **LangChain:** `create_agent` é "a minimal, highly configurable agent harness"; a documentação resume em "Agent = Model + Harness" [25]. "LangChain's agents are built on top of LangGraph" e herdam durable execution, HITL e persistência [25]. Suporta "OpenAI, Anthropic, Google, and more" [25].
- **Deep Agents:** "batteries-included" agent com compressão automática de contexto, filesystem virtual e spawn de subagentes; "built on LangChain agents, which you can also use directly" [25]. Capacidades embutidas: filesystem para contexto, subagentes e memória de longo prazo; planejamento e skills são opcionais [26]. Descrição no PyPI: "agent harness with a built-in filesystem and context management, sub-agent delegation, skills, and long-term memory" [3].
- **Managed Deep Agents:** "runs the open source Deep Agents harness rather than a second framework" [27]. `create_deep_agent` devolve um agente compilado, e você é dono de backend, store, checkpointer e servidor. `define_deep_agent` devolve uma definição, que o runtime gerenciado compila com `create_deep_agent` [27].
- **MDA, superfície:** Agent Server API, threads, runs, streaming e endpoint MCP [27]. Estrutura do projeto: `agent.py`, `instructions.md`, `skills/`, `tools/`, conectores MCP, `middleware/`, `sandbox/`, `memory.py`, `identity.py`, `channels/`, `schedules/` e `evals/` [27]. O canal Slack embutido envia apenas conteúdo de texto [68].
- **MDA, deploy:** `instructions.md` e `skills/` são sincronizados ao Context Hub do LangSmith; variáveis não reservadas do `.env` viram segredos do deployment; o código é enviado como arquivo de build [29].
- **MDA, governança:** `interrupt_on` pausa antes de chamadas de ferramenta selecionadas para aprovação humana; `permissions` controla o acesso a caminhos do filesystem; a memória é declarada em `memory.py`, com política `allow` por camada [30].
- **MDA, Engine:** é opcional. Entre execuções, o agente pode revisar conversas e atualizar arquivos do Context Hub [31].

### 3. Estado do MDA: beta, regiões e licença

- Public beta em LangSmith Cloud [27][28][29].
- Regiões: o README diz "available on LangSmith Cloud in the US region" [32]. A documentação de deploy lista GCP US, GCP EU e GCP APAC como suportados; AWS US ainda não é suportado [29]. Ferramentas gerenciadas do LangSmith estão disponíveis apenas em GCP US [29].
- Licença: o README diz que "The Managed Deep Agents SDK is not open source during the beta" [32]. PyPI e npm declaram MIT para `managed-deepagents` 0.9.1 [6][12]. A consulta à API do repositório retornou HTTP 403 [20].
- Blog: o texto traz "Update 8/7: ... now available in public beta" e, no corpo, "Today, we're introducing Managed Deep Agents in private beta" [31].

### 4. Self-hosting: componentes e requisitos

**LangSmith self-hosted**

- Componentes: Kubernetes com Helm (ou Docker, para Agent Server standalone); PostgreSQL 14 ou superior; Redis 6.2 ou superior, ou Valkey 8; ClickHouse na versão do chart; blob storage, que é obrigatório [33][34][36].
- Licença: chave fornecida pela LangChain. É preciso egress para `https://beacon.langchain.com` para verificação de licença e relatórios de uso, salvo no modo offline [34][35].
- Recursos: recomendados pelo menos 16 vCPU e 64 GB disponíveis no cluster; nó com ClickHouse in-cluster exige 4 vCPU e 16 GB alocáveis [35]. Docker: recomendado no mínimo 16 GB de RAM e 4 CPUs; PostgreSQL 8 GB e 2 CPUs; Redis 4 GB e 2 CPUs; ClickHouse 32 GB e 8 CPUs [38].
- ClickHouse in-cluster serve a desenvolvimento e POC; produção exige ClickHouse gerenciado ou externo [36].
- LangSmith Deployment (control plane e data plane no próprio cluster) exige plano Enterprise [37].
- Insights e Chat vêm ativados por padrão a partir do chart 0.15.1, com chave de criptografia e acesso a modelo [33][35]. Sandboxes exigem nós com KVM e JuiceFS em EKS, GKE ou AKS [33].

**Langfuse self-hosted**

- Componentes: containers Web e Worker; PostgreSQL (dados transacionais); ClickHouse (traces, observations e scores); Redis ou Valkey (fila e cache); S3 ou blob storage (eventos e mídia); LLM API opcional [48].
- Mínimos por serviço: Web 2 vCPU e 4 GiB; Worker 2 vCPU e 4 GiB; PostgreSQL 2 vCPU e 4 GiB; Redis/Valkey 1 vCPU e 1,5 GiB; ClickHouse 2 vCPU e 8 GiB; blob serverless ou SeaweedFS/MinIO (2 vCPU e 4 GiB) [49].
- Docker Compose: a documentação recomenda pelo menos 4 cores e 16 GiB para a VM, com exemplo de 100 GiB de disco [53]. O Compose é uma VM única, sem alta disponibilidade, escala ou backup [48].
- Versões: para o v4, PostgreSQL 15 no mínimo (16 recomendado) [50]; Redis 7 ou superior, com 7.2 recomendado para o v4 e `maxmemory-policy=noeviction` [51].
- PostgreSQL e ClickHouse devem rodar em UTC [48][50].
- Node.js: o heap padrão é de 1,7 GiB; é preciso configurar `max-old-space-size` [52].
- Deployments oficiais: Docker Compose, Kubernetes (Helm), AWS, Azure e GCP (Terraform). Render e Railway são comunitários [48].
- Cálculo: somando os mínimos, dá 9 vCPU e 21,5 GiB sem MinIO, e 11 vCPU e 25,5 GiB com MinIO.

### 5. Convenções GenAI do OpenTelemetry (estado em 13/10/2026)

- As convenções GenAI estão no repositório `open-telemetry/semantic-conventions-genai`. Ele estende as convenções core com spans, métricas e eventos para clientes GenAI, MCP e convenções por provedor [64].
- Status **Development** para spans de inferência, embeddings, retrieval, fetch response, memory e execute tool [65]; e para spans de agentes e workflows [66].
- Nomes de span: inferência `{gen_ai.operation.name} {gen_ai.request.model}`; ferramenta `execute_tool {gen_ai.tool.name}`, kind INTERNAL [65]. Agente: `invoke_agent {gen_ai.agent.name}`; agente no mesmo processo usa kind INTERNAL, com "LangChain agents" citado como exemplo [66]. Workflow: `invoke_workflow {gen_ai.workflow.name}`, para "graphs, orchestrators" [66].
- Atributos citados: `gen_ai.operation.name` (obrigatório), `gen_ai.provider.name` (discriminador de formato), `gen_ai.request.model`, `gen_ai.usage.input_tokens` (inclui tokens em cache), `gen_ai.tool.name`, `gen_ai.agent.name`, `gen_ai.workflow.name`, `gen_ai.data_source.id` e `gen_ai.retrieval.documents` [65][66].
- Conteúdo: instruções, entradas e saídas são descritas como "sensitive" e "large". Instrumentações não devem capturá-las por padrão. Há três modos: nenhum (padrão); atributos no span (`gen_ai.system_instructions`, `gen_ai.input.messages`, `gen_ai.output.messages`); e armazenamento externo com referência no span, recomendado em produção [65].
- Eventos: quando o atributo é gravado em eventos, deve ser estruturado [65]. O modelo inclui `events.yaml` [64].
- Transição: instrumentações que usam até v1.36.0 mantêm o comportamento padrão; a versão nova é ativada por `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` [67].
- Versões referenciadas: links para o core v1.44.0 na versão main [65] e para v1.41.0 na versão tagueada [67].

### 6. Como LangSmith e Langfuse recebem OTel

- **LangSmith:** com `LANGSMITH_OTEL_ENABLED=true` e `LANGSMITH_TRACING=true`, o LangSmith recebe spans pelo endpoint OTLP. Um OpenTelemetry Collector pode fazer fanout para o LangSmith e para outros backends. A instrumentação é automática para apps LangChain e manual para outros frameworks [41].
- **LangSmith, exemplo oficial:** usa `gen_ai.system`, `gen_ai.request.model`, `gen_ai.prompt.{i}.content`, `gen_ai.completion.0.content`, `gen_ai.usage.prompt_tokens` e o atributo próprio `langsmith.span.kind` [41].
- **Langfuse:** recebe OTLP em `/api/public/otel`, com Basic Auth e o header `x-langfuse-ingestion-version=4`. Endpoints por região: EU (`cloud.langfuse.com`), US, Japão e HIPAA [55].
- **Langfuse, filtro padrão:** privilegia spans relevantes para LLM (do SDK, com `gen_ai.*` e de instrumentadores conhecidos). Há mapeamento de atributos para o modelo de dados do Langfuse [55].
- **Langfuse:** OTel (Java, Go e custom) está disponível em todos os planos [47].

### 7. Avaliação, datasets e prompts

**LangSmith**

- Avaliação offline (datasets curados, antes do envio) e online (traces de produção). Traces reais podem virar exemplos de dataset [43].
- Avaliadores: regras de código, LLM-as-judge, comparação pairwise e revisão humana [43]. Avaliadores online com LLM-as-judge rodam em runs individuais e em threads multi-turn [45].
- Para agentes, o conceito de dataset inclui exemplos de seleção correta de ferramenta, formatação de argumentos e trajetória do agente [44].
- Tuned Evaluators: beta público para Plus e Enterprise nos EUA; cobrança de 0,015 LSU por execução bem-sucedida [39].
- Prompt & Context Hub: versiona prompts e "contexts" (bundles de instruções e ferramentas que definem uma skill ou um agente), promovidos entre ambientes [46].

**Langfuse**

- Avaliação online (traces ao vivo) e offline (antes do envio), com LLM-as-a-Judge, anotação humana e avaliações customizadas via API e SDK [57].
- Em todos os planos: datasets, experiments via SDK e UI, scores customizados, LLM-as-judge e annotation queues. Limites de annotation queues: Hobby 1, Core 3, Pro ilimitado [47].
- Gestão de prompts: versionamento, release management, composability, caching no SDK e playground em todos os planos. Protected labels estão no Pro (add-on Teams) e no Enterprise [47][58].
- Cache de prompts: TTL padrão de 300 segundos na configuração self-hosted [54].
- Code evaluators: dispatcher `aws-lambda` recomendado para produção self-hosted; `insecure-local` só com código totalmente confiável [54].

### 8. Privacidade e segurança

- **LangSmith:** não usa dados para treinar modelos [39]. Cloud em US ou EU [39]. Retenção: base traces por 14 dias; extended traces por 180 dias, com upgrade pago [39]. Masking: variáveis `LANGSMITH_HIDE_INPUTS` e `LANGSMITH_HIDE_OUTPUTS`; parâmetros `hide_inputs` e `hide_outputs` no Client; regras com regex; anonimizadores como Microsoft Presidio e Amazon Comprehend [42]. O anonimizador do SDK traz regex para chaves de API, tokens e credenciais [42]. O LLM Gateway oferece redação de PII e de segredos [39].
- **Langfuse:** masking aplicado antes de os dados saírem da aplicação, nos dados do SDK e nos atributos OTel [56], disponível em todos os planos [47]. Nuvem hospedada na AWS, nas regiões US, EU, Japão e HIPAA [47]. Auditorias SOC 2 Type II e ISO 27001 anuais, pen tests e DPA (GDPR) [59]. Relatórios SOC 2 e ISO 27001 a partir do Pro [47]. Isolamento por projeto, com API keys escopadas [59]. Gestão de retenção no Pro [47].

### 9. Preços, limites e cenários de nuvem (13/10/2026)

| Opção | Preço publicado | Inclusões e limites | Cabe em US$ 50/mês? |
|---|---|---|---|
| LangSmith Developer | US$ 0; 1 assento | 5k base traces/mês; depois, pay-as-you-go; preço por trace excedente não publicado na página [39] | Sim, para uso individual dentro do volume incluído |
| LangSmith Plus | US$ 39 por assento; assentos ilimitados | 10k base traces/mês; 1 Serverless Small grátis (horas não publicadas); acesso a Deployment e Engine [39] | Sobram cerca de US$ 11 para uso (cálculo) |
| LangSmith Enterprise | Sob consulta | Self-hosted e hybrid; SSO custom [39] | Não confirmado; improvável |
| LangSmith, LSU | US$ 1 por LSU [39] | Métrica comum a todos os produtos [39] | Depende do uso |
| LangSmith Deployment, Serverless Small | Runtime de 1 vCPU e 2 GiB [40]; 0,0675 LSU/vCPU-h e 0,0090 LSU/GiB-h [39] | Escala a zero quando ocioso [39] | 24×7: cerca de US$ 62/mês (cálculo: 0,0855 LSU/h × 730 h) |
| LangSmith Deployment, Dedicated Small | Runtime de 3 vCPU e 6 GiB; banco de 1 vCPU e 4 GiB [40]; banco a 0,177 LSU/vCPU-h e 0,025 LSU/GiB-h [39] | Sempre ligado [39] | 24×7: cerca de US$ 389/mês (cálculo: 0,5335 LSU/h × 730 h) |
| LangSmith Tuned Evaluators | 0,015 LSU por execução bem-sucedida [39] | Beta; Plus e Enterprise nos EUA [39] | 1.000 execuções ≈ US$ 15 (cálculo) |
| LangSmith Engine | 7 a 45 LSU por execução; roda a cada 6 horas [39] | No Plus, LSU é cobrado além da licença [39] | Ligado: 840 a 5.400 LSU/mês (cálculo); manter desligado |
| LangSmith Sandboxes | 8 LSU inclusos/mês; 0,0576 LSU/vCPU-h; 0,01845 LSU/GiB-h [39] | Até 10 sandboxes [39] | Depende do uso; relevante para execução de código |
| Langfuse Hobby | US$ 0 | 50k units/mês; 30 dias de dados; 2 usuários; 1.000 req/min de ingestão [47] | Sim |
| Langfuse Core | US$ 29/mês | 100k units incluídos; +US$ 8 por 100k; 90 dias; usuários ilimitados [47] | Sim; com US$ 50, cerca de 362,5k units/mês (cálculo) |
| Langfuse Pro | US$ 199/mês | 3 anos de dados; SOC 2/ISO 27001; BAA; gestão de retenção [47] | Não |
| Langfuse Enterprise | US$ 2.499/mês | Audit logs, SCIM, SLA [47] | Não |
| Langfuse self-hosted | Software gratuito (MIT core) [47] | Infraestrutura por conta própria [48] | Software sim; infraestrutura não confirmada |
| LangSmith self-hosted | Enterprise; preço não publicado [35][39] | Licença obrigatória [35] | Não |
| Managed Deep Agents | Não publicado nas fontes consultadas [39] | Public beta [27] | Não confirmado |

- O LangSmith conta traces, e a página define trace como uma execução que pode ter muitos passos [39]. O Langfuse conta units, que são traces, observations e scores [47]. Por isso o custo do Langfuse cresce com o número de passos de cada run.
- Exemplo ilustrativo (cálculo): um run com 1 trace e 20 observations consome 21 units no Langfuse, além dos scores.

## Interpretações

- **I1. Dependências empilhadas.** Deep Agents é construído sobre LangChain agents, que são construídos sobre LangGraph [25][26]. Adotar o Deep Agents traz junto LangChain e LangGraph. Trocar de engine depois exigiria reescrever essa camada.
- **I2. LangGraph como engine, não como dono do estado.** LangGraph oferece durable execution, HITL e persistência [24], que o projeto precisa. Mas o modelo de domínio do projeto (aprovações obrigatórias, memória em cinco níveis com regras de acesso, canais e controle de custo) é próprio. Colocá-lo dentro do grafo acoplaria o produto ao runtime. Além disso, a persistência do open source é "community contributed" [38]; o projeto teria de implementá-la ou fornecer um adaptador.
- **I3. LangChain como adaptador.** LangChain tem muitas integrações de modelo [25]. Mas os tipos da camada (messages, runnables) são específicos. Expô-los no núcleo prejudica o requisito multi-tudo.
- **I4. Deep Agents acrescenta e duplica.** Acrescenta padrões prontos: planejamento, filesystem, subagentes, compressão de contexto, skills e memória [17][26]. Duplica áreas que o projeto precisa governar com regras próprias: memória com aprovação, aprovações humanas, canais e políticas de custo. A versão 0.7.25 em Python sugere API ainda em evolução; a fonte não fala em estabilidade, então isso é leitura do autor.
- **I5. MDA contraria o requisito de operação local ou híbrida por padrão.** No deploy, instruções, skills e segredos do `.env` vão para o LangSmith [29]. O Engine pode alterar o Context Hub entre execuções [31], o que conflita com a regra de que o agente só corrige a própria memória com aprovação humana (leitura do requisito do briefing). Somam-se o beta, a divergência de região e a de licença [6][12][29][32]. O MDA serve, no máximo, como alvo de deploy opcional.
- **I6. OTel como contrato, backend como exportador.** Instrumentar com `gen_ai.*` e exportar por OTLP mantém a portabilidade (leitura do autor). O Langfuse aceita e mapeia `gen_ai.*` [55]. O exemplo do LangSmith usa nomes que não aparecem nas convenções atuais consultadas [41][65]. Não confirmei se o LangSmith normaliza esses nomes. Antes de depender de um backend, convém testar a compatibilidade.
- **I7. Escolha de backend.** O Langfuse ganha em custo na faixa inicial (US$ 0 e US$ 29), em licença do core (MIT), em OTLP nativo, em regiões UE e US, em masking de cliente disponível em todos os planos e em caminho de self-host [47][48][55][56]. O LangSmith ganha em integração automática com LangChain e LangGraph, Studio e avaliação integrada [28][41][43]. Mas é plataforma proprietária, com retenção base de 14 dias e self-host somente em Enterprise [35][39]. Para um projeto agnóstico, o Langfuse encaixa melhor.
- **I8. Self-hosting.** Nenhum dos dois cabe em 4 GB nem em US$ 50. Se o requisito de 4 GB valer para o conjunto, incluindo servidor, o self-hosting está descartado. Se valer só para o núcleo local, seria preciso um servidor separado, cujo custo não foi pesquisado. Langfuse é o único dos dois com core MIT e caminho oficial de Docker Compose [48][53].
- **I9. Privacidade.** A proteção principal é não capturar conteúdo, que é o padrão do OTel [65]. A segunda camada é a redação no processo, antes do exporter [42][56]. Masking não substitui a regra de não gravar segredos. Retenção curta reduz a exposição [39][47].
- **I10. Custo.** Os principais vetores são: units (Langfuse) ou traces e LSU (LangSmith); tokens dos avaliadores LLM-as-judge; e tokens do próprio agente. Sem GPU, um juiz local útil é improvável (leitura do autor). Por isso a avaliação com LLM depende de API paga e precisa de amostragem.
- **I11. Sucesso de ferramentas.** LangSmith documenta, para agentes, datasets com seleção de ferramenta, argumentos e trajetória [44]. Langfuse documenta scores customizados e LLM-as-judge [57]. A métrica deve combinar checagens determinísticas (argumentos válidos pelo schema, ferramenta existente, código de retorno, retries) com julgamento da escolha da ferramenta (leitura do autor).

## Hipóteses e pontos não confirmados

- **H1.** Uso individual cabe no LangSmith Developer se o volume ficar em até 5k traces/mês. Preço de trace excedente não consta na página [39].
- **H2.** Preço do MDA: não confirmado. A página de preços não lista o MDA [39]. Hipótese: cobrança pelo medidor de LSU do LangSmith Deployment, não verificada.
- **H3.** Custo real de Serverless: depende de o banco ficar ativo quando o deployment está ocioso. A página define uptime como o tempo em que o banco está ativo [39]. Os US$ 62/mês são um teto para uso 24×7, não um custo típico.
- **H4.** Horas gratuitas do "1 free Serverless (Small)" do Plus: não quantificadas [39].
- **H5.** Preço de extended traces (180 dias): não publicado [39].
- **H6.** O LangSmith normaliza atributos `gen_ai.*` atuais: não confirmado. O exemplo oficial usa nomes diferentes [41].
- **H7.** O Langfuse cobre todas as convenções GenAI atuais: não confirmado. A documentação descreve o mapeamento, sem lista completa [55].
- **H8.** "Free self-hosted" para Agent Server standalone aparece só em uma linha da tabela da FAQ [38]. A página de standalone servers não foi acessada: os caminhos testados retornaram 404 [33].
- **H9.** Licença do `managed-deepagents`: MIT nos metadados [6][12]; "not open source during the beta" no README [32]. A API do repositório retornou 403 [20]. Não resolvido.
- **H10.** Self-hosting do MDA: não encontrei documentação. Não confirmado.
- **H11.** Custo de infraestrutura para Langfuse self-hosted (VM de 4 vCPU e 16 GiB ou equivalente): não pesquisado; não há valor.
- **H12.** Escrita automática de memória pelo Engine: o blog diz que o Engine é opcional [31], e a página de preços explica como desligá-lo [39]. A configuração padrão não foi confirmada.
- **H13.** Isolamento de code evaluators no Langfuse Cloud: não verificado. A configuração de dispatcher descrita é de self-host [54].
- **H14.** Estabilidade das convenções GenAI: a documentação diz que o plano de transição "will be updated" antes de estável [67], sem data.
- **H15.** Custo de tokens dos juízes LLM: depende do modelo escolhido. Preços de modelos não foram pesquisados.

## Lacunas e conflitos

**Conflitos entre fontes**

- **C1.** Licença do MDA: PyPI e npm declaram MIT [6][12]; o README diz que o SDK não é open source durante o beta [32]. A API do repositório retornou 403 [20].
- **C2.** Região do MDA: README cita apenas a região US [32]; a documentação de deploy lista GCP EU e GCP APAC como suportados [29].
- **C3.** Blog do MDA: o texto de atualização diz public beta; o corpo diz private beta. Data de publicação: 2026-05-13 [31]. A documentação atual diz public beta [27][28][29].
- **C4.** Autenticação do LangSmith self-hosted: a FAQ diz que SSO é necessário [38]; o guia de instalação ativa basicAuth [35].
- **C5.** "Free self-hosted" na FAQ [38] versus licença e plano Enterprise para a plataforma [35][37]. A leitura mais provável é que o gratuito se aplica só ao Agent Server standalone (hipótese).
- **C6.** Postgres do Langfuse: a documentação geral diz versão 12 ou superior [50]; o v4 exige 15 ou superior [50]. Use a regra da versão que for instalar.
- **C7.** Convenções GenAI: estão em `semantic-conventions-genai` [64], e a versão tagueada está em `semantic-conventions` [67]. Há referências ao core v1.41.0 e v1.44.0 [65][67].
- **C8.** Langfuse publica requisitos "minimum" por serviço [49], mas recomenda 16 GiB para o Compose [53]. O total de 21,5 GiB é cálculo, não número oficial.
- **C9.** Versões: as "latest releases" do GitHub são de sub-pacotes [15][16].
- **C10.** Langfuse npm: `langfuse` 3.39.2 está descontinuado [11]; o SDK atual é `@langfuse/*` 5.13.1 [13][14]. Use o atual.
- **C11.** Aquisição: os comunicados da ClickHouse e do Langfuse dizem que não há mudança de licença [60][61]; reportagens confirmam a aquisição [62][63]. Os termos financeiros não foram divulgados nas fontes consultadas.
- **C12.** A página de preços do Langfuse afirma que o custo é menor que o do LangSmith em "carga representativa" [47]. É afirmação do fornecedor, não verificada; não entrou na pontuação.
- **C13.** Unidades de cobrança diferentes: LangSmith conta traces; Langfuse conta units de observations e scores [39][47]. A comparação direta de custo depende do número de passos por run.

**Lacunas (não respondidas)**

- **G1.** Preço de trace excedente e de extended trace no LangSmith; preço do MDA; preço do Enterprise.
- **G2.** Custo de VM ou nuvem para self-hosting do Langfuse; custo de LLM-as-judge.
- **G3.** Overhead de tracing e unidades por execução reais: não medidos.
- **G4.** Certificações do LangSmith (SOC 2 etc.): não verificadas nesta pesquisa.
- **G5.** Canais do MDA além do Slack (WhatsApp, Telegram, Teams, Discord, E-mail): não confirmados [68].
- **G6.** MCP, ACP e A2A: fora do escopo desta nota.
- **G7.** Mecanismo pronto de "sucesso de ferramentas" em LangSmith ou Langfuse: só foi confirmado o conceito de dataset [44].

## Recomendação preliminar

### Respostas às perguntas-chave

1. **LangGraph governa estado e fluxo?** Não como dono do modelo de domínio. Sim, como engine de execução opcional atrás de uma porta de orquestração própria, porque oferece durable execution, HITL e persistência [24]. Confiança média. Validar com um spike que troque a engine.
2. **LangChain é biblioteca ou adaptador?** Adaptador. Usar para integrações de modelos e ferramentas, sem expor tipos LangChain em APIs públicas, plugins ou formato de eventos. Confiança média-alta, dado o requisito multi-tudo.
3. **DeepAgents acrescenta ou duplica?** Acrescenta planejamento, filesystem, subagentes, compressão de contexto, skills e memória [17][26]. Duplica memória, skills e aprovação, que o projeto deve implementar com regras próprias. Usar como referência de padrões e, se útil, como agente plugável, sem deixá-lo dono do estado. Confiança média.
4. **Managed Deep Agents entra no núcleo?** Não. Motivos: beta, SDK fechado durante o beta, dados e segredos enviados ao LangSmith, Engine capaz de alterar memória entre execuções e conflitos de região e licença [27–32]. Pode virar alvo opcional de deploy quando houver GA, preço e licença confirmados. Confiança alta para o escopo atual.
5. **LangSmith ou Langfuse?** Langfuse Cloud como backend inicial: custo mais baixo na faixa grátis e no Core, core MIT, OTLP nativo, regiões UE e US, masking de cliente em todos os planos e caminho de self-host [47][48][55][56]. LangSmith Developer como comparação, sobretudo se o projeto usar LangChain ou LangGraph e quiser tracing automático e Studio [28][41]. Nenhum dos dois deve ser a única cópia dos traces; manter exportação local própria (sugestão do autor). Confiança média.
6. **Self-hosting é viável?** Não nas restrições atuais. LangSmith: não, por ser Enterprise e exigir 16 GB ou mais. Langfuse: não com 4 GB; o Compose recomenda 16 GiB [53]. Reavaliar quando houver servidor dedicado no orçamento. Langfuse é o único dos dois com core MIT para esse caminho.
7. **Como instrumentar de forma portável?** Instrumentar o harness com OTel GenAI (`gen_ai.*`), com nomes de span e atributos das convenções em Development, fixar a versão adotada e usar `OTEL_SEMCONV_STABILITY_OPT_IN` na migração [65–67]. Exportar por OTLP para Langfuse e, se necessário, para LangSmith via Collector [41][55]. Não depender só da auto-instrumentação de um framework.
8. **Como evitar vazamento?** (1) Conteúdo desligado por padrão. (2) Redação no processo, antes do exporter: Langfuse masking [56]; LangSmith `hide_inputs`/`hide_outputs`, regex e anonimizadores [42]. (3) Segredos nunca entram em span. (4) Conteúdo, quando necessário, fica em armazenamento externo com referência no span [65]. (5) Retenção curta: 14 dias base no LangSmith [39]; 30 dias no Hobby e 90 no Core do Langfuse [47]. (6) Avaliadores que chamam LLM recebem conteúdo já redigido e só rodam após aprovação humana, conforme o briefing.

### Pontuação dos critérios

Escala de 1 a 5. Em adequação, maturidade, extensibilidade, portabilidade e segurança, 5 é melhor. Em custo e O&M, 5 significa menor custo e menor esforço. Os valores são julgamento do autor com base nas fontes; não são medição nem têm pesos.

| Opção (pergunta de arquitetura) | Adequação funcional | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M (5 = menos esforço) |
|---|---|---|---|---|---|---|---|
| LangGraph como engine de estado e fluxo ("governa estado e fluxo?") | 5 | 4 | 4 | 3 | 4 | 5 | 3 |
| LangChain como adaptador ("biblioteca ou adaptador?") | 4 | 5 | 5 | 3 | 3 | 5 | 3 |
| Deep Agents como harness ("acrescenta ou duplica?") | 4 | 3 | 4 | 3 | 3 | 5 | 3 |
| Managed Deep Agents ("hospedar o agente?") | 3 | 2 | 3 | 2 | 2 | 2 | 5 |
| LangSmith Cloud ("observabilidade e avaliação gerenciadas?") | 5 | 5 | 3 | 2 | 3 | 4 | 5 |
| LangSmith self-hosted ("self-hosting viável?") | 5 | 4 | 3 | 2 | 4 | 1 | 1 |
| Langfuse Cloud, Hobby e depois Core ("observabilidade gerenciada?") | 5 | 4 | 4 | 4 | 4 | 5 | 5 |
| Langfuse self-hosted, core MIT ("self-hosting viável?") | 5 | 4 | 5 | 5 | 4 | 1 | 2 |
| OpenTelemetry GenAI ("instrumentação portável?") | 4 | 3 | 5 | 5 | 4 | 5 | 4 |

Justificativas curtas:

- **LangGraph:** durable execution, HITL e persistência [24]; checkpointer não nativo no open source [38]; MIT [2].
- **LangChain:** escala e licença MIT [1][15]; portabilidade média pelos tipos próprios (I3).
- **Deep Agents:** pré-1.0 em Python [3]; MIT [3].
- **Managed Deep Agents:** beta [27]; SDK fechado durante o beta [32]; preço não publicado [39]; instruções, skills e segredos enviados ao LangSmith [29].
- **LangSmith Cloud:** cobertura completa [39]; plataforma proprietária [35]; Developer gratuito e Plus a US$ 39 por assento [39].
- **LangSmith self-hosted:** Enterprise e 16 vCPU ou mais recomendados [35][37].
- **Langfuse Cloud:** Hobby gratuito e Core a US$ 29 [47]; core MIT [21]; OTLP [55].
- **Langfuse self-hosted:** 16 GiB recomendados e cinco componentes [48][49][53]; MIT [21].
- **OTel GenAI:** status Development [65][66]; conteúdo opt-in [65].

**Veredito:** Langfuse Cloud com OTel GenAI. LangGraph como engine opcional, LangChain como adaptador e Deep Agents como referência. MDA e LangSmith self-hosted ficam fora do núcleo.

### Plano preliminar de avaliação (proposta, não validada)

**Offline**

- Datasets: casos reais redigidos extraídos de traces, mais casos sintéticos e adversariais (prompt injection, exfiltração, ação sem aprovação) [43].
- Experiments a cada mudança de prompt, modelo ou ferramenta, com comparação pairwise [44].
- Avaliadores: determinísticos (argumentos válidos pelo schema, ferramenta existente, código de retorno, retries); regras de código; LLM-as-judge com rubrica; revisão humana em annotation queue [43][47].
- Métricas: qualidade (média por critério); regressão (queda acima do limiar bloqueia a mudança); custo (tokens e units por caso); latência (p50 e p95 por span); segurança (taxa de violação nos casos adversariais); sucesso de ferramentas (chamadas válidas, execuções sem erro, recuperação após erro, rejeições humanas).
- Gate em CI, com limiares versionados.

**Online**

- Amostragem de traces de produção para LLM-as-judge [45][57]. A taxa de amostragem é decisão de orçamento; não há valor nas fontes.
- Alertas de gasto [47], de latência e de erros.
- Aprovações e rejeições humanas como rótulos [47].
- Detecção de PII e de segredos nas saídas e em ferramentas com efeito externo.
- Orçamento separado para avaliadores, com limite diário.

### Próximos passos (não executados)

1. Montar o exporter OTel GenAI do harness, enviar a um projeto Langfuse Hobby e medir units por run.
2. Enviar o mesmo trace ao LangSmith via OTel e comparar os atributos recebidos (H6).
3. Resolver a licença do `managed-deepagents` (C1).
4. Pedir à LangChain os preços não publicados (G1).
5. Medir o custo com Engine desligado e com avaliação LLM amostrada.

## Fontes

| # | Título | Organização | URL | Data de publicação ou metadado | Acesso |
|---|---|---|---|---|---|
| 1 | langchain (metadados do pacote) | PyPI | https://pypi.org/pypi/langchain/json | versão 1.4.5; upload 2026-10-12 (UTC) | 13/10/2026 |
| 2 | langgraph (metadados do pacote) | PyPI | https://pypi.org/pypi/langgraph/json | versão 1.2.15; upload 2026-10-12 (UTC) | 13/10/2026 |
| 3 | deepagents (metadados do pacote) | PyPI | https://pypi.org/pypi/deepagents/json | versão 0.7.25; upload 2026-10-14 (UTC) | 13/10/2026 |
| 4 | langsmith (metadados do pacote) | PyPI | https://pypi.org/pypi/langsmith/json | versão 0.14.8; upload 2026-10-13 (UTC) | 13/10/2026 |
| 5 | langfuse (metadados do pacote) | PyPI | https://pypi.org/pypi/langfuse/json | versão 4.17.0; upload 2026-10-05 | 13/10/2026 |
| 6 | managed-deepagents (metadados do pacote) | PyPI | https://pypi.org/pypi/managed-deepagents/json | versão 0.9.1; upload 2026-10-13 (UTC) | 13/10/2026 |
| 7 | langchain (registro) | npm | https://registry.npmjs.org/langchain/latest | versão 1.5.16 | 13/10/2026 |
| 8 | @langchain/langgraph (registro) | npm | https://registry.npmjs.org/@langchain/langgraph/latest | versão 1.5.0 | 13/10/2026 |
| 9 | deepagents (registro) | npm | https://registry.npmjs.org/deepagents/latest | versão 1.15.0 | 13/10/2026 |
| 10 | langsmith (registro) | npm | https://registry.npmjs.org/langsmith/latest | versão 0.10.13 | 13/10/2026 |
| 11 | langfuse (registro) | npm | https://registry.npmjs.org/langfuse/latest | versão 3.39.2; descrição indica cliente v3 descontinuado | 13/10/2026 |
| 12 | managed-deepagents (registro) | npm | https://registry.npmjs.org/managed-deepagents/latest | versão 0.9.1 | 13/10/2026 |
| 13 | @langfuse/tracing (registro) | npm | https://registry.npmjs.org/@langfuse/tracing/latest | versão 5.13.1 | 13/10/2026 |
| 14 | @langfuse/otel (registro) | npm | https://registry.npmjs.org/@langfuse/otel/latest | versão 5.13.1 | 13/10/2026 |
| 15 | langchain-ai/langchain (repositório e última release) | GitHub API | https://api.github.com/repos/langchain-ai/langchain e /releases/latest | push 2026-10-13; release langchain-core==1.6.10 (2026-10-12) | 13/10/2026 |
| 16 | langchain-ai/langgraph (repositório e última release) | GitHub API | https://api.github.com/repos/langchain-ai/langgraph e /releases/latest | push 2026-10-14 (UTC); release langgraph-cli==0.4.34 (2026-10-13) | 13/10/2026 |
| 17 | langchain-ai/deepagents (repositório e última release) | GitHub API | https://api.github.com/repos/langchain-ai/deepagents e /releases/latest | push 2026-10-14 (UTC); release deepagents==0.7.25 (2026-10-14 UTC) | 13/10/2026 |
| 18 | langchain-ai/langsmith-sdk (repositório e última release) | GitHub API | https://api.github.com/repos/langchain-ai/langsmith-sdk e /releases/latest | release v0.14.8 (2026-10-13 UTC) | 13/10/2026 |
| 19 | langfuse/langfuse (repositório e última release) | GitHub API | https://api.github.com/repos/langfuse/langfuse e /releases/latest | release v4.58.0 (2026-10-13 UTC); licença reportada como NOASSERTION | 13/10/2026 |
| 20 | langchain-ai/managed-deepagents (repositório) | GitHub API | https://api.github.com/repos/langchain-ai/managed-deepagents | HTTP 403; não verificado | 13/10/2026 |
| 21 | LICENSE do Langfuse | Langfuse (GitHub raw) | https://raw.githubusercontent.com/langfuse/langfuse/main/LICENSE | "Copyright (c) 2023-2026 ClickHouse, Inc."; MIT fora de ee/ | 13/10/2026 |
| 22 | ee/LICENSE do Langfuse | Langfuse (GitHub raw) | https://raw.githubusercontent.com/langfuse/langfuse/main/ee/LICENSE | Enterprise License; core MIT | 13/10/2026 |
| 23 | README do Langfuse | Langfuse (GitHub raw) | https://raw.githubusercontent.com/langfuse/langfuse/main/README.md | "since January 2026 we're part of ClickHouse" | 13/10/2026 |
| 24 | LangGraph overview | LangChain (docs) | https://docs.langchain.com/oss/python/langgraph/overview | data não exibida | 13/10/2026 |
| 25 | LangChain overview | LangChain (docs) | https://docs.langchain.com/oss/python/langchain/overview | data não exibida | 13/10/2026 |
| 26 | Deep Agents overview | LangChain (docs) | https://docs.langchain.com/oss/python/deepagents/overview | data não exibida | 13/10/2026 |
| 27 | Managed Deep Agents overview | LangChain (docs) | https://docs.langchain.com/langsmith/python/managed-deep-agents-overview | data não exibida; public beta | 13/10/2026 |
| 28 | Managed Deep Agents quickstart | LangChain (docs) | https://docs.langchain.com/langsmith/python/managed-deep-agents-quickstart | data não exibida; public beta | 13/10/2026 |
| 29 | Deploy a Managed Deep Agent | LangChain (docs) | https://docs.langchain.com/langsmith/python/managed-deep-agents-deploy | data não exibida; tabela de regiões | 13/10/2026 |
| 30 | Define a Managed Deep Agent | LangChain (docs) | https://docs.langchain.com/langsmith/python/managed-deep-agents-agent-definition | data não exibida | 13/10/2026 |
| 31 | Managed Deep Agents: the fastest way to ship a production deep agent | LangChain (blog) | https://www.langchain.com/blog/introducing-managed-deep-agents | publicado 2026-05-13 (metadado da busca); texto com "Update 8/7" | 13/10/2026 |
| 32 | langchain-ai/managed-deepagents (README) | LangChain (GitHub) | https://github.com/langchain-ai/managed-deepagents | data não exibida | 13/10/2026 |
| 33 | Self-hosted LangSmith | LangChain (docs) | https://docs.langchain.com/langsmith/self-hosted | data não exibida | 13/10/2026 |
| 34 | Minimum versions for self-hosting dependencies | LangChain (docs) | https://docs.langchain.com/langsmith/self-host-dependency-versions | data não exibida | 13/10/2026 |
| 35 | Self-host LangSmith on Kubernetes | LangChain (docs) | https://docs.langchain.com/langsmith/kubernetes | data não exibida | 13/10/2026 |
| 36 | Deploy LangSmith with Terraform | LangChain (docs) | https://docs.langchain.com/langsmith/self-host-terraform | data não exibida | 13/10/2026 |
| 37 | Deploy self-hosted full platform | LangChain (docs) | https://docs.langchain.com/langsmith/deploy-self-hosted-full-platform | data não exibida | 13/10/2026 |
| 38 | FAQ | LangChain (docs) | https://docs.langchain.com/langsmith/faq | data não exibida | 13/10/2026 |
| 39 | Pricing | LangChain (site) | https://www.langchain.com/pricing | data não exibida | 13/10/2026 |
| 40 | Cloud platform features (sizes) | LangChain (docs) | https://docs.langchain.com/langsmith/cloud-platform-features | data não exibida | 13/10/2026 |
| 41 | Trace with OpenTelemetry | LangChain (docs) | https://docs.langchain.com/langsmith/trace-with-opentelemetry | data não exibida | 13/10/2026 |
| 42 | Prevent logging of sensitive data in traces | LangChain (docs) | https://docs.langchain.com/langsmith/mask-inputs-outputs | data não exibida | 13/10/2026 |
| 43 | LangSmith Evaluation | LangChain (docs) | https://docs.langchain.com/langsmith/evaluation | data não exibida | 13/10/2026 |
| 44 | Evaluation concepts | LangChain (docs) | https://docs.langchain.com/langsmith/evaluation-concepts | data não exibida | 13/10/2026 |
| 45 | Set up LLM-as-a-judge online evaluators | LangChain (docs) | https://docs.langchain.com/langsmith/online-evaluations | data não exibida | 13/10/2026 |
| 46 | Prompt & Context Hub | LangChain (docs) | https://docs.langchain.com/langsmith/prompt-engineering | data não exibida | 13/10/2026 |
| 47 | Pricing | Langfuse (site) | https://langfuse.com/pricing | data não exibida | 13/10/2026 |
| 48 | Self-host Langfuse | Langfuse (docs) | https://langfuse.com/self-hosting | data não exibida | 13/10/2026 |
| 49 | Scaling (minimum infrastructure requirements) | Langfuse (docs) | https://langfuse.com/self-hosting/configuration/scaling | data não exibida | 13/10/2026 |
| 50 | Postgres Database | Langfuse (docs) | https://langfuse.com/self-hosting/deployment/infrastructure/postgres | data não exibida | 13/10/2026 |
| 51 | Cache (Redis/Valkey) | Langfuse (docs) | https://langfuse.com/self-hosting/deployment/infrastructure/cache | data não exibida | 13/10/2026 |
| 52 | Application Containers | Langfuse (docs) | https://langfuse.com/self-hosting/deployment/infrastructure/containers | data não exibida | 13/10/2026 |
| 53 | Docker Compose Deployment | Langfuse (docs) | https://langfuse.com/self-hosting/deployment/docker-compose | data não exibida; versão v4 | 13/10/2026 |
| 54 | Configuration | Langfuse (docs) | https://langfuse.com/self-hosting/configuration | data não exibida | 13/10/2026 |
| 55 | OpenTelemetry (OTEL) for LLM Observability | Langfuse (docs) | https://langfuse.com/integrations/native/opentelemetry | data não exibida | 13/10/2026 |
| 56 | Masking sensitive LLM data | Langfuse (docs) | https://langfuse.com/docs/observability/features/masking | data não exibida | 13/10/2026 |
| 57 | Evaluation of LLM Applications (overview) | Langfuse (docs) | https://langfuse.com/docs/evaluation/overview | data não exibida | 13/10/2026 |
| 58 | Prompt Management (overview) | Langfuse (docs) | https://langfuse.com/docs/prompt-management/overview | data não exibida | 13/10/2026 |
| 59 | Security & Compliance | Langfuse (site) | https://langfuse.com/security | data não exibida | 13/10/2026 |
| 60 | ClickHouse welcomes Langfuse | ClickHouse (blog) | https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability | data não exibida no trecho; anúncio em jan/2026 (ver 62) | 13/10/2026 |
| 61 | Langfuse joins ClickHouse | Langfuse (blog) | https://langfuse.com/blog/joining-clickhouse | data não exibida no trecho; jan/2026 | 13/10/2026 |
| 62 | Database maker ClickHouse raises $400M, acquires AI observability startup Langfuse | SiliconANGLE | https://siliconangle.com/2026/01/16/database-maker-clickhouse-raises-400m-acquires-ai-observability-startup-langfuse/ | 2026-01-16 | 13/10/2026 |
| 63 | ClickHouse buys Langfuse as data platforms race to own the AI feedback loop | InfoWorld | https://www.infoworld.com/article/4118621/clickhouse-buys-langfuse-as-data-platforms-race-to-own-the-ai-feedback-loop.html | 2026-01-19 | 13/10/2026 |
| 64 | semantic-conventions-genai (README) | OpenTelemetry (GitHub) | https://github.com/open-telemetry/semantic-conventions-genai | data não exibida | 13/10/2026 |
| 65 | Semantic conventions for generative client AI spans (main) | OpenTelemetry (GitHub) | https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md | status Development; referências ao core v1.44.0 | 13/10/2026 |
| 66 | Semantic Conventions for GenAI agent and framework spans (main) | OpenTelemetry (GitHub) | https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md | status Development | 13/10/2026 |
| 67 | Semantic conventions for generative client AI spans (v1.41.0) | OpenTelemetry (GitHub) | https://github.com/open-telemetry/semantic-conventions/blob/v1.41.0/docs/gen-ai/gen-ai-spans.md | plano de transição com OTEL_SEMCONV_STABILITY_OPT_IN | 13/10/2026 |
| 68 | Managed Deep Agents runtime | LangChain (docs) | https://docs.langchain.com/langsmith/python/managed-deep-agents-runtime | data não exibida | 13/10/2026 |
