# 10 — Operação, qualidade, custos e distribuição

**Data de referência:** 14/10/2026. Preços consultados em 14/10/2026 (nota 02) e 13/10/2026 (notas 03 e 09). Valores em USD.

## Resumo

- **O orçamento de US$ 50/mês fecha** com a camada de trabalho usando cache de prompt, ou com a camada barata sem cache. Não fecha com a camada de topo (Opus 5.5, Fable 5.1, gpt-6-astra) em uso regular.
- **Cálculo de referência (1.000 interações de agente por mês, 30k tokens de contexto e 2k de saída cada):** Claude Haiku 5.5 ≈ US$ 4; gpt-5-nano ≈ US$ 2,30; Gemini 3.8 Flash ≈ US$ 30; gpt-5.1 ≈ US$ 57,50 (estoura); Claude Sonnet 5.5 sem cache ≈ US$ 80 (estoura); **Claude Sonnet 5.5 com 80% do contexto em cache hit ≈ US$ 34** (cabe). Todos cálculos sobre preços publicados [1].
- **Custos fixos do projeto:** VPS de entrada para o gateway (valor não confirmado; estimativa de mercado de US$ 4 a 6/mês, a verificar), Langfuse Hobby US$ 0, Apple Developer US$ 99/ano (≈ US$ 8,25/mês, cálculo), Google Play US$ 25 uma vez [2][3][4].
- **Vetores de estouro:** web search (US$ 10/1.000 chamadas), Grounding do Google (US$ 14/1.000 após 5.000 grátis), modelos de topo, Serverless do LangSmith 24×7 (≈ US$ 62/mês), container sessions da OpenAI (US$ 0,03 a 1,92 por sessão de 20 min por contêiner) [1][2].
- **Distribuição:** Windows sem Artifact Signing para o Brasil (lista de países/Regiões não inclui o Brasil) — publicar sem assinatura, com aviso do SmartScreen, ou comprar certificado (custo não confirmado). macOS exige conta paga para assinar e notarizar. Android em conta pessoal exige teste fechado de 12 testers por 14 dias; iOS tem diretriz 2.5.2 contra instalar código que altera funcionalidades [3][4].
- **Recomendação preliminar:** orçamento fechado por camada de modelo, cache obrigatório, web search com aprovação e limite, gateway em VPS de entrada, observabilidade no plano gratuito, mobile como cliente fino.

## Fatos verificados

### 1. Cenários de custo (cálculos sobre preços de 14/10/2026) [1]

Premissa: 1.000 interações/mês; 30.000 tokens de contexto e 2.000 de saída por interação (30M entrada, 2M saída no mês).

| Modelo | Cálculo | Custo/mês | Cabe em US$ 50? |
|---|---|---|---|
| Claude Haiku 5.5 | 30M×0,10 + 2M×0,50 | US$ 4 | Sim, folgado |
| gpt-5-nano | 30M×0,05 + 2M×0,40 | US$ 2,30 | Sim |
| Gemini 3.8 Flash | 30M×0,75 + 2M×3,75 | US$ 30 | Sim |
| Claude Sonnet 5.5, 80% cache hit | 24M×0,10 + 6M×2 + 2M×10 | US$ 34 | Sim |
| gpt-5.1 | 30M×1,25 + 2M×10 | US$ 57,50 | Não |
| Claude Sonnet 5.5, sem cache | 30M×2 + 2M×10 | US$ 80 | Não |
| Claude Opus 5.5 | 30M×4 + 2M×20 | US$ 160 | Não |

- Cache hit em Sonnet 5.5 custa 0,05x a entrada (US$ 0,10/MTok); escrita de cache 1,25x. A ordem do prompt importa: prefixo estável primeiro.
- Batch (50% off) serve para trabalhos em segundo plano; Fast mode da Anthropic (~2x) e Fast da OpenAI (~2x) são para latência, não para rotina.

### 2. Custos de serviço

- Langfuse Hobby: US$ 0 (50k units/mês, 30 dias de retenção); Core US$ 29/mês [2].
- LangSmith Developer: US$ 0 (5k traces/mês); Serverless Small 24×7 ≈ US$ 62/mês (cálculo da nota 03) [2].
- OpenAI Hosted Shell/Code Interpreter: US$ 0,03 a US$ 1,92 por sessão de 20 min por contêiner [1].
- Web search: US$ 10/1.000 chamadas (OpenAI e Anthropic); Google Grounding US$ 14/1.000 após 5.000/mês grátis [1].
- Hetzner Cloud: página institucional acessada, mas os valores não foram renderizados na extração — preço do VPS de entrada **não confirmado** nesta rodada; estimativa de mercado de US$ 4 a 6/mês, a verificar na calculadora.
- Oracle Cloud Always Free: página retornou HTTP 403 na consulta; existência e limites **não verificados** nesta rodada.

### 3. Distribuição por plataforma [3][4]

- Apple Developer Program: US$ 99/ano (≈ US$ 8,25/mês, cálculo); desde 28/04/2026, uploads exigem Xcode 26 e SDK do iOS 26; diretriz 2.5.2 proíbe baixar ou executar código que introduza ou altere funcionalidades; desde 09/09/2026, alvo mínimo iOS 13.
- Google Play: US$ 25 uma vez; contas pessoais criadas após 13/11/2023 precisam de teste fechado com 12 testers por 14 dias; desde 31/08/2026, novos apps e atualizações devem mirar Android 16 (API 36)+.
- Windows: Artifact Signing (antigo Trusted Signing) cobre apenas organizações e pessoas em países da lista (EUA, Canadá, UE, Reino Unido, Austrália, Nova Zelândia, Japão, Coreia do Sul, Singapura, Suíça, Noruega, Israel); **Brasil não está na lista**; exige assinatura Azure paga. Alternativas: certificado comercial (custo não confirmado) ou publicar sem assinatura, aceitando o aviso do SmartScreen.
- Tauri exige WebView2 e Visual Studio C++ no Windows; atualizações do app exigem assinatura.

## Interpretações

- **I1. Desenho para o orçamento, não apesar dele.** Três camadas de modelo com roteamento por tarefa e orçamento fechado por camada; cache obrigatório no prompt estático; web search como ferramenta aprovada com limite diário; batch para jobs em segundo plano. Regra automática: ao atingir 80% do orçamento mensal, o harness degrada para a camada barata e avisa; ao atingir 100%, bloqueia chamadas da camada cara e pede aprovação.
- **I2. O gateway precisa ser barato e previsível.** Um VPS de entrada com HTTPS (Caddy ou similar) e um processo Node serve o webhook do WhatsApp e a retransmissão. Nada de Kubernetes, banco gerenciado ou observabilidade self-hosted nessa fronteira — custo e complexidade não cabem.
- **I3. Observabilidade grátis primeiro.** Langfuse Hobby (50k units/mês) cobre uso individual; a migração para Core (US$ 29) só quando o volume justificar. Self-hosting está descartado em 4 GB (nota 03).
- **I4. Métricas desde o primeiro dia.** Como não há usuários, as métricas são do próprio desenvolvedor: sucesso da tarefa (conclusão sem intervenção), intervenções humanas por sessão, tokens e custo por sessão, latência p50/p95 por passo, taxa de erro de ferramenta e recuperações. Instrumentação OTel GenAI (nota 03) alimenta o Langfuse.
- **I5. Modo de operação.** O produto é uso individual, núcleo local, gateway mínimo em servidor. Self-hosting completo (Buzz, Langfuse) é opção futura, em hardware maior; SaaS está fora do escopo.
- **I6. Mobile como cliente fino.** As regras das lojas (2.5.2 da Apple; teste de 12 dias do Google) e o orçamento recomendam cliente móvel fino, falando com o gateway, sem execução de plugins. Publicação nas lojas é opcional e cara em tempo (contas, revisões); distribuição por sideload/TestFlight primeiro.
- **I7. Windows é a plataforma de risco de distribuição.** Sem assinatura, o instalador mostra aviso do SmartScreen. Para um projeto pessoal, aceitar o aviso e documentar como contornar é razoável; assinatura comercial fica para quando houver razão.
- **I8. Internacionalização e acessibilidade.** CLI/TUI e Web UI em português e inglês desde o início (i18n simples por arquivo); Web UI seguindo WCAG AA como alvo. Não há pesquisa de custo específico — é requisito de qualidade, não de plataforma.

## Hipóteses e pontos não confirmados

- H1. Preço do VPS de entrada: não confirmado (página sem valores renderizados).
- H2. Always Free da Oracle: não verificado (403).
- H3. Consumo real de tokens por interação: os cenários são ilustrativos; medir com spike.
- H4. Custo de certificado de assinatura Windows: não confirmado.
- H5. Custo de CI com macOS (necessário para build de iOS): não pesquisado.
- H6. Limite de units do Langfuse Hobby suficiente para o volume real: não medido.
- H7. Custo por mensagem do WhatsApp no Brasil: tabelas em CSV/PDF não lidas (nota 05).

## Lacunas e conflitos

- Cenários de custo dependem de preços promocionais com data de expiração (nota 02); reavaliar em janeiro de 2027.
- Estimativa de VPS sem fonte primária — marcada como não confirmada.
- Sem pesquisa de custo de suporte (não há suporte: projeto pessoal).

## Recomendação preliminar

### Orçamento mensal-alvo (modelo, não medido)

| Item | Valor | Base |
|---|---|---|
| API — camada de trabalho com cache | ≈ US$ 34 | Cálculo nota 10.1 |
| API — camada barata (tarefas mecânicas) | ≈ US$ 4 | Cálculo nota 10.1 |
| Web search (200 buscas) | US$ 2 | US$ 10/1.000 |
| VPS do gateway | US$ 4 a 6 (a confirmar) | Estimativa de mercado |
| Langfuse Hobby | US$ 0 | Página de preços |
| Backup (Litestream → objeto storage) | < US$ 1 | Estimativa; "pennies per day" |
| **Total** | **≈ US$ 45 a 47** | Cabe em US$ 50 com margem curta |
| Reservas fora do mensal: Apple US$ 99/ano; Google US$ 25 uma vez | | Nota 09 |

### Regras de operação

1. Orçamento fechado por camada; degradação automática em 80%; bloqueio e pedido de aprovação em 100% (requisito do usuário).
2. Cache de prompt como requisito de arquitetura (prefixo estático).
3. Web search e grounding: desligados por padrão, aprovados por uso, com limite diário.
4. Batch para jobs em segundo plano; Fast mode só com justificativa de latência.
5. Métricas mínimas desde o dia 1: sucesso da tarefa, intervenções humanas, custo e latência por sessão, erro e recuperação de ferramenta.
6. Configuração e migrações versionadas (nota 06); feature flags simples em arquivo.
7. Distribuição: instaladores por SO; gateways em contêiner no VPS; mobile como cliente fino; lojas como fase posterior.
8. i18n pt-BR e en; acessibilidade WCAG AA na Web UI.

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo)

| Estratégia (pergunta de arquitetura) | Adequação | Maturidade | Custo | O&M |
|---|---|---|---|---|
| Núcleo local + gateway mínimo em VPS | 5 | 4 | 5 | 4 |
| Observabilidade em nuvem grátis (Langfuse Hobby) | 5 | 4 | 5 | 5 |
| Três camadas de modelo com orçamento fechado | 5 | 4 | 4 | 3 |
| Self-hosting completo (Buzz, Langfuse) | 2 | 4 | 2 | 2 |
| SaaS operado pelo projeto | 1 | 3 | 2 | 1 |
| Publicação nas lojas (fase inicial) | 2 | 4 | 3 | 2 |

Justificativas curtas: o modo local com gateway mínimo é o único que cabe em US$ 50/mês e em 4 GB de RAM; self-hosting completo exige servidor maior e horas de manutenção; SaaS contraria o escopo individual.

### Próximos passos (não executados)

1. Confirmar preço do VPS e optar por provedor.
2. Medir consumo real por 2 semanas e calibrar as camadas.
3. Definir e implementar as regras de degradação e bloqueio de orçamento.
4. Decidir aposta de distribuição: instaladores primeiro, lojas depois.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | API Pricing | OpenAI | https://platform.openai.com/docs/pricing | 14/10/2026 |
| 2 | Pricing | Anthropic | https://platform.claude.com/docs/en/about-claude/pricing | 14/10/2026 |
| 3 | Pricing (Langfuse) | Langfuse | https://langfuse.com/pricing | via nota 03 (13/10/2026) |
| 4 | Pricing (LangSmith) | LangChain | https://www.langchain.com/pricing | via nota 03 (13/10/2026) |
| 5 | Gemini Developer API pricing | Google | https://ai.google.dev/gemini-api/docs/pricing | 14/10/2026 |
| 6 | Apple Developer Program | Apple | https://developer.apple.com/programs/ | via nota 09 (13/10/2026) |
| 7 | App Review Guidelines | Apple | https://developer.apple.com/app-store/review/guidelines/ | via nota 09 (13/10/2026) |
| 8 | Play Console (taxa e teste) | Google | https://support.google.com/googleplay/android-developer/ | via nota 09 (13/10/2026) |
| 9 | Artifact Signing (Quickstart) | Microsoft Learn | https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart | via nota 09 (13/10/2026) |
| 10 | Hetzner Cloud | Hetzner | https://www.hetzner.com/cloud/ | 14/10/2026 (valores não renderizados) |
