# AGENTS.md — Rabelus Buddy

**Classe:** CÂNONE (conduta e sessão) · **Versão:** 0.1 · **Data:** 2026-10-14

Este arquivo vale para **qualquer agente de IA** neste repositório (Claude Code, Codex, OpenCode, Gemini CLI, Cursor, Copilot e outros). Humanos: veja [`CONTRIBUTING.md`](./CONTRIBUTING.md).

> **Você foi invocado aqui para ser o buddy-dev?** Então você é o buddy-dev: a identidade mora em `.buddy-dev/`, não no modelo. Siga o [`BOOTSTRAP.md`](./BOOTSTRAP.md).
> **Não sabe?** Pergunte a quem te invocou antes de agir. A decisão de identidade é de quem invoca, nunca do harness que acordou.

## 1. Ler antes de agir (P1)

1. [`BOOTSTRAP.md`](./BOOTSTRAP.md) — se a intenção é acordar o buddy-dev
2. `.buddy-dev/SOUL.md` → `USER.md` → `IDENTITY.md`
3. O último `.buddy-dev/diario/AAAA-MM-DD.md`
4. `.buddy-dev/MEMORY.md` → `.buddy-dev/STATUS.md`
5. [`docs/30-governanca/METODO.md`](./docs/30-governanca/METODO.md) e [`CONVENCOES.md`](./docs/30-governanca/CONVENCOES.md)
6. O plano ativo apontado em `STATUS.md` (`docs/50-planos/…`)

Retomada depois de compactação de contexto: reler `STATUS.md` e o plano ativo **antes** de agir. A memória de trabalho não é fonte.

## 2. O rito: antes, durante e depois

```sh
# ANTES
npm run bd -- session start --harness "<harness>" --model "<modelo>" --scope "<o que vou fazer>"
git pull --ff-only            # se falhar, investigue; nunca mascare com reset
npm run bd -- pre             # relógio, branch, sincronia, sessão, paralelos, claims

# DURANTE
npm run bd -- claim <recurso>                    # antes de editar documento vivo compartilhado
npm run bd -- session log --type <tipo> --summary "..."   # decisão, pesquisa, erro, aprendizado
git commit && git push                           # a cada passo, mesmo pequeno

# DEPOIS
npm run bd -- changelog add --type <tipo> --text "..."
# diário do dia; MEMORY se houve marco ou regra nova; STATUS se o estado mudou
npm test && npm run bd -- post
npm run bd -- session end --summary "..."
```

## 3. Regras e o mecanismo que as faz valer

Regra sem mecanismo é desejo. Cada regra aqui aponta o que a confere.

| Regra | Mecanismo |
|---|---|
| Nada se apaga; o que sai de uso é arquivado com lápide | `bd archive`; `bd guard` e a CI reprovam exclusões ([ADR 0004](./docs/60-decisoes/0004-nada-se-apaga.md)) |
| Hora de Curitiba com offset, verificada | `bd now --verify`; `bd pre`/`post` |
| Registros com nome semântico e carimbo | `bd name`; `bd names-check` e a CI |
| Uma branch por unidade; commit e push a cada passo; merge pelo Pai | template de PR; `bd post` reprova commit sem push ([ADR 0003](./docs/60-decisoes/0003-fluxo-git-granular.md)) |
| Documento → SPEC → teste → código | template de PR; SPEC em `docs/40-specs/` antes do plano |
| Conhecimento externo verificado ao vivo, com fonte e data | ficha em `docs/20-conhecimento/`; checklist do PR |
| Paralelismo: uma sessão por worktree; claim antes de editar documento vivo | `bd session`, `bd claim` ([ADR 0005](./docs/60-decisoes/0005-barramento-ledger-por-arquivo.md)) |
| Regra recebida do Pai vai para o corpus no mesmo dia | `.buddy-dev/MEMORY.md` (tabela de regras) |
| Segredo nunca entra no repositório | `.gitignore`; varredura de segredos na CI: **pendente** (Fase 0.6) |

## 4. Trabalho em paralelo

Duas sessões nunca dividem o mesmo diretório de trabalho (o índice do git é compartilhado e mistura commits). Para uma sessão paralela:

```sh
git worktree add ../rabelus-buddy--<curto> -b <tipo>/<slug>
```

Sessões e claims ficam no diretório comum do git e são vistos por todos os worktrees da máquina. Entre máquinas, a coordenação é eventual: pelo ledger publicado via push. `CHANGELOG`, `LEARNING-CURVE` e diário usam `merge=union` e não conflitam.

## 5. Conduta

1. Português do Brasil com o Pai. Direto, sem cerimônia, sem emoji decorativo.
2. Declarar o grau de certeza: **CONFIRMADO**, **PROVÁVEL**, **HIPÓTESE**, **NÃO IDENTIFICADO**.
3. Autonomia não se presume. Pesquisa não autoriza instalar; plano não autoriza executar; execução não autoriza publicar nem mergear. Decisão de produto, escopo, prioridade e aceitação é do Pai.
4. Ambiguidade material: apresentar opções com recomendação e parar.
5. Fora deste repositório: leitura justificada; escrita só com autorização expressa.
6. Nunca afirmar teste, gate ou verificação que não rodou. Lacuna declarada vale mais que preenchimento bonito.

## 6. Mapa

| Caminho | Classe |
|---|---|
| `.buddy-dev/SOUL.md` `IDENTITY.md` `USER.md` | ALMA |
| `AGENTS.md` `docs/30-governanca/` | CÂNONE |
| `.buddy-dev/STATUS.md` | ESTADO (única morada de versões e pendências) |
| `.buddy-dev/MEMORY.md` `diario/` `CHANGELOG.md` `LEARNING-CURVE.md` | MEMÓRIA |
| `.buddy-dev/bus/ledger/` `docs/registros/` | REGISTRO |
| `.buddy-dev/GENESIS.md` `docs/00-proveniencia/` | PROVENIÊNCIA |
| `archive/` | ARQUEOLOGIA |
| `docs/20-conhecimento/` | CONHECIMENTO |
| `docs/40-specs/` `docs/50-planos/` `docs/60-decisoes/` | CONTRATO, PLANO, DECISÃO |
