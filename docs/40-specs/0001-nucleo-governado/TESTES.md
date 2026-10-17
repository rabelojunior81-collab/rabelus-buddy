# Desenho dos testes — SPEC 0001 (M0)

**Classe:** CONTRATO (anexo da [SPEC](./SPEC.md)) · **Estado:** rascunho, segue a SPEC (revisão 2) · **Data:** 2026-10-15

Cada critério de aceite tem um teste nomeado antes do código (METODO §3.5). Todos usam `node:test`, rodam pelo `npm test` e, salvo indicação, rodam na matriz Windows, Linux e macOS × Node 24 e 26.

**Peças comuns de teste:**

| Peça | Para quê |
|---|---|
| `fakeProvider` | provedor determinístico: respostas roteirizadas, `usage` com os campos reais da Responses API, latência e falhas injetáveis (timeout, queda no meio) |
| `tempHome()` | diretório de estado isolado por teste (banco, endpoint IPC, config) |
| `spawnDaemon()` / `killDaemon(SIGKILL)` | dono em processo filho; morte abrupta sem limpeza |
| `cli(args, { lang, tty })` | roda a CLI como processo, com ou sem terminal interativo, e captura a saída |
| `fakeClock` | tempo controlado para janelas, prazos e mês do orçamento |
| `secretCanary` | valor único posto como chave de API e em `.env` de teste, procurado em todos os artefatos |

## Testes por critério

| # | Teste | Montagem → ação → verificação | Sub-fase |
|---|---|---|---|
| 1 | `ipc concorrente sem SQLITE_BUSY e com sequência contígua` | dono + 2 CLIs × 1.000 comandos em paralelo → todas as respostas sem erro; `seq` contíguo por sessão (reaproveita o desenho do [spike](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md)) | M0.2 |
| 2 | `segundo daemon recusa e o primeiro segue` | dono vivo → `daemon start` de novo → saída do catálogo `daemon.alreadyRunning`, código ≠ 0; o primeiro responde a `status` | M0.2 |
| 3 | `projeções reconstruídas a partir do log` | sessão com 200 eventos variados → apagar projeções → `rebuild` → hash das projeções igual ao de antes | M0.2 |
| 4 | `kill -9 deixa execução interrompida e efeito desconhecido` | `fakeProvider` lento → `SIGKILL` no meio da chamada → reiniciar → execução `interrupted`, efeito `unknown`, `integrity_check = ok` | M0.3 |
| 5 | `aprovação pendente sobrevive à queda` | `write_file` pendente → `SIGKILL` → reiniciar → `approvals` lista; `approve` resolve; a escrita acontece uma vez | M0.3 |
| 6 | `efeito desconhecido bloqueia nova tentativa` | efeito `unknown` → agente tenta repetir → bloqueio `effect.needsReconciliation`; depois de `reconcile`, segue | M0.3 |
| 7 | `caminhos protegidos negados mesmo com concessão` | concessão de projeto para `write_file` → tentar `.git/`, `.buddy-dev/`, `archive/`, `.env`, `x.pem`, `x.key` com cada ferramenta → todas negadas, com motivo | M0.4 |
| 8 | `deny vence allow` | regras conflitantes casando a mesma ação → negada | M0.4 |
| 9 | `ask sem terminal vira deny` | `cli(..., { tty: false })` com ação `ask` → negada; evento com motivo `nonInteractive` | M0.4 |
| 10 | `escopos de concessão` | concessão de sessão → não vale em outra sessão; concessão de projeto → vale depois de reiniciar e aparece na auditoria | M0.4 |
| 11 | `três chamadas idênticas pausam a sessão` | `fakeProvider` repete a mesma ferramenta 3× → sessão `paused`, pedido de intervenção | M0.4 |
| 12 | `escrita com compare-and-set` | agente lê um arquivo → humano altera → agente tenta escrever → conflito `file.changedSinceRead` | M0.4 |
| 13 | `run_command nunca roda sem aprovação` | todas as combinações de concessão do M0 → nenhum processo filho criado sem aprovação explícita (espião em `child_process`) | M0.4 |
| 14 | `reserva atômica entre sessões` | janela com saldo para 1 chamada; N sessões simultâneas → exatamente 1 chamada ao `fakeProvider`; as outras bloqueadas sem consumo | M0.5 |
| 15 | `liquidação pelo uso real` | sequência de chamadas com `usage` conhecido → consumo de cada janela = soma das liquidações = valor da fórmula da [ficha](../../20-conhecimento/bibliotecas-do-nucleo.md) | M0.5 |
| 16 | `janela esgotada troca de provedor ou para` | janela do Go esgotada (própria ou por 429) → troca para o SIWC se a política permitir, ou para com `budget.windowExhausted`; a API paga nunca passa de US$ 20 no mês | M0.5 / M0.6 |
| 17 | `go: rota, sdk e identificação` | `fakeGo` (servidor HTTP local nas quatro rotas) → cada modelo vai pela rota e pelo SDK certos; toda requisição com `User-Agent: rabelus-buddy/<versão>` e o mesmo `x-opencode-session` na sessão | M0.6 |
| 18 | `siwc: contrato da prévia` | `fakeOpenAI` com streaming → toda requisição com `store: false` e `stream: true`, sem campos proibidos (`max_output_tokens`, `temperature`, `metadata`…); sucesso só em `response.completed`; texto e chamadas de ferramenta lidos de `response.output_item.done` quando o `output` final vem vazio (formato do backend real); `response.failed` com `subscription_sharing_usage_limit_exceeded` esgota a janela | M0.6 |
| 19 | `siwc: login oauth` | `fakeAuth` local → PKCE S256 conferido no token; callback em `127.0.0.1`; `state`/`nonce` novos por tentativa; `ext_agent_host_id` estável; refresh troca os três campos juntos | M0.6 |
| 20 | `modelos que treinam negados por padrão` | pedir `gemini-4-argon-contributor` sem concessão → negado com motivo; com concessão de projeto → permitido e auditado | M0.4 / M0.6 |
| 21 | `nenhuma chamada acima de 100k` | conversa que cresce até 150k tokens estimados → toda chamada ao `fakeProvider` ≤ 100k; eventos de compactação presentes | M0.6 |
| 22 | `segredos e tokens nunca vazam` | `secretCanary` como chave do Go, como token OAuth e em `.env` lido pelo agente → busca do valor no banco, no log de auditoria, na saída da CLI e nos temporários → zero ocorrências; permissão do arquivo de credenciais só do dono | M0.7 |
| 23 | `catálogo completo e troca de idioma` | toda chave usada no código existe em `pt-BR` e `en` (varredura estática); `--lang en` e `RBUDDY_LANG=pt-BR` mudam a saída de `status` | M0.1 / M0.7 |
| 24 | `bd deps verde` | o `bd deps` do repositório passa na CI (registro, versão exata, licença, prazo) | M0.1 |
| 25 | `bd test-guard verde` | o `bd test-guard` passa contra a base em todo PR do M0 | M0.1 |
| 26 | demonstração (real, com o Pai, pela console; rev. 5) | ensaio do buddy-dev no ambiente do Pai (registro) → o Pai entra com o ChatGPT pela console, roda tarefa real, aprova/nega, muda o esforço; queda do núcleo e "Retomar" sem efeito duplicado; um passo pelo ChatGPT; consumo e troca de provedor visíveis | M0.9 |
| 27 | `console: só local, com token e Host` | servidor da console: sem token → 401; `Host` diferente → 403; nenhuma aprovação ou chave muda nesses casos; escuta só em 127.0.0.1 | M0.8 |
| 28 | `console: catálogo` | toda chave usada pela página existe em pt-BR e en (varredura); trocar o idioma muda os textos (navegador real no ensaio) | M0.8 |
| 29 | `esforço por rota` | espião no transporte de cada rota: `reasoning.effort`, `reasoning_effort` (OpenRouter: `reasoning.effort`), `thinking.budget_tokens`, `thinkingConfig`; padrão não envia; recusa do esforço → uma repetição sem ele e evento | M0.8 |
| 30 | `console: ações e conversa` | pela API da console: aprovar/negar, guardar chave (nunca devolvida), continuar a conversa com o histórico, retomar, iniciar login do ChatGPT (URL da OpenAI) e ver a conclusão | M0.8 |
| 31 | `andamento ao vivo` | servidor falso em fluxo com a sequência medida (Chat: `delta.reasoning`, `delta.content`, `tool_calls` em partes, uso no último pedaço; SIWC: `reasoning_summary_text.delta`, `output_text.delta`) → o adaptador entrega fragmentos na ordem e o mesmo resultado final; o pedido do SIWC leva `reasoning.summary` só com esforço; `run.live` mostra fase, raciocínio e texto parciais durante a chamada e nada depois | M0.8d |
| 32 | `raciocínio registrado` | passo com raciocínio → evento `agent.reasoning` com execução, passo e rota; sem raciocínio, nenhum evento; a console tem o bloco recolhível (varredura da página) | M0.8d |
| 33 | `uma execução por conversa; parar` | `agent.run` com execução rodando na sessão → `run.busy` e nenhum evento novo; `agent.stop` durante uma chamada pendurada → a chamada é abortada, a execução fica `stopped` com `userStopped`, a aprovação pendente é negada; retomar depois funciona | M0.8d |
| 34 | `console lembra` | funções puras da página: sessão e preferência guardadas e lidas do armazenamento local, com falha de armazenamento tolerada; ensaio no navegador real recarregando a página | M0.8d |

## O que não é teste automático no M0

- Acesso ao named pipe por **outro usuário** do Windows (risco da SPEC): verificação manual registrada; vira automática no M2.
- Critério 26: validado pelo Pai, com registro em `docs/registros/`.
- Mais peças comuns na revisão 2: `fakeGo`, `fakeOpenAI` (com streaming) e `fakeAuth` (servidor OAuth local).
