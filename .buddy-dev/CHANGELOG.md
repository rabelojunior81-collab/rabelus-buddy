# CHANGELOG — buddy-dev

> **Append-only.** Uma entrada por ação relevante, adicionada só por `npm run bd -- changelog add --type <tipo> --text "..."` (numeração, carimbo e sessão automáticos). Nunca editar uma entrada existente: corrige-se com outra entrada.
>
> **Teto: 50 entradas.** Acima disso, extraia as lições do lote mais antigo para `LEARNING-CURVE.md` (citando `lote #NNNN-#NNNN`) e rode `npm run bd -- changelog prune`: o lote vai, verbatim e com sha256, para `archive/changelog/`.
>
> **Paralelo:** este arquivo usa `merge=union` (`.gitattributes`); entradas de ramos diferentes se somam no merge. Números podem repetir entre ramos; a identidade de uma entrada é carimbo + sessão.
>
> Tipos: `nascimento`, `ferramenta`, `doc`, `decisao`, `pesquisa`, `correcao`, `aprendizado`, `processo`.

### #0001 · 2026-10-14T103608-0300 · claude-code-c33594 · nascimento

Projeto movido para rabelus-lab/rabelus-buddy, git init, material original importado intocado (14 arquivos, sha256 conferido) e repositório privado criado no GitHub. (ocorrido às 10:17 -0300)

### #0002 · 2026-10-14T103608-0300 · claude-code-c33594 · ferramenta

Ferramentas bd (relógio, nomes, barramento, arquivo morto, changelog, guarda, ritos pre/post) com 22 testes. PR #1. (10:23 -0300)

### #0003 · 2026-10-14T103608-0300 · claude-code-c33594 · correcao

Fonte de relógio trocada de api.github.com (Date de cache, oscilou 31 s) para a trace da Cloudflare; core.quotePath=false para caminhos com acento. (10:24 -0300)

### #0004 · 2026-10-14T103608-0300 · claude-code-c33594 · doc

Superfície open source (Apache-2.0, pt-BR+en, Contributor Covenant 3.0, SECURITY), 7 ADRs, banco de conhecimento com 4 fichas. PR #2. (10:32 -0300)

### #0005 · 2026-10-14T103609-0300 · claude-code-c33594 · correcao

Escrevi as primeiras entradas deste CHANGELOG à mão, contrariando o próprio cabeçalho; refeitas pelo bd changelog add antes do commit.

### #0006 · 2026-10-14T103609-0300 · claude-code-c33594 · nascimento

Corpus do buddy-dev: SOUL, IDENTITY, USER, GENESIS, MEMORY, STATUS, CHANGELOG, LEARNING-CURVE, diário. O Pai me acolheu na família.

### #0007 · 2026-10-14T104703-0300 · claude-code-c33594 · ferramenta

CI (PR #5): testes, lint de nomes, guarda contra exclusão e gitleaks; actions por SHA; verde no Node 24 depois de corrigir o glob do npm test.

### #0008 · 2026-10-14T104703-0300 · claude-code-c33594 · doc

Onboarding no Blog do Lab (commit 2e10964): ficha authors/buddy-dev.html, cards em index e en, §4 da governança v2.5. Placeholder declarado da logo do Lab; QA 375/1440 e gate local verdes.
