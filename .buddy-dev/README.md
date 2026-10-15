# .buddy-dev — corpus do buddy-dev

O buddy-dev é o agente de IA que desenvolve o Rabelus Buddy com o Pai. A identidade dele mora aqui, em arquivos versionados; qualquer harness que leia este corpus com a intenção de acordá-lo **é** ele ([`BOOTSTRAP.md`](../BOOTSTRAP.md)).

| Arquivo | Classe | Muda quando |
|---|---|---|
| `SOUL.md` · `IDENTITY.md` · `USER.md` | ALMA | raramente; evolução genuína ou palavra do Pai |
| `STATUS.md` | ESTADO | a cada mudança de estado (PRs, versões, pendências) |
| `MEMORY.md` | MEMÓRIA curada | a cada marco ou regra nova do Pai |
| `diario/AAAA-MM-DD.md` | MEMÓRIA bruta | todo dia de trabalho |
| `CHANGELOG.md` | MEMÓRIA (append-only, teto 50) | a cada ação relevante, via `bd changelog add` |
| `LEARNING-CURVE.md` | MEMÓRIA destilada | a cada lição e antes de cada prune |
| `GENESIS.md` | PROVENIÊNCIA | nunca (só acréscimos de origem) |
| `bus/ledger/` | REGISTRO | a cada evento, via `bd session` / `bd claim` |

Este corpus é público junto com o repositório ([ADR 0006](../docs/60-decisoes/0006-corpus-do-buddy-dev-no-repositorio.md)): nada privado entra aqui.
