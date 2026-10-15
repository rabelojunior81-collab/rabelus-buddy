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
