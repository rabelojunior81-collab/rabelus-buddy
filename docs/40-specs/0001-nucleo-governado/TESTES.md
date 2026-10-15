# Desenho dos testes — SPEC 0001 (M0)

**Classe:** CONTRATO (anexo da [SPEC](./SPEC.md)) · **Estado:** rascunho, segue a SPEC · **Data:** 2026-10-15

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
| 14 | `reserva atômica entre sessões` | teto com saldo para 1 chamada; N sessões simultâneas → exatamente 1 chamada ao `fakeProvider`; as outras bloqueadas sem custo | M0.5 |
| 15 | `liquidação pelo uso real` | sequência de chamadas com `usage` conhecido → gasto do mês = soma das liquidações = valor calculado pela fórmula da [ficha](../../20-conhecimento/bibliotecas-do-nucleo.md) | M0.5 |
| 16 | `teto estourado para a tarefa` | saldo abaixo da reserva → tarefa para com `budget.capReached`; escalar pede aprovação | M0.5 |
| 17 | `nenhuma chamada acima de 100k` | conversa que cresce até 150k tokens estimados → toda chamada ao `fakeProvider` ≤ 100k; eventos de compactação presentes | M0.6 |
| 18 | `segredos nunca vazam` | `secretCanary` como chave e em `.env` lido pelo agente → busca do valor no banco, no log de auditoria, na saída da CLI e nos arquivos temporários → zero ocorrências | M0.7 |
| 19 | `catálogo completo e troca de idioma` | toda chave usada no código existe em `pt-BR` e `en` (varredura estática); `--lang en` e `RBUDDY_LANG=pt-BR` mudam a saída de `status` | M0.1 / M0.7 |
| 20 | `store false e fórmula de liquidação` | espião no adaptador → toda requisição com `store: false`; resposta com `cached_tokens` e `cache_write_tokens` → custo igual ao da fórmula | M0.6 |
| 21 | demonstração (manual, com o Pai) | roteiro: tarefa real num repositório de teste → aprovações → `kill -9` → `resume` → `log` mostra cada aprovação e custo, sem efeito duplicado | M0.8 |

## O que não é teste automático no M0

- Acesso ao named pipe por **outro usuário** do Windows (risco da SPEC): verificação manual registrada; vira automática no M2.
- Critério 21: validado pelo Pai, com registro em `docs/registros/`.
