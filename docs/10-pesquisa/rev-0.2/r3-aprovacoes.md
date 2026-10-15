# R3 — Aprovações sem fadiga

**Revisão:** 0.2 · **Limite tratado:** 5 (fadiga de aprovação não tratada) · **Autor:** buddy-dev (claude-code-5c038b), com extração por subagente conferida por amostragem · **Data:** 2026-10-14

## O problema

O briefing exige aprovação humana para 8 classes de ação. Se cada edição de arquivo e cada comando pedir confirmação, um agente de código vira uma fila de "sim". O dado mais forte vem da Anthropic: **"Claude Code users approve 93% of permission prompts. Over time that leads to approval fatigue, where people stop paying close attention to what they're approving."** (✔ anthropic.com/engineering/claude-code-auto-mode, 2026-03-25). Aprovação em excesso não protege: treina o humano a não ler.

## Como os harnesses atuais resolvem

✔ = conferido pelo buddy-dev na fonte; demais itens vêm da extração do subagente, com URL (todas acessadas em 2026-10-14).

| Harness | Modos | Regras | Memória de concessões | Proteções |
|---|---|---|---|---|
| Claude Code | `default` (Manual), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | `allow`/`ask`/`deny` com `Tool(especificador)`: `Bash(npm run *)`, `Edit(/src/**/*.ts)`, `WebFetch(domain:x)`; casamento por subcomando | Bash e WebFetch: permanente por repositório; edições: até o fim da sessão | ordem deny → ask → allow; caminhos protegidos (`.git`, `.claude`); hooks PreToolUse; sandbox; modo `auto` com classificador |
| Codex CLI | `approval_policy`: `on-request`, `never`, `granular`; `sandbox_mode`: `read-only`, `workspace-write`, `danger-full-access` | `prefix_rule(...)` com `allow`/`prompt`/`forbidden` | regras persistidas por usuário | "most restrictive wins"; `.git`, `.codex`, `.aws` somente leitura; rede desligada; revisor automático que "fails closed" |
| OpenCode | `allow`/`ask`/`deny`; `--auto` | chaves por ferramenta com globs; `doom_loop` | `once`/`always`/`reject`; `always` vale até o fim da sessão | **última regra que casa vence** (contraexemplo); `*.env` negado por padrão; padrão permissivo |
| Gemini CLI | `default`, `autoEdit`, `plan`, `yolo` | políticas TOML com `commandPrefix`, `commandRegex`, prioridade | "para sempre" só se habilitado | pastas confiáveis; `ask_user` vira `deny` sem interação |
| VS Code (Copilot) | Manual, Assisted (experimental, juiz LLM), Allow all | `chat.tools.terminal.autoApprove` por string ou regex; `false` vence | uso único, sessão, workspace ou sempre | sandbox de terminal vale mesmo em "Allow all" |
| MCP (spec 2026-07-28) | não impõe modelo de interação | anotações de ferramenta são "untrusted" | — | "there SHOULD always be a human in the loop"; credenciais só por elicitação em modo URL |
| ✔ ACP | `session/request_permission` | opções `allow_once`, `allow_always`, `reject_once`, `reject_always` | "remember the choice" (onde, não especificado) | "Clients MAY automatically allow or reject permission requests according to the user settings." |

Dados do classificador do modo `auto` do Claude Code (✔, mesmo post): no pipeline completo, **0,4%** de falsos positivos em tráfego real (n=10.000) e **17%** de falsos negativos em ações excessivas reais (n=52), que o texto chama de "the honest number". Classificador reduz prompts, mas deixa passar ações perigosas.

## Padrões que se repetem

1. **Isolamento de SO substitui prompt:** dentro do sandbox e do workspace, comandos rodam sem pedir (Claude Code, Codex `workspace-write`, VS Code).
2. **Regras por prefixo de comando e por caminho**, avaliadas por subcomando.
3. **Negação vence** (Claude Code, Codex, VS Code). OpenCode é a exceção, com "última regra vence".
4. **Concessão com escopo:** uma vez, sessão, projeto, sempre.
5. **Caminhos protegidos** que nenhum modo libera.
6. **Detecção de laço** (`doom_loop`) e pausa do modo automático após bloqueios repetidos.
7. **Sem interação = negar.**
8. **Segurança no ponto de integração:** o agente de nuvem do Copilot trabalha numa branch e o humano aprova o PR.

## Proposta para o Rabelus Buddy

Reinterpretar as 8 classes do briefing como **pontos de decisão com escopo**, não como prompt por chamada. Onde a decisão acontece muda; a exigência de aprovação humana não.

| Classe do briefing | Onde o humano decide | Padrão proposto |
|---|---|---|
| 1. Criar ou alterar arquivos | **Na integração** do worktree da sessão (diff revisável, com rollback) | Livre dentro do worktree; aprovação no merge |
| 2. Executar comandos no terminal | **Na política da sessão** | Livre dentro do S1 (R2) e do workspace; regras por prefixo para o resto; caminhos protegidos |
| 3. Apagar arquivos ou dados | Cada vez, com o que será apagado | Sempre pergunta; no workspace, "apagar" é arquivar (regra pétrea da casa) |
| 4. Alterar sistemas externos por API | Cada vez, ou concessão por sessão para um destino específico | `ask`; `allow_always` só por destino e só por projeto |
| 5. Enviar mensagens em canais | Cada vez, ou concessão por sessão para uma conversa | `ask`; concessão por sessão e por conversa |
| 6. Usar credenciais ou segredos | Cada vez | Sempre pergunta; segredo nunca entra no contexto do modelo |
| 7. Instalar pacotes ou plugins | Cada vez, com a origem e o hash | Sempre pergunta |
| 8. Gastar acima do limite | Reserva de orçamento (R5, requisito 6) | Bloqueia acima do teto; pede para escalar de camada (R1) |

Regras do motor de política (candidatas à SPEC do M2):
- avaliação **deny → ask → allow**, com negação vencendo sempre (não seguir o modelo do OpenCode);
- escopos de concessão: uma vez, sessão, projeto (persistido e auditado), nunca "global" por padrão;
- caminhos protegidos fixos: `.git`, `.buddy-dev`, `archive/`, credenciais;
- sem interação, `ask` vira `deny`;
- detecção de laço: 3 chamadas idênticas pausam a sessão;
- compatível com ACP: as escolhas do humano mapeiam para `allow_once`, `allow_always`, `reject_once`, `reject_always`;
- **modo com classificador fica fora do M2:** os 17% de falsos negativos medidos pela própria Anthropic pedem cautela; reavaliar depois.

## Decisão do Pai

A proposta muda a leitura do briefing (§9.4) em duas classes: **(1) criar/alterar arquivos** passa a ser aprovado na integração do worktree, e **(2) executar comandos** passa a ser livre dentro do sandbox e do workspace. O resto continua pedindo aprovação a cada vez ou por escopo estreito. **Aceita?**

A pendência "pesquisa na web exige aprovação?" continua aberta; a proposta é tratá-la como rede: livre para domínios da lista da sessão, `ask` para o resto.

## Estado do limite 5

**Resolvido no nível de pesquisa**, condicionado à decisão do Pai acima.
