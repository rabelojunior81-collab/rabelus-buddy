# Validações

**Classe:** CÂNONE · **Versão:** 0.1 · **Data:** 2026-10-16 · **Origem:** ordem do Pai em 2026-10-16: "ampliar o suficiente, necessário e oportuno, nossa governança, para garantirmos também esse Enforcement", sabendo que algumas validações só ele pode constatar.

Toda validação do projeto mora num registro só, [`validacoes.json`](./validacoes.json). Cada uma diz **quem constata**, **onde roda** e **qual mecanismo** a faz valer.

| Campo | O que é |
|---|---|
| `id`, `descricao` | o nome curto e o que se valida |
| `quem` | `maquina` (ferramenta ou CI), `buddy` (o buddy-dev, por checklist) ou `pai` (só o Pai constata) |
| `onde` | `bd pre`, `bd post`, CI, rotina semanal, `bd merge`, checklist do PR, um marco… |
| `mecanismo` | `bd` (comando), `ci` (trecho do workflow) e/ou `teste` (arquivo de teste) |
| `estado` | para as do Pai: `pendente` (aguarda ele), `recorrente` (a cada ocorrência) ou `feito` |
| `origem` | quem pediu e quando |

## O que o `bd validacoes` confere

Roda no `bd post` e na CI.

1. Toda validação de **máquina** tem mecanismo. Regra sem mecanismo é desejo.
2. Todo comando `bd` citado existe na ajuda e no código.
3. Todo passo de CI citado existe em `.github/workflows/`.
4. Todo teste citado existe.
5. Nenhum campo obrigatório falta e nenhum `id` se repete.

As validações do **Pai** com `estado: pendente` aparecem no `bd pre` de toda sessão e na saída do `bd validacoes`. Nada que dependa dele some no caminho.

## Ciclo das branches (a validação `prune` e a `merge-governado`)

- **`bd merge <PR>`** confere, antes de qualquer coisa:
  - o PR aberto, sem conflito e com todas as checagens verdes;
  - a branch atual igual à do PR;
  - o `bd post` limpo.

  Só então faz o merge commit, atualiza a `main` e roda o `bd prune`.
- **`bd prune`** classifica cada branch local e remota:
  - **mergeada na `main`:** removida;
  - **com PR aberto, atual, ou com trabalho de até 14 dias:** mantida;
  - **sem PR e parada há mais de 14 dias, ou com arquivo pedido (`--arquivar`):** ganha a **tag anotada** `archive/<branch>-<carimbo>` no remoto e então é removida. A tag é a lápide e preserva os commits.
- **`bd pre`** reprova o início de sessão se houver branch para podar.
- **No GitHub:** "Automatically delete head branches" ligado, e só merge commit permitido (squash e rebase desligados, ADR 0003). Configurado em 2026-10-16.

## Para adicionar uma validação

1. Entrada nova em `validacoes.json`.
2. Se for de máquina: o mecanismo (comando, passo de CI ou teste), **com teste**.
3. `bd validacoes` verde.
4. Superfícies do evento ([`SUPERFICIES.md`](./SUPERFICIES.md)).
