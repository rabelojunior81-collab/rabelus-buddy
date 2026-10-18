# Checagem real: sonda ACP nos harnesses do Pai

**Classe:** REGISTRO · **Data:** 2026-10-18T19:55:29-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-a6ad15`) · **Para:** SPEC 0002, critério 3 (AGENTS §5.9)

## Aperto de mão (`initialize`), por script, às ~15:55

Sem login, sem tarefa e sem baixar nada. Os processos subiram sem janela e foram encerrados com a árvore.

| Harness | Versão instalada | Tempo | Imagem | Métodos de login |
|---|---|---|---|---|
| OpenCode | 2.0.31 | 0,7 s | sim | `opencode-login` |
| Hermes | 0.22.2 | 6 s | sim | `openai-codex`, `hermes-setup` (tipo terminal) |
| Copilot | 1.0.97 | 3,3 s | sim | `copilot-login` |

Todos respondem com `protocolVersion: 1`. O OpenCode instalado é **mais novo** que o do registro (1.19.3), o que reforça a preferência pelo executável local.

## Sonda completa pelo código do núcleo (`initialize` + `session/new`), às 19:52

| Harness | Estado | Tempo |
|---|---|---|
| Copilot | **pronto** | 4,8 s |
| OpenCode | **pronto** | 4,2 s |
| Hermes | **pronto** | 14,1 s |
| Claude, Codex, pi | aguarda aprovação (`npx` baixa o adaptador) | — |

- O OpenCode e o Copilot fecharam a sessão de teste (`session/close`). O Hermes não oferece fechar, e a sessão de teste fica no histórico dele.
- Nenhum processo sobrou e nenhuma janela abriu, conferido pela lista de processos.
- O Hermes levou 14 s: o limite padrão da sonda subiu de 20 para 30 s.

## Codex

O `codex-cli` 0.163.0 instalado **não** fala ACP direto: não tem subcomando `acp`, só `app-server` (experimental, protocolo próprio) e `exec`. O caminho é o adaptador `npx @agentclientprotocol/codex-acp@2.2.2`, que exige a aprovação do Pai na primeira execução (critério 4, M1.2b). Ele será o primeiro alvo.

## Achados no caminho

- **Programas do sistema chamados pelo nome** (`cmd.exe`, `taskkill`, `powershell.exe`) não resolvem com o PATH reduzido (`spawn cmd.exe ENOENT`). Na sonda e no `bd serve`, eles passaram a ser chamados pelo caminho do sistema.
- O "precisa de login" do ACP chega no `session/new` como erro `-32000`, não no `initialize`.
