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

### #0017 · 2026-10-15T033730-0300 · claude-code-vs-code-14f5bb · decisao

Identidade visual do Buddy Fenix por autoria própria: conceito (construtor nascido dentro da obra), cor de autoria verdete #3fb8a8 (8,11:1 sobre o fundo do Blog), emojis 🔥 🖤 🧱 📜. Ficha gemini-imagem com Nano Banana 2.1 via Interactions API.

### #0018 · 2026-10-15T033730-0300 · claude-code-vs-code-14f5bb · aprendizado

A geração do avatar parou em HTTP 429: o projeto da chave Gemini estourou o teto de gasto mensal; não se contorna trocando de modelo. O 2.1 também recusa PNG na saída (só JPEG). Chave válida não é chave com saldo: conferir o teto antes de planejar geração.

### #0019 · 2026-10-15T034902-0300 · claude-code-vs-code-14f5bb · decisao

Avatar do Buddy Fenix: v3-b, escolhido pelo Pai. Retrato na linguagem da família, gerado com Nano Banana 2.1 usando o avatar do Killian como referência; proveniência com prompt, id, custo (cerca de US$ 0,25) e sha256.

### #0020 · 2026-10-15T034902-0300 · claude-code-vs-code-14f5bb · aprendizado

Duas tentativas recusadas (canteiro; nave estelar) antes do v3: eu li o meu próprio texto e o acervo errado em vez do artefato irmão. Lição 1 de 2026-10-15 na LEARNING-CURVE: referência é o artefato do mesmo tipo, enviado como imagem, e mostro ao Pai antes de commitar.

### #0021 · 2026-10-15T035409-0300 · claude-code-vs-code-14f5bb · doc

Blog atualizado: Buddy Fenix com avatar próprio, cor #3fb8a8 e emojis na ficha de autor, nos cards (pt/en) e nas bios do rodapé; governança v2.6; proveniência em evidence/buddy-dev. rabelus-lab-blog 6ae9895, gate VERDE, QA em 1440 e 375.

### #0022 · 2026-10-15T035631-0300 · claude-code-vs-code-14f5bb · pesquisa

Stack mobile e Web UI: ficha stacks-mobile-e-web com versões oficiais de 2026-10-15; ADR 0013 proposta (Expo universal sobre pacote de cliente TypeScript; Web UI React DOM separada quando as telas densas pedirem; spike no M5). Aguarda o Pai.

### #0023 · 2026-10-15T040333-0300 · claude-code-vs-code-7e2404 · ferramenta

Gate do Blog no bd: session end recusa e post reprova sem post do buddy-dev publicado desde o início da sessão, com daily ligada e manifesto; bd blog-check avulso; 35 testes. Ordem do Pai por enforcement depois de eu fechar uma sessão sem post.

### #0024 · 2026-10-15T040333-0300 · claude-code-vs-code-7e2404 · aprendizado

Regra sem mecanismo eu esqueci (post no Blog); bloqueio do harness relatado como regra do Lab. Ambas na LEARNING-CURVE de 2026-10-15 (#3, #4).

### #0025 · 2026-10-15T041437-0300 · claude-code-vs-code-438d04 · decisao

ADR 0013 aceita pelo Pai: stack mobile e Web começa por A (Expo universal sobre pacote de cliente TS) e chega em B (Web UI React DOM separada); spike no M5.

### #0026 · 2026-10-15T042516-0300 · claude-code-vs-code-438d04 · correcao

Auditoria de superfícies a pedido do Pai: 12 lacunas corrigidas (README pt/en com Fase 0 e sem mapa em inglês, STATUS com ADR 0013 proposta, USER com merge do Pai, fichas do Node e do GitHub, carimbos de ROADMAP/PLANO-MACRO/Fase 0, AGENTS, BOOTSTRAP, PR template, CHANGELOG da raiz, 40-specs, pendência da convenção de código). Plano da conta GitHub medido: Free.

### #0027 · 2026-10-15T042516-0300 · claude-code-vs-code-438d04 · ferramenta

bd surfaces: índices completos, ADR aceita citada como proposta, carimbo Atualizado em vs. último commit, main do STATUS no máximo 1 merge atrás; no bd post e na CI. Mapa evento → superfícies em docs/30-governanca/SUPERFICIES.md. 39 testes.

### #0028 · 2026-10-15T043158-0300 · claude-code-vs-code-438d04 · doc

SPEC 0001 (M0 — Núcleo governado) em rascunho: 20 critérios de aceite, decisões técnicas com fonte (node:sqlite + adaptador, JSON-RPC sobre node:net, GPT-6 Luna via openai, parseArgs/readline, i18next), 4 dúvidas bloqueantes ao Pai. Spike de banco e IPC registrado; fichas banco-e-ipc e bibliotecas-do-nucleo.

### #0029 · 2026-10-15T043545-0300 · claude-code-vs-code-5cfc7b · aprendizado

Regra do Pai: pedido novo se absorve em paralelo e a tarefa em curso continua; dúvida bloqueante para só o que depende dela. AGENTS §5.4/§5.7, checklist do PR, linha Seguindo em paralelo no STATUS; LEARNING-CURVE #6.

### #0030 · 2026-10-15T044039-0300 · claude-code-vs-code-5cfc7b · doc

M0 seguiu sem esperar as respostas do Pai: usage da Responses API verificado (store:false vira requisito), decisão 8 (TypeScript sem build), plano de fase M0 (8 sub-fases), desenho dos 21 testes, spike de banco e IPC aprovado em 3 SOs × Node 24/26 no CI.

### #0031 · 2026-10-15T045425-0300 · claude-code-vs-code-3a6e29 · decisao

Respostas do Pai à SPEC 0001 aplicadas: ADR 0014 (OpenCode Go primeiro, ChatGPT por Sign in with ChatGPT, API paga como reserva), teto US$ 20, convenção de código aceita, SDKs OpenAI/Anthropic/Gemini (+OpenCode no M1). SPEC revisão 2 com 26 critérios; explicação de build e testes com prova executada.
### #0028 · 2026-10-15T045853-0300 · claude-code-vs-code-3a6e29 · ferramenta

bd deps (registro com versão exata, licença, ficha, aprovação e prazo de 30 dias; rotina semanal na CI) e bd test-guard (a suíte não perde testes nem asserções; sem skip/todo/only), no bd post e na CI. Ordens do Pai de 2026-10-15. 57 testes.

### #0029 · 2026-10-15T050153-0300 · claude-code-vs-code-3a6e29 · correcao

bd deps --latest não era aceito pelo parser (opção documentada, não declarada; já na main pelo PR #18). Corrigido, com teste que exige que toda opção da ajuda seja aceita (LEARNING-CURVE #7).
