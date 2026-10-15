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

### #0009 · 2026-10-14T112001-0300 · claude-code-5c038b · pesquisa

Revisão 0.2 (F0.7): R1 custos (orçamento da 0.1 = US$ 60,82–62,82; uso agêntico exige camada barata), R2 sandbox 3 SOs, R3 aprovações com escopo, R4 núcleo + composição (gateways MIT existem), R5 concorrência fundacional, R6 nome. 5 subagentes conferidos por amostragem.

### #0010 · 2026-10-14T112002-0300 · claude-code-5c038b · processo

O Pai disse que mergeou os PRs; o GitHub mostrou #1–#5 abertos e a main no commit de importação. Registrado e seguido em pilha (#6 sobre #5), sem presumir o merge.

### #0011 · 2026-10-14T120553-0300 · claude-code-671f81 · decisao

Decisões do Pai sobre a 0.2 viraram ADRs 0008–0012: orçamento US$ 50 com trabalho via ChatGPT Plus e OpenCode Go por ACP (conferido ao vivo: codex-acp 2.2.2 com login ChatGPT; opencode acp); aprovações com escopo; núcleo governado + composição; binários rabelus-buddy e rbuddy; canais globais.

### #0012 · 2026-10-14T120554-0300 · claude-code-671f81 · doc

F0.8: Roadmap v2 e Plano Macro v2 sobre a Revisão 0.2; retrospectiva da Fase 0 (75 commits, 27 testes, 12 ADRs, 10 fichas). PR #7.

### #0013 · 2026-10-15T024316-0300 · claude-code-eb8d73 · processo

Merges #1–#7 feitos pelo buddy-dev por ordem do Pai (main em 397ea0d, CI verde). ADR 0003 aceita: o merge é do buddy-dev após validação. Roadmap v2 e Plano Macro v2 aprovados; Fase 0 concluída.

### #0014 · 2026-10-15T025904-0300 · claude-code-21bd8c · doc

Primeiro post no Blog ("Nasci Dentro da Obra", commit c143077 do Blog) com daily editorial vinculada; gates VERDE e QA 375/1440. Handoff detalhado para o Claude Code no VS Code em docs/registros/; rito de fechamento corrigido (session end antes do último commit) em AGENTS e BOOTSTRAP.

### #0015 · 2026-10-15T033124-0300 · claude-code-vs-code-14f5bb · decisao

Decisões do Pai registradas: METODO e ADR 0005 aceitos; nome Buddy Fenix (buddy-dev fica como identificador técnico); canal de segurança e denúncia rabelo.work@gmail.com em SECURITY e no Código de Conduta; missões do avatar e da stack mobile antes da SPEC do M0.

### #0016 · 2026-10-15T033124-0300 · claude-code-vs-code-14f5bb · correcao

STATUS trazia carimbo escrito à mão no futuro (03:05, publicado num merge das 02:59) e main desatualizada (397ea0d); corrigido para d92e297 com carimbo de bd now --verify.
