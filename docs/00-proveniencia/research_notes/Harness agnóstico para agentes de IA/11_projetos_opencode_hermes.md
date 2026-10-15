# 11 — Avaliação de projetos: OpenCode e Hermes Agent

**Data de referência:** 14/10/2026. Aplicação dos seis critérios da seção 5 do briefing. Fatos de runtime e identidade do Hermes consolidados nas notas 01 e 07; canais do Hermes permanecem como lacuna.

## Resumo

- **OpenCode** (`anomalyco/opencode`, opencode.ai): agente open source de código, licença **MIT** confirmada no LICENSE do repositório. Interfaces TUI, desktop e IDE; arquitetura cliente-servidor; SDK TypeScript oficial; 75+ provedores via AI SDK e Models.dev, incluindo modelos locais; permissões por ferramenta com `allow`/`ask`/`deny` e casamento por glob; agentes primários e subagentes; skills; MCP; plugins; ferramentas customizadas; **ACP**: `opencode acp` roda como subprocesso JSON-RPC sobre stdio, suportado por Zed, JetBrains, Avante.nvim e CodeCompanion.nvim. No Windows, a documentação recomenda WSL [1][2][3][4].
- **Hermes Agent** (`NousResearch/hermes-agent`): licença **MIT**, release v0.21.7; instalação nativa no Windows sem WSL (`%LOCALAPPDATA%\hermes`); identidade por arquivos Markdown (SOUL.md, USER.md, MEMORY.md, AGENTS.md); memória com `write_approval`; snapshot de memória no início da sessão; busca FTS5 em sessões passadas com sumarização; padrão aberto de skills (agentskills.io); migração do OpenClaw [5][6].
- **Veredito OpenCode:** integração, não fork. Como agente plugável via ACP (ou via SDK) e como referência de modelo de permissões. Fork não se justifica: MIT permite, mas a manutenção de fork de produto ativo (v1 e v2 em paralelo, Console e Zen) tem custo alto sem ganho para o harness.
- **Veredito Hermes:** referência de padrões, não dependência. Adotar o padrão de arquivos de identidade e a disciplina de aprovação; fork não recomendado. Canais e arquitetura de gateway não confirmados — lacuna.
- **Risco comum:** ambos são produtos de terceiros com roadmap próprio; o harness deve tratá-los atrás de adaptadores.

## Fatos verificados

### 1. OpenCode

- Repositório `anomalyco/opencode` (o produto já foi publicado como `sst/opencode`); LICENSE no branch `dev`: **MIT**, "Copyright (c) 2025 opencode" [1].
- Produto: "open source AI coding agent", disponível como interface de terminal, aplicativo desktop e extensão de IDE; site opencode.ai; documentação em português do Brasil entre os idiomas [2].
- Provedores: AI SDK + Models.dev; 75+ provedores de LLM, incluindo modelos locais; IDs no formato `provedor/modelo`; OpenCode Zen como lista cuiada verificada pela equipe; OpenCode 2 traz Console e planos [2][3].
- Arquitetura: cliente-servidor; todas as interfaces usam `@opencode-ai/sdk`; pacotes de UI compartilhados (SolidJS); desktop com Tauri **e** Electron; CLI, TUI, Web, IDE [3].
- SDK: cliente TypeScript tipado para o servidor; sessões (criar, listar, abortar, reverter, resumir, compartilhar, filhos), prompt com saída estruturada (`outputFormat`), resposta a pedidos de permissão, shell, comandos [4].
- Permissões: chaves `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `external_directory`, `webfetch`, `websearch`, `lsp`, `skill`, `question`, `doom_loop`; valores `allow`/`ask`/`deny`; casamento por glob, inclusive para ferramentas MCP; `external_directory` controla acesso fora do worktree [2].
- Agentes: dois primários (Build, tudo liberado; Plan, somente leitura) e três subagentes (General, Explore, Scout); configuráveis por JSON ou Markdown; subagente herda o modelo do primário [2].
- Ferramentas embutidas: `read`, `edit`, `write`, `apply_patch`, `grep`, `glob`, `lsp`, `webfetch`, `shell`, `task`, `skill` [3].
- ACP: `opencode acp` inicia o OpenCode como subprocesso compatível com ACP, comunicando por JSON-RPC sobre stdio; integrações documentadas para Zed (Zed ACP Registry), JetBrains, Avante.nvim e CodeCompanion.nvim; recursos suportados incluem ferramentas embutidas, ferramentas customizadas, slash commands, servidores MCP, regras de AGENTS.md, formatters, agentes e permissões; `/undo` e `/redo` não suportados via ACP [1].
- Windows: a documentação recomenda WSL para a melhor experiência; instalação por Chocolatey, Scoop, npm, Mise e Docker [2].
- Privacidade: a documentação afirma que o OpenCode não armazena código nem dados de contexto [2].

### 2. Hermes Agent

- Repositório `NousResearch/hermes-agent`; LICENSE **MIT** (copyright 2025); release mais recente v0.21.7 [5][6].
- Instalação nativa no Windows sem WSL, em `%LOCALAPPDATA%\hermes` [6].
- Identidade: SOUL.md em `~/.hermes/SOUL.md` ou `$HERMES_HOME`, semeado automaticamente, nunca sobrescrito; entra no prompt como "slot #1" após varredura contra padrões de injeção; identidade padrão embutida se ausente [6][7].
- Memória: MEMORY.md e USER.md em `~/.hermes/memories/`; escritos pelo agente pela ferramenta `memory`; aprovação configurável via `write_approval`; memória entra no prompt como snapshot congelado no início da sessão (preserva prefix cache); escritas valem para a sessão seguinte [6].
- Contexto de projeto: um arquivo por sessão, na ordem `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`; SOUL.md é carregado à parte [8].
- Escrita do agente em SOUL.md por ferramentas de arquivo exige aprovação; acerto do scanner em SOUL.md gera aviso sem bloquear; em AGENTS.md, bloqueia [8][9].
- Sessões: busca FTS5 em sessões passadas com sumarização por LLM; integração opcional com Honcho; ciclo de aprendizado com criação autônoma de skills; padrão aberto agentskills.io [6].
- `/personality` como overlay de sessão; personalidades em `agent.personalities` no `config.yaml` [9].
- Migração do OpenClaw importa SOUL.md, MEMORY.md, USER.md e skills [6].
- Canais de mensageria suportados: **não confirmados** nesta pesquisa (lacuna herdada da nota 05).

## Interpretações

- **I1. OpenCode como adaptador, não como núcleo.** O OpenCode resolve o loop de agente de código com permissões, sessões e MCP. O harness precisa de aprovações por classe de ação (oito classes), memória em cinco níveis, canais, orçamento e identidade versionada — regras que o OpenCode não cobre. Encapsular via ACP mantém o loop dele e as regras nossas.
- **I2. ACP é a via de integração de menor atrito.** `opencode acp` (subprocesso stdio) casa com a porta de agente externo da nota 01: o harness é cliente ACP, recebe `session/update` e responde a `session/request_permission` ligando ao sistema de aprovações. Ausência de `/undo` e `/redo` via ACP é limitação menor.
- **I3. O SDK é a segunda via.** Para controle fino (sessões, saída estruturada, permissões programáticas), o SDK TypeScript fala com o servidor do OpenCode por HTTP. Serve quando o harness quiser orquestrar o OpenCode como serviço, não só como subprocesso.
- **I4. Fork não se justifica.** MIT permite fork, mas: produto ativo, duas versões maiores em paralelo (v1 e v2), CLI com serviços (Console, Zen) e mudança de organização (sst → anomalyco). O custo de divergência e sincronização supera o ganho; integração entrega 90% do valor.
- **I5. Windows e WSL.** A recomendação de WSL pesa: no perfil de 4 GB, empilhar WSL + Node + Ollama + workspace é arriscado. Usar OpenCode via ACP no Windows nativo só se o harness rodar fora de WSL; medir antes.
- **I6. Hermes como padroeiro de padrões.** O que vale do Hermes: arquivos de identidade versionáveis (SOUL/USER/MEMORY/AGENTS), snapshot no início da sessão (cache-friendly), aprovação para escrita de memória, varredura de injeção em arquivos de identidade e skills em padrão aberto. Nada disso exige depender do Hermes.
- **I7. Riscos do Hermes a não copiar.** Criação autônoma de skills e memórias conflita com o requisito de aprovação; `hermes profile install` copia SOUL.md de terceiros "sem varredura nem confirmação" segundo a documentação, com ressalva ambígua (nota 07). O harness deve tratar pacotes de terceiros como hostis.
- **I8. Skills como padrão comum.** OpenCode, Hermes e DeepSeek Harness convergem para skills; MCP tem extensão "Skills over MCP" (nota 01). Adotar um formato de skill próprio, compatível com agentskills.io, reduz atrito com os três ecossemas.

## Hipóteses e pontos não confirmados

- H1. Canais do Hermes: não confirmados.
- H2. Linguagem principal do Hermes (indícios de Python no repositório): não confirmada.
- H3. Estabilidade da API do SDK do OpenCode entre v1 e v2: não confirmada.
- H4. Licença do repositório do DeepSeek Harness (PyPI declara MIT): tratada na nota 12.
- H5. Desempenho de `opencode acp` em Windows nativo sem WSL: não medido.
- H6. Se o OpenCode expõe servidor HTTP por padrão e com qual autenticação: a página de server existe na documentação, mas não foi lida.

## Lacunas e conflitos

- Organização do OpenCode: documentação e buscas alternam `sst/opencode` e `anomalyco/opencode`; a renomeação não está documentada na fonte lida.
- "OpenCode 1" e "OpenCode 2" coexistem e não podem ser instalados lado a lado pelo comando padrão.
- Hermes: comportamento de montagem de prompt com fontes secundárias divergentes (nota 07).

## Recomendação preliminar

### Decisões por projeto

| Projeto | Papel no harness | Forma | Fork? |
|---|---|---|---|
| OpenCode | Agente plugável de código; referência de permissões | ACP (subprocesso) ou SDK; atrás de adaptador | Não |
| Hermes Agent | Referência de identidade, memória e aprovações | Padrões próprios inspirados; sem dependência | Não |

### Comparação das formas de integração (seis critérios da seção 5, pontuação 1-5)

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| OpenCode via ACP | 5 | 4 | 4 | 4 | 4 | 5 | 4 |
| OpenCode via SDK | 4 | 4 | 5 | 3 | 3 | 5 | 3 |
| OpenCode como fork | 2 | 3 | 5 | 2 | 3 | 2 | 1 |
| Padrões do Hermes adotados | 4 | 4 | 4 | 5 | 4 | 5 | 4 |
| Hermes como dependência | 2 | 4 | 3 | 3 | 3 | 4 | 3 |
| Hermes como fork | 1 | 3 | 4 | 2 | 2 | 2 | 1 |

Justificativas curtas: ACP dá o loop pronto com permissões, sem acoplar tipos; fork de produto ativo custa sincronização e segurança; padrões do Hermes são arquivos e disciplina, não código.

### Próximos passos (não executados)

1. Ler a licença completa do repositório do Hermes e a página de canais.
2. Spike: harness como cliente ACP do OpenCode, com `request_permission` ligado às aprovações.
3. Testar `opencode acp` em Windows nativo e medir memória.
4. Ler a página de server do OpenCode (HTTP, autenticação).

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | LICENSE (MIT) | OpenCode (GitHub raw) | https://raw.githubusercontent.com/anomalyco/opencode/dev/LICENSE | 14/10/2026 |
| 2 | Intro, Models, Agents, Permissions | OpenCode | https://opencode.ai/docs/ | 14/10/2026 |
| 3 | Página inicial e interfaces | OpenCode | https://opencode.ai/ | 14/10/2026 |
| 4 | SDK | OpenCode | https://opencode.ai/docs/sdk/ | 14/10/2026 |
| 5 | LICENSE (MIT) | Nous Research (GitHub raw) | https://raw.githubusercontent.com/NousResearch/hermes-agent/main/LICENSE | via nota 07 (13/10/2026) |
| 6 | hermes-agent (README e repositório) | Nous Research | https://github.com/NousResearch/hermes-agent | via nota 07 (13/10/2026) |
| 7 | Use SOUL.md with Hermes | Nous Research | https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes | via nota 07 (13/10/2026) |
| 8 | Context Files | Nous Research | https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files | via nota 07 (13/10/2026) |
| 9 | Personality (SOUL.md e overlays) | Nous Research | https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/personality.md | via nota 07 (13/10/2026) |
| 10 | ACP Support | OpenCode | https://opencode.ai/docs/acp/ | 14/10/2026 |
