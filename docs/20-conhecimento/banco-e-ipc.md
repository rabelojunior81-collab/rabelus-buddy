# Banco embarcado e IPC local (núcleo do M0)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-15T04:39:19-03:00 · **Estado:** vigente (reverificar quando o `node:sqlite` sair de Release candidate)

## O que importa para o buddy

- O `node:sqlite` está em **Release candidate** (Stability 1.2) no Node 24 LTS e no 26, sem flag. Dá para ter banco sem dependência nativa.
- **Mudança de nome entre as linhas:** no Node 24 a classe é `DatabaseSync`; no 26.12 ela vira `Database`, e `DatabaseSync` passa a ser alias obsoleto (DEP0210). O núcleo precisa de um adaptador fino que aceite as duas.
- A API é **síncrona**. Com um único processo dono escrevendo, isso é vantagem: transações curtas e ordem total sem `SQLITE_BUSY`.
- O IPC local sai do `node:net`: named pipe no Windows (`\\.\pipe\…`) e socket Unix no Linux e no macOS. É a mesma API nos três.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| `node:sqlite`: "Stability: 1.2 - Release candidate"; classe `DatabaseSync`; opção `timeout` (busy timeout, padrão 0) desde a v24.0.0 | https://nodejs.org/docs/latest-v24.x/api/sqlite.html (tier 0, docs v24.22.0) | 2026-10-15 |
| No v26.12.0: classe `Database`; `DatabaseSync` é alias obsoleto (DEP0210); "All APIs exposed by this class execute synchronously"; sem flag desde v23.4.0/v22.13.0; RC desde v25.7.0 | https://nodejs.org/api/sqlite.html (tier 0, docs v26.12.0) | 2026-10-15 |
| O Node v26.11.1 embarca SQLite 3.53.4 | medição local (`select sqlite_version()`) | 2026-10-15 |
| No WAL, um escritor por vez; todos os processos no mesmo host; checkpoint automático a 1.000 páginas | https://sqlite.org/wal.html (via R5, tier 0) | 2026-10-14 |
| `better-sqlite3` 13.0.3, MIT, Node ≥ 22 (módulo nativo) | registro npm (tier 1) | 2026-10-15 |
| `node:net`: "On Windows, the local domain is implemented using a named pipe. The path must refer to an entry in `\\?\pipe\` or `\\.\pipe\`"; pipes somem quando o dono sai; socket Unix até 107 bytes (Linux) e 103 (macOS) de caminho e precisa de `unlink` depois de queda; `readableAll`/`writableAll` desligados por padrão | https://nodejs.org/api/net.html (tier 0) | 2026-10-15 |
| Matriz no GitHub Actions (Linux, macOS, Windows × Node 24.2x e 26.12.0): requisitos 1 e 7 passam em todas; vazão em rajada de 331 (Windows, Node 24) a 28.938 eventos/s (macOS, Node 24); ida e volta p50 entre 0,069 e 0,194 ms; o Node 26.12.0 embarca SQLite 3.54.0 | [adendo do spike](../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md) | 2026-10-15 |
| Spike no Windows (Node 26.11.1): 8 clientes × 1.000 comandos, 0 `SQLITE_BUSY`, sem buraco; ida e volta p50 0,081 ms; `kill -9` com banco íntegro e efeito "pendente" | [registro do spike](../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md) | 2026-10-15 |

## Explicação

O SQLite em WAL aceita vários leitores e **um** escritor. Se vários processos escrevem, um espera ou recebe `SQLITE_BUSY`. O requisito 1 da R5 resolve isso pela arquitetura: só o processo dono escreve; CLIs, UIs e runners pedem por IPC. A API síncrona do `node:sqlite` deixa cada comando numa transação curta, e o laço de eventos serializa naturalmente.

Socket Unix e named pipe servem ao mesmo uso com a mesma API do `node:net`. Muda só o caminho: arquivo no Unix, namespace `\\.\pipe\` no Windows. O socket Unix deixa arquivo órfão quando o processo cai; o dono precisa limpá-lo na partida.

## Implicações

- **SPEC 0001:** `node:sqlite` atrás de um adaptador (`DatabaseSync` no 24, `Database` no 26+). `better-sqlite3` fica como plano B documentado, sem instalar.
- **IPC:** JSON-RPC 2.0 por linhas sobre `node:net`, o mesmo modelo de mensagem do ACP (M1). O caminho do endpoint sai do diretório de estado do usuário, com permissão só para ele.
- **CI:** os testes dos requisitos 1 e 7 rodam em Windows, Linux e macOS antes de o M0 fechar.

## Histórico de verificações

- 2026-10-15T04:27:18-03:00 · buddy-dev (claude-code-vs-code-438d04) · criação da ficha, com o spike
- 2026-10-15T04:39:19-03:00 · buddy-dev (claude-code-vs-code-5cfc7b) · matriz 3 SOs × Node 24/26 no CI
