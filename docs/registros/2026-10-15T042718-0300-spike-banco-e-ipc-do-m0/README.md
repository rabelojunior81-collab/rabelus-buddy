# Spike — banco e IPC do M0 (requisitos 1 e 7 da R5)

**Classe:** REGISTRO · **Data:** 2026-10-15T04:27:18-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-438d04`) · **Para:** SPEC 0001 (M0), perguntas 1 e 2 do handoff

## Pergunta

O `node:sqlite` embutido, com **um processo dono do banco** e clientes por IPC local, atende aos requisitos 1 (um dono, sem `SQLITE_BUSY` para o usuário, ordem total por sessão) e 7 (retomada a partir do log após `kill -9`) da [R5](../../10-pesquisa/rev-0.2/r5-concorrencia.md)? Sem instalar nada.

## Montagem

- [`dono.mjs.txt`](./dono.mjs.txt): um processo abre o SQLite em WAL (`synchronous=NORMAL`, `timeout` 5 s), escuta num named pipe (`\\.\pipe\…`, Windows) ou socket Unix e grava cada comando numa transação `BEGIN IMMEDIATE` com sequência por sessão (`UNIQUE(session, seq)`). Os eventos `effect-intent` e `effect-receipt` mantêm a tabela de efeitos.
- [`carga.mjs.txt`](./carga.mjs.txt): (1) 8 clientes simultâneos, 1.000 comandos cada, em 4 sessões; (2) escrita contínua com um efeito externo registrado como intenção, `kill -9` (SIGKILL → TerminateProcess) no meio; (3) um dono novo reabre o mesmo banco e continua.
- [`serial.mjs.txt`](./serial.mjs.txt): latência de ida e volta com um pedido por vez (2.000 pedidos).
- Ambiente: Windows 11 Pro, Node v26.11.1, SQLite 3.53.4 (embutido).

Os scripts estão com `.txt` porque são evidência, não ferramenta do repositório (não têm teste).

## Resultado (segunda execução, a registrada; a primeira teve números da mesma ordem)

| Teste | Resultado |
|---|---|
| R5-1 carga | 8.000 eventos, **0 erros, 0 `SQLITE_BUSY`, 0 sessões com buraco de sequência**; 12.675 eventos/s |
| Latência em rajada (1.000 pedidos enfileirados por cliente) | p50 609 ms (é fila, não serviço) |
| Latência de ida e volta, 1 pedido por vez | **p50 0,081 ms · p95 0,240 ms · p99 0,414 ms** |
| R5-7 `kill -9` no meio da escrita | `integrity_check` = **ok**; 2.052 eventos, sem buraco; efeito externo **"pendente"** (nunca "concluído" sem recibo) |
| Retomada | o dono novo continua a sequência: 2.062 eventos, sem buraco |

Saídas brutas: [`resultado-carga.jsonl`](./resultado-carga.jsonl), [`resultado-serial.jsonl`](./resultado-serial.jsonl).

## Leitura

- **CONFIRMADO, neste host:** um dono com `node:sqlite` em WAL e IPC por named pipe atende aos critérios observáveis dos requisitos 1 e 7, com folga de desempenho para um usuário.
- **NÃO medido:** Linux e macOS (socket Unix); Node 24 LTS (o piso do projeto), onde a classe se chama `DatabaseSync`; `better-sqlite3` (instalar exigiria autorização); falta de energia real (`kill -9` não simula perda de cache de disco).
- O critério de aceite da SPEC repete estes testes nos três sistemas, na CI.

## Adendo — matriz 3 SOs × Node 24/26 (2026-10-15T04:39:19-03:00)

Rodado no GitHub Actions (run [38700033340](https://github.com/rabelojunior81-collab/rabelus-buddy/actions/runs/38700033340), branch `spike/m0-banco-ipc-3-sos`, que não vai para a `main`). Saídas brutas: [`resultado-matriz-ci.jsonl`](./resultado-matriz-ci.jsonl).

| SO | Node | SQLite | R5-1: erros / BUSY / buracos | Vazão em rajada (ev/s) | Ida e volta p50 / p99 (ms) | R5-7: integridade / efeito | Retomada |
|---|---|---|---|---|---|---|---|
| Linux | 24.21.0 | 3.53.4 | 0 / 0 / 0 | 2.182 | 0,080 / 0,325 | ok / pendente | contínua |
| Linux | 26.12.0 | 3.54.0 | 0 / 0 / 0 | 8.810 | 0,148 / 0,511 | ok / pendente | contínua |
| macOS | 24.20.0 | 3.53.4 | 0 / 0 / 0 | 28.938 | 0,078 / 0,238 | ok / pendente | contínua |
| macOS | 26.12.0 | 3.54.0 | 0 / 0 / 0 | 24.485 | 0,069 / 0,244 | ok / pendente | contínua |
| Windows | 24.21.0 | 3.53.4 | 0 / 0 / 0 | **331** | 0,194 / 2,240 | ok / pendente | contínua |
| Windows | 26.12.0 | 3.54.0 | 0 / 0 / 0 | 2.941 | 0,190 / 0,440 | ok / pendente | contínua |

**Leitura:**
- **CONFIRMADO:** os critérios dos requisitos 1 e 7 passam nos três SOs e nas duas linhas do Node, inclusive o Node 24, que é o piso, com a classe `DatabaseSync`.
- **Observação:** a vazão em rajada varia quase 100 vezes entre os runners. O pior caso é o Windows com Node 24 (331 eventos/s). A latência de um pedido por vez fica abaixo de 0,2 ms em todos.
- **HIPÓTESE:** a diferença vem do disco do runner com `fsync` por transação (`synchronous=NORMAL` no WAL) e do SQLite mais antigo no Node 24. Não medi a causa.
- Para um usuário humano, mesmo 331 eventos/s sobra. A SPEC registra o risco, e a M0.2 mede a vazão como métrica.

**Adendo (2026-10-16):** a branch `spike/m0-banco-ipc-3-sos` foi arquivada pelo `bd prune` na tag anotada `archive/spike/m0-banco-ipc-3-sos-2026-10-16T002854-0300`, que preserva o commit `77160c5` (workflow do spike). A branch não existe mais; a tag está no remoto.
