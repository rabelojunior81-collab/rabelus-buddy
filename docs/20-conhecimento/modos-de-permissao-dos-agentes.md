# Modos de permissão dos agentes de código (Claude Code, Codex, OpenCode)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-20T10:12:48-03:00 · **Estado:** vigente · **Proveniência:** pesquisa ao vivo por subagente Claude Haiku 5.5 (piloto de paralelismo, onda 1, missão W2), conferida pelo buddy-dev: fontes oficiais citadas, tabela comparativa e implicações relidas; os nomes dos modos do Claude Code batem com os que este harness oferece

> As lacunas marcadas "não encontrado na fonte" continuam abertas; nada aqui veio da memória do modelo.


## Fontes (consultadas em 2026-10-20)

Claude Code
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/settings

OpenAI Codex CLI
- https://developers.openai.com/codex/security (redirecionou; conteúdo não era de aprovações)
- https://learn.chatgpt.com/docs/security (conteúdo de sandbox e aprovações não estava nesta página)
- https://learn.chatgpt.com/docs/agent-approvals-security (página oficial de aprovações e sandbox, redirecionada a partir de developers.openai.com/codex/agent-approvals-security)
- https://raw.githubusercontent.com/openai/codex/main/docs/sandbox.md (sem conteúdo útil)
- https://github.com/openai/codex/blob/main/docs/config.md (sem os campos de aprovação)

OpenCode
- https://opencode.ai/docs/permissions/
- https://opencode.ai/docs/config/

Observação: as páginas de documentação do Codex foram lidas por resumo automático (WebFetch), não pelo texto integral. Itens marcados como "não encontrado na fonte" não aparecem nas páginas consultadas.

---

## A. Claude Code

**Modos de permissão** (fonte: permission-modes e permissions)
- `default` (rótulo "Manual" na CLI): pede permissão no primeiro uso de cada ferramenta. Aceita também o alias `manual`.
- `acceptEdits`: aceita edições de arquivo e comandos comuns de sistema de arquivos (`mkdir`, `touch`, `mv`, `cp`) em caminhos do diretório de trabalho ou de `additionalDirectories`.
- `plan` (rótulo "Plan"): Claude lê arquivos e roda comandos somente-leitura, sem editar código-fonte.
- `auto`: roda sem prompts rotineiros; um classificador em segundo plano revisa ações antes de executar. A página avisa: "Auto mode reduces permission prompts but does not guarantee safety."
- `dontAsk`: nega automaticamente toda chamada que pediria permissão; ferramentas pré-aprovadas por regra continuam rodando.
- `bypassPermissions`: pula os prompts, inclusive escritas em caminhos protegidos (`.git`, `.claude`). Deny rules continuam valendo; allow rules não têm efeito nesse modo.

**Como trocar de modo** (CONFIRMADO na fonte)
- Shift+Tab na sessão (ciclo: `default` → `acceptEdits` → `plan`; `bypassPermissions` entra depois de `plan` se habilitado; `auto` por último; `dontAsk` não aparece no ciclo).
- Flag na inicialização: `claude --permission-mode plan`.
- Padrão em configuração: `permissions.defaultMode` em arquivo de settings. Ordem: flag, depois `defaultMode`, depois o padrão embutido.
- Limite: `.claude/settings.json` e `settings.local.json` de projeto ignoram `"auto"` e `"bypassPermissions"` como modo inicial.
- Interfaces: VS Code (indicador de modo), Desktop (seletor abaixo da caixa), web/mobile (dropdown).

**Regras allow/ask/deny** (CONFIRMADO)
- Sintaxe: `Tool` ou `Tool(especificador)`. Ex.: `Bash(npm run *)`, `Read(./.env)`, `WebFetch(domain:example.com)`.
- Padrões com `*` em Bash: `Bash(git log *)` permite só `git log`; `Bash(git *)` permite qualquer git. Operadores compostos (`&&`, `||`, `;`, `|`) são avaliados subcomando por subcomando.
- Ordem de avaliação: deny, depois ask, depois allow. O primeiro match decide, independentemente da especificidade. Regra allow não cria exceção a deny.
- Deny com nome de ferramenta sem parênteses (ex.: `Bash`) remove a ferramenta do contexto do modelo.
- Limite declarado: regra de Bash não é fronteira de segurança; `Bash(curl *)` não cobre `/usr/bin/curl`. Para isso, a própria doc aponta sandboxing.
- Gancho PreToolUse: decisão de hook não contorna regras deny/ask; hook com exit code 2 bloqueia antes das regras.

**Escopos** (CONFIRMADO em settings)
- Gerenciado (managed-settings.json, MDM ou console claude.ai): nenhum outro nível sobrescreve.
- Linha de comando (`claude --settings`): sessão.
- Projeto local (`.claude/settings.local.json`): pessoal, do projeto.
- Projeto compartilhado (`.claude/settings.json`): todos do projeto.
- Usuário (`~/.claude/settings.json`): todos os projetos.
- Precedência: gerenciado > linha de comando > projeto local > projeto compartilhado > usuário. Se uma ferramenta está negada em qualquer nível, nenhum outro nível a libera.
- Ao escolher "Yes, and don't ask again" para Bash ou WebFetch, a regra é gravada em `.claude/settings.local.json` na raiz do repositório git. Aprovação de edição de arquivo não é gravada: vale até o fim da sessão.
- Regras de projeto em `.claude/settings.json` (allow e additionalDirectories) só valem depois do diálogo de confiança do workspace.

**Opções do prompt de permissão** (CONFIRMADO no exemplo da doc)
- "Yes"
- "Yes, and don't ask again for: <padrão>" (ex.: `npm test *`)
- "Yes, and switch to auto mode" (nem sempre aparece)
- "No"
- Algumas aprovações só oferecem "uma vez", quando o prompt não consegue mostrar tudo que a regra liberaria.

**Leitura e escrita fora da pasta do projeto** (CONFIRMADO em parte)
- Leitura e Grep dentro do diretório de trabalho e de diretórios adicionais: sem aprovação.
- Escrita em `acceptEdits`: vale para diretório de trabalho e `additionalDirectories`.
- Diretórios adicionais: flag `--add-dir` ou comando `/add-dir`; ou `permissions.additionalDirectories` em settings, que concede só acesso a arquivos (não carrega configurações do diretório).
- Configuração `permissions.blockReadsOutsideWorkingDirectories`: faz as ferramentas de arquivo recusarem caminhos fora dos diretórios de trabalho em qualquer modo.
- Comportamento padrão exato para leitura fora (pedir ou permitir): NÃO IDENTIFICADO na fonte lida.
- Symlinks: regra de allow só vale se o caminho pedido e o arquivo resolvido casarem.

---

## B. OpenAI Codex CLI

Fonte principal: learn.chatgpt.com/docs/agent-approvals-security (resumo de conteúdo; lido por resumo automático).

**Políticas de aprovação (`approval_policy`)**
- `on-request`: comandos dentro do sandbox rodam sem aprovação; pede antes de ações fora do sandbox (ex.: rede, se desligada).
- `never`: sem prompts de aprovação; funciona com qualquer modo de sandbox.
- `untrusted`: APOSENTADO; a página diz que o Codex não o suporta mais e que pode impedir a inicialização. A alternativa indicada é `trust_level = "untrusted"` por projeto em `~/.codex/config.toml`.
- `granular`: objeto com categorias `sandbox_approval`, `rules`, `mcp_elicitations`, `request_permissions` e `skill_approval`; cada uma pode ser interativa ou negada automaticamente.
- `approvals_reviewer`: `"user"` (padrão) ou `"auto_review"`, que envia pedidos elegíveis primeiro a um agente revisor.

**Modos de sandbox (`sandbox_mode`)**
- `read-only`: lê arquivos e roda comandos só dentro do sandbox de leitura.
- `workspace-write`: lê, edita e roda comandos no diretório de trabalho; edição fora do workspace e rede pedem aprovação.
- `danger-full-access`: sem sandbox; usado com `--dangerously-bypass-approvals-and-sandbox`.

**Predefinições**
- "Auto" = `workspace-write` + `on-request`. Ao abrir, pastas com controle de versão recebem `Auto`; pastas sem versionamento recebem `read-only`.
- Rede é desligada por padrão em `workspace-write`; liga-se com `[sandbox_workspace_write] network_access = true`.
- "Read Only" não aparece como rótulo na página; a troca para somente leitura é feita com `/permissions`.

**Flags**
- `--sandbox` (`read-only`, `workspace-write`, `danger-full-access`)
- `--ask-for-approval` ou `-a` (`on-request`, `never`)
- `--dangerously-bypass-approvals-and-sandbox` (alias `--yolo`): sem sandbox e sem aprovações; a página diz que não é recomendado.
- `--full-auto`: NÃO ENCONTRADO na fonte lida (o nome aparece em outras fontes, mas não foi verificado aqui).

**Writable roots**
- Diretório atual e temporários (ex.: `/tmp`); `/status` mostra os caminhos.
- Mesmo dentro deles, `.git`, `.agents`, `.codex` e `.aws` são somente leitura, recursivamente.
- Adicionar writable roots fora do workspace: NÃO ENCONTRADO na fonte.

**Plataformas**: macOS (Seatbelt via `sandbox-exec`); Linux (`bwrap` + `seccomp`); Windows (MXC preferido; `elevated` e `unelevated` são legados); WSL2 usa o sandbox Linux.

**Opções que o usuário vê ao aprovar um comando** ("uma vez", "nesta sessão", "sempre"): NÃO ENCONTRADO na fonte lida. Não foi possível confirmar essas opções para o Codex.

---

## C. OpenCode

Fontes: opencode.ai/docs/permissions/ e opencode.ai/docs/config/ (resumos automáticos).

**Chaves de `permission`** (CONFIRMADO)
- `*` (catch-all global), `read`, `edit` (edit, write e patch), `glob`, `grep`, `bash` (comandos parseados), `task` (subagentes), `skill`, `lsp`, `question`, `webfetch`, `websearch`, `external_directory` (caminhos fora do diretório do projeto), `doom_loop` (mesma chamada repetida 3 vezes).
- Valores: `allow`, `ask`, `deny`.
- Padrões: `*` (zero ou mais caracteres), `?` (um caractere); `~` ou `$HOME` no início expande para o home. Comando com argumento precisa de padrão explícito (`"grep *"`).
- Padrões padrão: a maioria é `allow`; `doom_loop` e `external_directory` são `ask`; `read` é `allow`, mas `.env` é negado (exceto `*.env.example`).

**Precedência**: a última regra que casa vence; por isso o `*` vem primeiro e regras específicas depois.

**Escopo**
- Global: `~/.config/opencode/opencode.json` (e `tui.json`).
- Projeto: `opencode.json` na raiz do projeto; busca do diretório atual até o diretório git mais próximo.
- Outras fontes: `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG_CONTENT`, pastas `.opencode`, config gerenciada em `/etc/opencode/` (Linux), `/Library/Application Support/opencode/` (macOS), `%ProgramData%\opencode` (Windows), e preferências macOS `.mobileconfig` (maior prioridade, não sobrescrevível).
- Ordem de precedência de configs: remota > global > customizada > projeto > `.opencode` > inline > gerenciada > mobileconfig (configs são mescladas por chave).
- Por agente: `agent.<nome>.permission` em `opencode.json` ou frontmatter `permission:` em Markdown de agente; regras do agente têm precedência sobre as globais.
- Escopo "permitir" explícito: NÃO ENCONTRADO como seção própria; a página não define escopos de permissão além do catch-all e dos padrões de bash.

**Opções do pedido de permissão** (CONFIRMADO)
- `once`: aprova só esta requisição.
- `always`: aprova requisições futuras que casem com o padrão sugerido (ex.: `git status*`) até o fim da sessão atual.
- `reject`: nega.

**Modo sem perguntas**: `--auto` em `opencode` ou `opencode run` aprova o que pediria confirmação; regras `deny` continuam valendo.

**Fora do projeto**: `external_directory` (padrão `ask`); quem nega escrita mas mantém leitura adiciona regra `edit: deny`.

---

## Tabela comparativa

| Conceito | Claude Code | Codex CLI | OpenCode |
|---|---|---|---|
| Modos | `default` (Manual), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | `approval_policy` (`on-request`, `never`; `untrusted` aposentado, `granular`) combinado com `sandbox_mode` (`read-only`, `workspace-write`, `danger-full-access`) | Sem modos nomeados; `permission` por ferramenta com `allow`/`ask`/`deny` |
| Troca de modo | Shift+Tab; `--permission-mode`; `permissions.defaultMode` | Flags `--sandbox` e `-a`; `/permissions` para somente leitura | Edição do `opencode.json` por ferramenta; flag `--auto` |
| Regras | `allow`/`ask`/`deny` por ferramenta e especificador; avaliação deny > ask > allow | Sem regras por comando na fonte lida (sandbox e política) | `allow`/`ask`/`deny` por ferramenta; última regra casa |
| Escopo de "permitir" | Uma vez; até o fim da sessão (edição); "não perguntar de novo" gravado em `settings.local.json` do repositório | "Uma vez", "sessão", "sempre": NÃO ENCONTRADO na fonte | `once` (requisição), `always` (sessão, por padrão sugerido), `reject` |
| Escopos de configuração | Gerenciado > linha de comando > projeto local > projeto compartilhado > usuário | Configuração `~/.codex/config.toml` e perfis (não detalhado na fonte lida) | Gerenciado > mobileconfig > inline > `.opencode` > projeto > customizada > global > remota |
| Modo sem perguntas | `bypassPermissions` (e `dontAsk` nega em vez de perguntar) | `never` + `danger-full-access`; `--yolo` / `--dangerously-bypass-approvals-and-sandbox` | `--auto` |
| Fora da pasta do projeto | Leitura e escrita dependem de `--add-dir` / `additionalDirectories`; `blockReadsOutsideWorkingDirectories` bloqueia leitura | Writable roots: diretório atual e temporários; adicionar fora: NÃO ENCONTRADO | `external_directory` (padrão `ask`) |
| Precedência | Deny de qualquer nível vence; gerenciado não é sobrescrito | Não detalhada na fonte lida | Última regra que casa; configs mescladas com ordem fixa |

---

## Implicações para o Rabelus Buddy

1. Padrão de mercado comum aos três: decisão por ferramenta com `allow`/`ask`/`deny` e comportamento de "deny" tendo precedência sobre "allow".
2. Padrão comum: um modo "manual" (pede antes de agir) e um modo de edição automática separado, que aceita escritas só no workspace.
3. Padrão comum: um modo de planejamento somente-leitura; no Claude Code ele é nomeado `plan`.
4. Padrão comum: um modo "sem perguntas" que existe, mas fica explicitamente marcado como perigoso e restrito a ambientes isolados (Claude Code `bypassPermissions`, Codex `--yolo`); no OpenCode, `--auto` ainda respeita `deny`.
5. Escopos comuns: sessão (aprovação única ou até o fim da sessão), projeto/repositório (regra gravada no arquivo local) e usuário/global; o Claude Code acrescenta um escopo gerenciado acima de todos, e o OpenCode também.
6. Específico do Claude Code: decisão de hook não contorna `deny`/`ask`; regra de projeto só vale após confiança do workspace; bloqueio de leitura fora do diretório é uma configuração própria.
7. Específico do Codex: separação entre política de aprovação e modo de sandbox (dois eixos independentes) e lista de caminhos protegidos mesmo dentro do workspace (`.git`, `.codex`).
8. Específico do OpenCode: padrões de comando com `*`/`?` e "última regra vence" (o oposto da ordem "deny primeiro" do Claude Code). Para o Buddy, convém escolher uma única ordem e documentá-la, porque as duas são usadas no mercado.

Lacunas declaradas: Codex (opções de aprovação do usuário, `--full-auto`, writable roots externos, escopos de configuração) e Claude Code (comportamento padrão de leitura fora do projeto) não foram confirmados na fonte lida. Nenhuma dessas afirmações foi testada na prática.

/c/Users/rabel/AppData/Local/Temp/claude/C--Users-rabel-Desktop-rabelus-lab-rabelus-buddy/beb7663d-3c57-4278-99c1-9a9bcf710174/scratchpad/onda1/w2-modos-de-permissao.md

## Histórico de verificações

- 2026-10-20T10:12:48-03:00: criação, a partir da missão W2 do piloto.
