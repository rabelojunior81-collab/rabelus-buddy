# BRAINSTORM — Briefing para pesquisa do Harness Multi-faceta

## 1. Propósito

Produzir um relatório de pesquisa, com fontes primárias e recomendações verificáveis, para orientar a concepção e a execução de um harness de agentes de IA **agnóstico, extensível e multi-tudo**: múltiplos modelos e provedores, agentes, ferramentas, canais, sessões, workspaces e modos de execução, sob políticas e uma experiência coerentes.

Este documento define o escopo da investigação; **não** presume que os produtos ou SDKs citados sejam compatíveis, abertos, adequados ou recomendáveis. Verificar nomes, estado atual, recursos, termos, licenças, preços e limites nas fontes oficiais antes de usá-los como premissas.

## 2. Visão do produto a investigar

O sistema desejado combina:

- **Runtime e orquestração de agentes:** ciclo de execução, planejamento, chamadas de ferramentas, eventos, interrupção, retomada, aprovação humana e execução concorrente.
- **Abstração multi-provedor:** integração potencial com o SDK do OpenCode e os SDKs/API de OpenAI, Anthropic e Google Gemini, sem impedir modelos locais ou provedores adicionais.
- **Orquestração avançada:** avaliar LangChain, LangGraph e Managed DeepAgents, além de LangSmith (grafado “Lansmith” no rascunho) e Langfuse para rastreamento, avaliação e gestão operacional.
- **Workspaces executáveis:** sessões em ambientes isolados, potencialmente Docker/containers, com filesystem, terminal, backend e bancos de dados.
- **Gateway multicanal:** entrada e saída por CLI/TUI, Web UI, aplicativo desktop e integrações de mensageria; estudar Hermes Agent como referência.
- **Memória e conhecimento governados:** avaliar OpenWiki (nome a confirmar), mecanismos da família LangChain e alternativas para memória de sessão, memória persistente e corpus curado.
- **Identidade do agente:** instruções, personalidade, contexto e políticas versionáveis e governados, inspirados pelo corpus de identidade do Hermes.
- **Experiência de desenvolvimento:** considerar integração, incorporação ou adaptação de OpenCode; investigar DeepSeek Harness como possível base ou referência, sem assumir viabilidade de fork.

O objetivo é encontrar uma arquitetura que reúna esses aspectos sem acoplamento excessivo a um único fornecedor, framework ou interface.

## 3. Perguntas que o relatório deve responder

1. Qual é o problema e o público prioritário? Quais tarefas do usuário justificam reunir runtime, canais, memória e múltiplos provedores no mesmo produto?
2. O que significa “agnóstico” em termos verificáveis: troca de provedor, portabilidade de sessão, compatibilidade de ferramentas, formatos de eventos, ou todos esses pontos?
3. Quais componentes devem ser próprios e quais devem ser integrados como dependências, serviços gerenciados, subprocessos ou projetos incorporados?
4. Quais opções preservam melhor segurança, confiabilidade, qualidade da experiência, portabilidade e capacidade de evolução?
5. Qual deve ser a sequência de entrega do escopo completo, e quais dependências ou decisões podem bloqueá-la?
6. O produto é primeiro local/individual, self-hosted, multiusuário ou SaaS? Como essa escolha afeta isolamento, identidade, dados, custos e operação?

## 4. Frentes de pesquisa

### 4.1 Runtime, ciclo do agente e interoperabilidade

- Definir o modelo de execução: agente único, agentes especializados, subagentes, tarefas em background e sessões concorrentes.
- Mapear ciclo de vida, estado, eventos, streaming, cancelamento, timeout, retry, retomada, checkpoints e tratamento de falhas.
- Comparar execução própria, OpenCode SDK/runtime, LangGraph e outras alternativas relevantes. Separar orquestração determinística (grafo/estado) de decisões probabilísticas do modelo.
- Investigar contratos de interoperabilidade, schemas de mensagens e eventos, versionamento e adaptadores. Avaliar ACP, MCP, A2A e outros protocolos somente após confirmar escopo e maturidade.
- Determinar como preservar capacidades específicas do provedor sem reduzir tudo ao menor denominador comum.
- Verificar suporte a chamadas de ferramentas, saída estruturada, multimodalidade, cache, contexto longo, streaming e uso de modelos locais em cada provedor.

### 4.2 Provedores, SDKs e roteamento de modelos

Pesquisar documentação e SDKs atuais para:

- OpenCode (confirmar o produto/SDK exato e o que significa ser “tradutor” de modelos e ferramentas).
- OpenAI, Anthropic e Google Gemini.
- Provedores e runtimes locais ou compatíveis com APIs abertas, se agregarem portabilidade ou execução offline.

Para cada opção, comparar:

- Linguagens e maturidade dos SDKs; cobertura de recursos e cadência de atualização.
- Autenticação, gestão de chaves, regiões, limites, quotas, preços e políticas de retenção de dados.
- API comum versus recursos proprietários; paridade entre API direta e adaptadores de terceiros.
- Roteamento/fallback, seleção de modelo por tarefa, limites de custo e latência e comportamento quando o provedor está indisponível.
- Compatibilidade dos SDKs com o runtime e com execução em browser, desktop, servidor e ambiente isolado.

Entregar uma matriz recurso × provedor e destacar recursos que não podem ser abstraídos sem perda.

### 4.3 LangChain, LangGraph, LangSmith, Langfuse e DeepAgents

- Verificar os nomes oficiais, produtos, licenças, repositórios, versões e limites de cada componente.
- Distinguir framework de aplicação, runtime/grafo, observabilidade, avaliação e serviço gerenciado.
- Avaliar se LangGraph deve governar o estado e o fluxo, se LangChain deve ser usado como biblioteca/adaptador, e o que Managed DeepAgents acrescentaria ou duplicaria.
- Comparar LangSmith e Langfuse em tracing, datasets, evals, prompt/version management, self-hosting, privacidade, custos e dependência de plataforma.
- Determinar como instrumentar spans/eventos de forma portável e evitar que dados sensíveis vazem em traces.
- Investigar avaliação offline e online: qualidade, regressão, custo, latência, segurança e sucesso de ferramentas.

### 4.4 Workspaces, containers e execução de ferramentas

- Comparar Docker, containerd, microVMs e execução local restrita; avaliar isolamento de processos, rede, filesystem, credenciais e recursos.
- Definir o que existe por sessão, por tarefa e por usuário: diretório de trabalho, imagem/container, ferramentas, banco de dados e artefatos.
- Investigar criação, reutilização, pausa, retomada e descarte de ambientes; snapshots e reprodutibilidade.
- Avaliar execução em desktop/local, servidor self-hosted e infraestrutura gerenciada.
- Projetar limites de CPU, memória, disco, rede, tempo, processos e concorrência.
- Pesquisar ameaças de prompt injection, execução arbitrária, acesso indevido a arquivos, exfiltração de segredos, cadeia de suprimentos e escape de sandbox.
- Definir estratégia para aplicar patches e alterações no workspace com diff, revisão, aprovação, rollback e registro de auditoria.

### 4.5 Gateway multicanal e interfaces

Investigar Hermes Agent e outras referências, verificando os canais e capacidades efetivamente suportados.

- **CLI/TUI:** comandos, streaming, sessões, seleção de agente/modelo, aprovações, anexos, saída acessível e operação sem interface gráfica.
- **Web UI:** autenticação, gestão de sessões, colaboração, streaming, upload/download, controles de segurança e compatibilidade móvel.
- **Desktop:** frameworks possíveis, integração com filesystem e processos locais, atualização, assinatura, isolamento e suporte por sistema operacional.
- **Mensageria:** canais pretendidos, webhooks, identidade do usuário, threading, anexos, rate limits, consentimento e políticas específicas por plataforma.
- Definir um protocolo de eventos e um modelo de sessão compartilhados entre canais, preservando capacidades próprias de cada canal.
- Avaliar incorporar, chamar como subprocesso, usar SDK ou fazer fork do OpenCode. Comparar o mesmo conjunto de opções para o DeepSeek Harness caso o projeto seja identificado e tenha licença e arquitetura adequadas.

### 4.6 Sessões, concorrência, filesystem e persistência

- Modelar usuário/tenant, workspace, conversa, sessão, execução, tarefa, agente, ferramenta, evento e artefato.
- Pesquisar persistência transacional e armazenamento de eventos: SQLite, PostgreSQL e alternativas pertinentes, separando estado canônico de índices/cache.
- Definir ordenação, isolamento e concorrência de sessões; locks, leases, filas, idempotência, retomada após reinício e conflitos de filesystem.
- Determinar retenção, exportação, exclusão, backup, migração de schema, criptografia e portabilidade dos dados.
- Comparar filesystem local, volumes de container e object storage para artefatos; definir limites e regras de acesso.
- Analisar requisitos para execução offline e sincronização, se isso fizer parte do produto.

### 4.7 Memória, OpenWiki e corpus de identidade

- Confirmar a identidade e o escopo de **OpenWiki**, sua relação real com LangChain e disponibilidade/licença. Não confundir memória de agente, wiki de conhecimento e base vetorial.
- Distinguir memória de curto prazo da conversa, estado de workflow, fatos duráveis do usuário, conhecimento de projeto e corpus institucional.
- Pesquisar ingestão, chunking, embeddings, busca híbrida, citações, proveniência, expiração e atualização/remoção de conteúdo.
- Projetar governança: origem, consentimento, escopo de acesso, aprovação, auditoria, revisão, versionamento, rollback e prevenção contra contaminação por prompt injection.
- Avaliar bases SQL, busca textual/vetorial e grafos como opções complementares; não presumir que uma única tecnologia sirva a todas as memórias.
- Tratar identidade/persona como configuração e conteúdo versionável: instruções, estilo, ferramentas autorizadas, políticas, herança, precedência e resolução de conflitos.
- Definir como memória e identidade são isoladas por usuário, agente, projeto, workspace e organização.

### 4.8 Segurança, privacidade e governança

- Construir modelo de ameaças para prompts, ferramentas, arquivos, canais, provedores, plugins, memória e ambiente de execução.
- Pesquisar gestão de segredos, OAuth, permissões por ferramenta, consentimento e aprovação humana para ações de alto impacto.
- Definir fronteiras de confiança, autorização por recurso, RBAC/ABAC se necessário, proteção contra CSRF/SSRF e controles de rede.
- Avaliar segurança da cadeia de suprimentos: dependências, imagens, plugins, extensões, atualizações e forks.
- Cobrir dados pessoais e confidenciais, localização/transferência de dados, retenção, eliminação e requisitos regulatórios aplicáveis ao mercado-alvo.
- Especificar auditoria sem registrar conteúdo sensível desnecessário; políticas de redaction e controle de acesso a traces.
- Verificar requisitos de licenciamento, marcas, atribuição e distribuição para todo projeto ou modelo incorporado.

### 4.9 Linguagens, frameworks e composição do produto

Comparar linguagens e stacks à luz dos SDKs e requisitos reais, não por preferência abstrata. Investigar, no mínimo, pertinência e custo de:

- **TypeScript/JavaScript:** integração com SDKs de IA, UI web, CLI/TUI e desktop; maturidade em runtime e isolamento.
- **Python:** ecossistema LangChain/LangGraph, avaliação, servidores e workers.
- **Go ou Rust:** serviços de runtime, concorrência, distribuição, segurança e binários/CLI.
- **Tecnologia de UI desktop** adequada ao compartilhamento de componentes com Web UI.

O relatório deve recomendar uma estratégia de composição (monólito modular, serviços separados ou híbrida) e justificar fronteiras e linguagens. Considerar IPC/API entre componentes, contratos versionados, geração de clientes, deploy, observabilidade e custo de manter múltiplas linguagens.

### 4.10 Operação, qualidade e sustentabilidade

- Definir métricas: sucesso da tarefa, latência por etapa, tokens/custo, falhas de ferramenta, recuperação, qualidade e intervenções humanas.
- Comparar operação single-user/local, self-hosted e SaaS: deploy, atualizações, escalabilidade, isolamento, suporte, backups e observabilidade.
- Considerar gestão de configuração, feature flags, migrações, compatibilidade de versões e diagnóstico de problemas.
- Estimar custo de APIs, compute, armazenamento, observabilidade e suporte para cenários representativos.
- Pesquisar acessibilidade, internacionalização, suporte a Windows/macOS/Linux e limitações de distribuição.

## 5. Pesquisa de projetos e decisões de fork

Para OpenCode, Hermes Agent, DeepSeek Harness, OpenWiki e demais candidatos que surjam:

1. Confirmar repositório oficial, mantenedor, atividade recente, releases e roadmap público.
2. Ler licença e avisos de terceiros; avaliar obrigação de publicar alterações, atribuição, uso de marcas e restrições comerciais.
3. Inspecionar arquitetura, linguagens, pontos de extensão, testes, empacotamento e interfaces públicas.
4. Verificar se a integração por SDK/API/plugin/subprocesso atende ao caso antes de recomendar fork.
5. Estimar custo de manter um fork: divergência, sincronização upstream, segurança, compatibilidade e responsabilidade por releases.
6. Comparar fork, extensão upstream, wrapper/adaptador e reimplementação limitada em critérios comuns.

Não inferir que “aberto” significa licença permissiva, que “SDK” é estável, ou que uma integração anunciada cobre os casos de uso necessários.

## 6. Método e padrão de evidência

- Priorizar documentação oficial, repositórios e licenças; usar cobertura técnica independente para contexto e validar alegações importantes na fonte primária.
- Registrar URL, título, autor/organização e data de publicação ou acesso. Marcar explicitamente evidência ausente, conflito ou informação não confirmada.
- Distinguir fatos verificados, interpretação, hipótese e recomendação.
- Confirmar status atual: projetos, SDKs, produtos gerenciados, modelos e planos mudam rapidamente.
- Para cada opção, pontuar adequação funcional, maturidade, extensibilidade, portabilidade, segurança, custo e esforço de operação/manutenção.
- Evitar listas de tecnologias sem decisão: cada alternativa pesquisada deve responder uma pergunta concreta da arquitetura.

## 7. Entregáveis esperados do relatório

1. Resumo executivo e definição do produto/usuário inicial.
2. Mapa de capacidades e arquitetura de referência, com componentes, fronteiras e fluxos de dados/eventos.
3. Matrizes comparativas de provedores/SDKs, frameworks, persistência, sandbox, canais e estratégias de observabilidade.
4. Avaliação fundamentada de OpenCode, Hermes, DeepSeek Harness e OpenWiki, incluindo viabilidade de integração/fork e licenças.
5. Modelo de dados e proposta inicial de sessões, memória, identidade e artefatos.
6. Modelo de ameaças e controles prioritários.
7. Decisões recomendadas, alternativas descartadas e riscos/questões ainda abertas.
8. Roadmap incremental com marcos, dependências e critérios mensuráveis de sucesso.
9. Protótipos ou spikes recomendados para resolver incertezas de maior risco antes da implementação.
10. Fontes rastreáveis e data de corte da pesquisa.

## 8. Critérios de validação do escopo completo

O relatório deve propor a sequência de entrega do escopo completo, sem recortes superficiais. A sequência deve validar as principais incertezas, e cada capacidade abaixo precisa funcionar de forma demonstrável:

- Interfaces e um modelo de sessão/eventos partilhado.
- Provedores escolhidos, com casos de uso comparáveis, sem esconder diferenças relevantes.
- Runtime com ferramentas e aprovações explícitas.
- Persistência e retomada de sessões concorrentes.
- Workspace isolado com limites demonstráveis.
- Memória governada, com proveniência, exclusão e aprovação para alterações feitas pelo agente.
- Plugins, scripts, skills e protocolos (MCP, ACP, A2A) com controles de permissão e isolamento.
- Integração com os canais priorizados, incluindo o Buzz.
- Tracing, avaliação, controle de custo e auditoria.

Para cada marco, indicar o que será demonstrado, quais métricas o validam e que decisões serão adiadas.

## 9. Decisões de descoberta

Respostas registradas em 13/10/2026.

### 9.1 Primeiro usuário

Desenvolvedor individual.

### 9.2 Modo de operação

Híbrido: núcleo local, com componentes ou gateway em servidor.

### 9.3 Canais de mensageria

- WhatsApp, Telegram, Slack, Microsoft Teams, Discord, E-mail e Buzz (https://github.com/block/buzz).
- O Buzz é canal a integrar e também referência de produto.
- Países e regiões: a definir.

### 9.4 Ações sem supervisão e aprovação

- Depende do tipo de ação.
- Exigem aprovação humana: criar ou alterar arquivos; executar comandos no terminal; apagar arquivos ou dados; alterar sistemas externos por API; enviar mensagens em canais; usar credenciais ou segredos; instalar pacotes ou plugins; gastar acima de um limite de custo.
- Leitura livre apenas dentro do workspace. Fora dele, a leitura exige aprovação, inclusive a pesquisa na web (inferido, a confirmar).

### 9.5 Memória

- Pertence a pessoa, projeto, workspace, agente e organização.
- Podem inspecionar, corrigir e apagar: usuário dono, administrador, membros do projeto e o próprio agente.
- O agente só corrige ou apaga a própria memória com aprovação humana.

### 9.6 Multi-tudo e multiusuário

- “Multi-tudo” é pluralidade técnica: SDKs, provedores de modelos, LLMs, linguagens, protocolos e frameworks, desde o início.
- Multiusuário, equipes e tenants isolados ficam fora do escopo.

### 9.7 Extensibilidade e protocolos

- No escopo: plugins de terceiros, scripts arbitrários, modelos locais, skills e protocolos MCP, ACP e A2A.
- Skills: pacotes reutilizáveis de instruções e ferramentas para o agente.
- Modelos locais: apenas disponibilidade e preparação, sem prioridade de implementação.

### 9.8 Sistemas operacionais e recursos

- Plataformas: Windows, macOS, Linux, navegador (Web UI), Android e iOS.
- Recursos mínimos: 4 GB de RAM, GPU não necessária, até 50 GB de disco.

### 9.9 Orçamento e monetização

- Orçamento mensal para APIs e infraestrutura: US$ 50.
- Monetização: sem receita.

### Pendências

- Países e regiões dos canais de mensageria.
- Custos do escopo completo frente ao orçamento de US$ 50 por mês.
- Confirmar se a pesquisa na web exige aprovação.
- Identidade e permissões ao integrar com o Buzz, que é multiusuário, mesmo com o harness em uso individual.

