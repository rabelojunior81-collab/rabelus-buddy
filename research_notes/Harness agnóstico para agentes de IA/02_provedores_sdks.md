# 02 — Provedores, SDKs, preços e roteamento

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. Preços em USD por 1 milhão de tokens (MTok), salvo indicação. "Cálculo" indica aritmética sobre valores publicados. "Não confirmado" indica informação ausente nas fontes consultadas. Esta nota trata de preços, limites e roteamento; a cobertura de linguagens dos SDKs e a escolha de stack estão na nota 09.

## Resumo

- **Preços de referência (14/10/2026).** Camada barata: Claude Haiku 5.5 a US$ 0,10/0,50 (prompts até 100k), Gemini 3.8 Flash a US$ 0,75/3,75 com camada gratuita, gpt-5-nano a US$ 0,05/0,40. Camada de trabalho: Claude Sonnet 5.5 a US$ 2/10, gpt-6.1-sol a US$ 2/10, Gemini 4 Argon a US$ 2/10 (promocional até 30/11/2026). Topo: gpt-6-astra e Claude Fable 5.1 a US$ 10/50 [1][2][3].
- **Orçamento.** Com US$ 50/mês, o consumo confortável usa modelos da camada barata e trabalho. Exemplo (cálculo): 20 milhões de tokens de entrada e 4 milhões de saída em Claude Sonnet 5.5 custam US$ 80; em Haiku 5.5, US$ 4; em Gemini 3.8 Flash, US$ 30; em gpt-5-nano, US$ 2,60. O orçamento permite ordem de grandeza típica de uso individual, desde que o modelo principal não seja da camada de topo [1][2][3].
- **Busca web.** OpenAI e Anthropic cobram US$ 10 por 1.000 buscas; Google cobra US$ 14 por 1.000 após 5.000 gratuitas por mês (compartilhado entre modelos Gemini 3+). Anthropic não cobra extra pelo web fetch [1][2][3].
- **Execução de código.** Anthropic: execução de código grátis quando usada com web search ou web fetch; sem essas ferramentas, 1.550 horas grátis por mês e US$ 0,05/hora depois. OpenAI: Hosted Shell e Code Interpreter são cobrados por sessão de 20 minutos (US$ 0,03 a US$ 1,92 por contêiner, conforme o tamanho) [1][2].
- **Roteamento.** OpenRouter não tem markup sobre o preço do provedor e cobra 5,5% (mínimo US$ 0,80) na compra de créditos; LiteLLM (MIT) oferece gateway com orçamento, limites de taxa, MCP Gateway e Auto Router. Para um único usuário, ambos são opcionais [4][5].
- **Diferenças não abstraíveis.** Tokenizador novo da Anthropic gera ~30% mais tokens para o mesmo texto (modelos 4.7+); cobrança de cache difere (OpenAI cache write 1,25x, Anthropic 5 min 1,25x e 1 h 2x, Google Argon só cache implícito); preço por contexto longo tem estruturas diferentes (OpenAI divide em 272k; Anthropic inclui 1M no preço padrão, exceto Haiku 5.5; Google divide em 200k); a camada gratuita do Google usa conteúdo para melhorar produtos, a paga não [1][2][3].

## Fatos verificados

### 1. Preços por provedor (acesso em 14/10/2026)

**OpenAI** (Standard, por 1M tokens) [1]:

| Modelo | Entrada | Saída | Observação |
|---|---|---|---|
| gpt-6-astra | US$ 10 (curto) / US$ 20 (>272k) | US$ 50 / US$ 75 | Cache: entrada US$ 1,00; cache write US$ 12,50 |
| gpt-6.1-sol | US$ 2 / US$ 4 | US$ 10 / US$ 15 | Cache: US$ 0,10; write US$ 2,50. Preço promocional do 5.6-sol até 21/11/2026 |
| gpt-6-luna | US$ 0,10 / US$ 0,20 | US$ 0,50 / US$ 0,75 | Camada barata |
| gpt-5.6-sol | US$ 4 / US$ 8 | US$ 20 / US$ 30 | |
| gpt-5.5 | US$ 5 / US$ 10 | US$ 30 / US$ 45 | |
| gpt-5.4 | US$ 2,50 / US$ 5 | US$ 15 / US$ 22,50 | |
| gpt-5.1 / gpt-5 | US$ 1,25 | US$ 10 | Cache: US$ 0,125 |
| gpt-5-mini | US$ 0,25 | US$ 2 | |
| gpt-5-nano | US$ 0,05 | US$ 0,40 | Cache: US$ 0,005 |
| gpt-4.1 | US$ 2 | US$ 8 | |
| gpt-4o-mini | US$ 0,15 | US$ 0,60 | |
| gpt-5.3-codex | US$ 1,75 | US$ 14 | Fast: US$ 3,50/28 |

- Modalidades: Standard; Batch (≈50% de desconto); Flex (≈50%, maior latência); Fast (~2x, menor latência); Ultrafast (~6x). Entrada em cache custa 10% e cache write 1,25x. Endpoints regionais (data residency) têm 10% de acréscimo para modelos lançados a partir de 05/03/2026; FedRAMP também 10% [1].
- Ferramentas: Web search US$ 10 por 1.000 chamadas (conteúdo de busca cobrado como tokens do modelo); Hosted Shell e Code Interpreter por sessão de 20 minutos: US$ 0,03 (1 GB), 0,12 (4 GB), 0,48 (16 GB), 1,92 (64 GB) por contêiner; File search: armazenamento US$ 0,10/GB/dia (1 GB grátis) e US$ 2,50/1.000 chamadas; embeddings: text-embedding-3-small US$ 0,02 e 3-large US$ 0,13 [1].
- A plataforma de fine-tuning está sendo encerrada para novos usuários [1].

**Anthropic** (por 1M tokens) [2]:

| Modelo | Entrada | Saída | Cache hit | Observação |
|---|---|---|---|---|
| Claude Fable 5.1 / Mythos 5.1 | US$ 10 | US$ 50 | US$ 0,25 (0,025x) | Disponibilidade limitada (programas de verificação) |
| Claude Opus 5.5 | US$ 4 | US$ 20 | US$ 0,20 (0,05x) | |
| Claude Opus 5 / 4.8 | US$ 5 | US$ 25 | US$ 0,50 (0,1x) | |
| Claude Sonnet 5.5 | US$ 2 | US$ 10 | US$ 0,10 (0,05x) | |
| Claude Sonnet 5 | US$ 2 | US$ 10 | US$ 0,20 | Preço promocional tornado padrão |
| Claude Haiku 5.5 | US$ 0,10 (≤100k) / US$ 0,50 (>100k) | US$ 0,50 / US$ 2,50 | US$ 0,01 / US$ 0,05 | |
| Claude Haiku 4.5 | US$ 1 | US$ 5 | US$ 0,10 | |

- Cache: escrita de 5 minutos 1,25x; de 1 hora 2x; leitura 0,1x (0,025x em Fable/Mythos 5.1; 0,05x em Opus 5.5 e Sonnet 5.5). Batch API com 50% de desconto [2].
- Modelos 4.6+ (exceto Haiku 5.5) incluem janela de 1M de tokens no preço padrão. Haiku 5.5 é cobrado por faixa de tamanho de prompt [2].
- Modelos 4.7+ usam tokenizador novo, com ≈30% mais tokens para o mesmo texto [2].
- Fast mode (research preview): Opus 5.5 a US$ 8/40; Opus 5 e 4.8 a US$ 10/50 [2].
- `inference_geo: "us"` aplica multiplicador 1,1x [2].
- Web search: US$ 10 por 1.000 buscas. Web fetch: sem custo extra além dos tokens [2].
- Execução de código: grátis quando usada com web search ou web fetch; sem essas ferramentas, mínimo de 5 minutos, 1.550 horas grátis por mês por organização, depois US$ 0,05/hora/contêiner [2].
- Claude Managed Agents: tokens pelos preços de modelo mais US$ 0,08 por hora de sessão em estado `running` [2].
- Uso de ferramentas adiciona tokens fixos de system prompt (ex.: Opus 5.5, 286 tokens com `auto`; 406 com `tool`). Bash tool: +325 tokens (4.7+); text editor: +974 tokens [2].
- Novos usuários recebem pequenos créditos grátis [2].

**Google Gemini** (por 1M tokens) [3]:

| Modelo | Entrada (paga) | Saída (paga) | Camada gratuita |
|---|---|---|---|
| Gemini 4 Argon | US$ 2 até 30/11/2026; US$ 4 a partir de 01/12/2026 | US$ 10; US$ 20 a partir de 01/12/2026 | Não disponível |
| Gemini 3.8 Flash | US$ 0,75 até 31/12/2026; US$ 1,50 a partir de 01/01/2027 | US$ 3,75; US$ 7,50 a partir de 01/01/2027 | Sim |
| Gemini 3.5 Flash-Lite | US$ 0,30 | US$ 2,50 | Sim |
| Gemini 3.1 Pro Preview | US$ 2 (≤200k) / US$ 4 (>200k) | US$ 12 / US$ 18 | Não |

- Batch e Flex com 50% de desconto; Priority ~1,8x [3].
- Grounding com Google Search: 5.000 consultas gratuitas por mês (compartilhadas entre modelos Gemini 3 e posteriores), depois US$ 14 por 1.000 [3].
- Cache de contexto em Argon: só implícito (US$ 0,10; US$ 0,20 a partir de dezembro/2026) [3].
- Camada gratuita usa conteúdo para melhorar produtos; camada paga não [3].
- Há endpoint de compatibilidade OpenAI [3].

### 2. Limites de taxa

- **Google:** limites em RPM, TPM e RPD, por projeto. Limites por gasto em janela de 10 minutos: Tier 1 US$ 10, Tier 2 US$ 50, Tier 3 US$ 200; camada gratuita não tem esse limite. Tiers: Free; Tier 1 (conta de faturamento vinculada); Tier 2 (US$ 100 pagos + 3 dias); Tier 3 (US$ 1.000 + 30 dias). Priority consome 0,3x do limite padrão. Batch: até 100 jobs concorrentes, arquivo de até 2 GB [3].
- **OpenAI e Anthropic:** as páginas de preços mencionam tiers de uso (Anthropic: Start, Build, Scale) sem valores na página pesquisada. Detalhamento: não confirmado nesta rodada [2].

### 3. Runtimes locais

- Ollama no Windows: aplicação nativa; Windows 10 22H2 ou superior; não exige administrador; ~4 GB só para o binário; modelos em `%HOMEPATH%\.ollama`, com realocação por `OLLAMA_MODELS`; API em `http://localhost:11434`; há zip standalone para embutir ou rodar como serviço [6].
- Modelos na biblioteca Ollama com parâmetros compatíveis com 4 GB de RAM (Q4): gemma4 e2b/e4b, qwen3.5 0,8b/2b/4b, llama3.2 1b/3b, smollm2 135m/360m/1,7b, nemotron-3-nano 4b, qwen3 0,6b/1,7b, granite4 350m/1b/3b, lfm2.5-thinking 1,2b, ministral-3 3b. Modelos de 7b+ (qwen3 7b/8b, llama3.1 8b, deepseek-r1 7b/8b) exigem 6 GB ou mais de RAM [7]. Tempo de inferência em CPU de 4 GB: não medido.

### 4. Roteamento e gateway

- **OpenRouter:** API compatível com OpenAI; sem markup sobre o preço do provedor; taxa de 5,5% (mínimo US$ 0,80) na compra de créditos por cartão (5% em cripto); BYOK com franquia de US$ 25 mil/mês por lista de preço no pay-as-you-go, acima disso 5%; fallback automático para o próximo provedor; zero logging de prompts e completions por padrão (opt-in com 1% de desconto); provedores que registram dados não são usados sem opt-in; modelos gratuitos: 50 req/dia (1.000 com ao menos US$ 10 em créditos) [4].
- **LiteLLM:** licença MIT; AI Gateway (Python SDK, proxy, orçamento, limites de taxa, spend tracking), MCP Gateway, Agent Gateway (A2A), Auto Router; Rust AI Gateway em beta; SOC 2 Type II; página de modelos e preços pública (models.litellm.ai); integração com a API de Skills da Anthropic [5].

## Interpretações

- **I1. Camadas de custo.** O projeto pode operar com três camadas: barata (Haiku 5.5, gpt-5-nano, Gemini 3.5 Flash-Lite, 3.8 Flash) para classificação, resumo e tarefas mecânicas; trabalho (Sonnet 5.5, gpt-6.1-sol, Gemini 4 Argon) para o loop principal; topo (Opus 5.5, gpt-6-astra, Fable 5.1) só para problemas difíceis, com aprovação de custo. Com US$ 50/mês, a camada de topo precisa de orçamento fechado por tarefa.
- **I2. Cálculo de referência (exemplo ilustrativo).** 1.000 interações de agente por mês, cada uma com 30k tokens de contexto e 2k de saída (cálculo sobre preços publicados): Sonnet 5.5 = 30M entrada + 2M saída = US$ 80. Haiku 5.5 = US$ 4. Gemini 3.8 Flash = US$ 30. gpt-5.1 = US$ 57,50. Com cache de acerto a 0,05x, Sonnet 5.5 cai para ~US$ 10 por 1.000 interações se 80% do contexto for cache hit (cálculo). Ou seja: o orçamento de US$ 50/mês viabiliza a camada de trabalho com cache, e é confortável na camada barata.
- **I3. Busca web no orçamento.** US$ 10/1.000 buscas (OpenAI e Anthropic) consome o orçamento rápido: 1.000 buscas = 20% do orçamento mensal. Regra: pesquisa web exige aprovação (inferido do requisito de leitura livre só no workspace) e deveria ter limites por sessão e por mês.
- **I4. OpenAI como provedor de execução.** Hosted Shell e Code Interpreter resolvem o workspace sem contêiner local, ao custo de envio de código para a OpenAI. Para o perfil local com 4 GB, é alternativa viável ao Docker; decisão de privacidade do usuário.
- **I5. Google como opção de baixo custo.** A camada gratuita do Gemini 3.8 Flash é a única dos três provedores com uso gratuito, mas usa conteúdo para melhorar produtos. Para o harness, isso é inadequado para dados sensíveis; usar só com modelos e dados não sensíveis, ou na camada paga.
- **I6. Orquestrador próprio ou gateway pronto.** OpenRouter resolve multi-provedor, fallback e preço único, mas adiciona dependência e taxa de compra de créditos. LiteLLM (MIT) permite gateway próprio com orçamento e limites. Para manter o harness agnóstico, o provedor deve ser trocável: adaptador próprio fino por provedor, com gateway opcional. Não recomendar gateway como dono do estado.
- **I7. Tokenizador.** A diferença de ~30% de tokens da Anthropic quebra qualquer estimativa de custo em tokens genéricos. O harness deve estimar custo com o tokenizador do provedor ou com endpoint de contagem de tokens, não com aproximação própria.
- **I8. Cache como requisito de arquitetura.** A estrutura de preços favorece fortemente prefixos de prompt estáveis e longos. O design de prompt (identidade do agente, ferramentas, histórico recente) deve ser ordenado para maximizar o aproveitamento de cache — o que conflita com identidade dinâmica por projeto, que deve entrar como bloco menor e variável.

## Hipóteses e pontos não confirmados

- H1. Consumo e interfaces reais do projeto: não medidos; os cálculos acima são ilustrativos.
- H2. Limites de taxa atuais de OpenAI e Anthropic: não confirmados nesta rodada.
- H3. Preço por token excedente do OpenRouter acima da franquia BYOK: confirmado apenas o percentual (5%), não o valor base.
- H4. Latência e taxa de tokens por segundo de modelos pequenos em CPU comum de 4 GB: não medidas.
- H5. Se Ollama/llama.cpp expõem ferramentas (function calling) de forma confiável nos modelos citados: não verificado.
- H6. Retenção de dados por provedor (políticas específicas): não confirmada nesta rodada; a página do Gemini confirma apenas o uso na camada gratuita [3].
- H7. Custos de embedding via API (OpenAI US$ 0,02/1M confirmado; Gemini e Anthropic: não pesquisados).

## Lacunas e conflitos

- Preços promocionais com expiração (gpt-6.1-sol até 21/11/2026; Gemini 4 Argon a partir de 01/12/2026 dobra; Gemini 3.8 Flash a partir de 01/01/2027 dobra). Qualquer estimativa precisa de data de referência.
- Conflito aparente de nomenclatura: a página do Gemini lista "Gemini 4 Argon" como modelo de raciocínio; o nome do repositório do usuário também é "gemini-argon". São coisas distintas: um é modelo de API do Google; o outro é o nome da pasta do projeto.
- A página de preços da Anthropic aponta claude.com/pricing como fonte mais atual; os valores usados são da documentação da plataforma.
- Não foram pesquisados: preço do Claude Foundry/Azure, Bedrock e Vertex (páginas dos próprios clouds), limites de conteúdo (TPM por modelo) da OpenAI e da Anthropic.

## Recomendação preliminar

### Decisões

1. **Adaptadores próprios por provedor** com interface comum mínima (mensagens, ferramentas, streaming, uso, cancelamento) e camada de capacidades declaradas (tool calling, saída estruturada, visão, cache, busca nativa). Nada de expor tipos de SDK no núcleo.
2. **Três camadas de modelo** com roteamento por tarefa e orçamento fechado por camada; aprovação humana para gastar acima do limite (requisito do usuário).
3. **Cache obrigatório desde o início**: prefixo estático (identidade, ferramentas, políticas) e sufixo variável (histórico, contexto de projeto). Escolher provedores cujo cache tenha semântica estável.
4. **Busca web e execução remota de código** como ferramentas opcionais, desligadas por padrão, com aprovação (requisito do usuário) e orçamento próprio.
5. **OpenRouter ou LiteLLM como opção de deploy**, não como dependência do núcleo. Se usados, atrás de adaptador.
6. **Modelos locais (Ollama) como preparação**: endpoint OpenAI-compatível já existente no Ollama; o adaptador local pode ser escrito sem mudar a arquitetura; execução fica limitada a modelos de 1 a 4B em 4 GB.

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo com base nas fontes)

| Opção (pergunta de arquitetura) | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| Anthropic API direta | 5 | 5 | 4 | 2 | 4 | 4 | 4 |
| OpenAI API direta | 5 | 5 | 5 | 3 | 3 | 3 | 4 |
| Google Gemini API paga | 4 | 5 | 4 | 3 | 2 | 5 | 4 |
| Google Gemini camada gratuita | 3 | 5 | 3 | 3 | 1 | 5 | 4 |
| OpenRouter (multi-provedor) | 4 | 4 | 5 | 5 | 3 | 4 | 4 |
| LiteLLM gateway próprio | 4 | 4 | 5 | 4 | 4 | 5 | 3 |
| Ollama local (modelos ≤4B) | 3 | 4 | 3 | 4 | 5 | 5 | 3 |
| OpenAI Hosted Shell (workspace remoto) | 3 | 4 | 3 | 2 | 2 | 3 | 4 |

Justificativas curtas: Anthropic tem o preço/cache mais agressivos na camada de trabalho e o tokenizador divergente; OpenAI tem o maior leque de moldalities e tools, com preço médio; Google tem camada gratuita e preço baixo, mas uso de dados na camada gratuita; OpenRouter unifica billing e fallback com taxa de compra; LiteLLM dá controle próprio sob MIT; Ollama é local, mas limitado a modelos pequenos em 4 GB.

### Próximos passos (não executados)

1. Buscar limites de taxa atuais de OpenAI e Anthropic e políticas de retenção.
2. Medir custo real de 1.000 interações com cache (spike) e unidades por execução.
3. Verificar function calling dos modelos locais candidatos (qwen3 4b, gemma4 e4b).
4. Confirmar preço do Bedrock e do Vertex para Claude e Gemini, se houver interesse em redundância de provedor.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | API Pricing | OpenAI | https://platform.openai.com/docs/pricing | 14/10/2026 |
| 2 | Pricing | Anthropic (Claude Platform Docs) | https://platform.claude.com/docs/en/about-claude/pricing | 14/10/2026 |
| 3 | Gemini Developer API pricing | Google | https://ai.google.dev/gemini-api/docs/pricing | 14/10/2026 |
| 4 | FAQ (taxas, BYOK, privacidade, limites) | OpenRouter | https://openrouter.ai/docs/faq | 14/10/2026 |
| 5 | Providers (produtos LiteLLM) | LiteLLM | https://docs.litellm.ai/docs/providers | 14/10/2026 |
| 6 | Ollama no Windows | Ollama | https://docs.ollama.com/windows | 14/10/2026 |
| 7 | Biblioteca de modelos | Ollama | https://ollama.com/library | 14/10/2026 |
| 8 | Rate limits | Google | https://ai.google.dev/gemini-api/docs/rate-limits | 14/10/2026 |
