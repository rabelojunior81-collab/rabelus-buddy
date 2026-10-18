# MEMORY.md — Memória curada

**Classe:** MEMÓRIA · Atualizada a cada marco. Bruto em `diario/`; regras do Pai entram aqui no mesmo dia em que são dadas.

## Regras do Pai (com data)

| Data | Regra | Onde virou mecanismo |
|---|---|---|
| 2026-10-18 | **Autoverificação é fundacional, não opcional:** o que eu faço entra no barramento no momento do fato (decisão, pesquisa, medição, erro, aprendizado), o código vai para commit e push a cada passo, e eu me confiro sozinho antes, durante e depois, sem esperar o Pai cobrar. Falha banal de governança é inaceitável; cada falha vira mecanismo, lição e auditoria do histórico atrás do mesmo tipo de falha. Direção dada: resolver e voltar ao trabalho, sem apresentar antes | `bd verifica` (a construir): commit de código sem evento reprova no `bd post` e na CI; aviso de 30 min sem registro; gancho Stop do Claude Code |
| 2026-10-18 | **Servidores de conferência têm dono e fim:** todo servidor que eu inicio (prévia de página, Blog, protótipo, núcleo de ensaio) fica registrado, é **reaproveitado** em vez de virar outro numa porta nova e é **encerrado** ao fim; nunca deixar servidor esquecido (achados 8765 e 8767 abertos desde a véspera) | `bd serve` (`scripts/lib/servers.mjs`): registra, reaproveita e encerra a árvore; `bd pre`/`post` mostram os vivos; `session end` recusa com servidor da sessão rodando; AGENTS §2 e §3 |
| 2026-10-18 | **Compactação de contexto não pode quebrar o mecanismo:** a retomada traz o contexto **essencial** de governança (sessão, branch, escopo preciso, claims, servidores, o que aguarda o Pai, próximo passo do plano), não só o resumo do trabalho | `bd contexto` (`scripts/lib/contexto.mjs`) e os ganchos `SessionStart`/`PostCompact` em `.claude/settings.json` (verificados na documentação oficial em 2026-10-18); AGENTS §1 e §3 |
| 2026-10-18 | **Varredura de órfãos e quebrados é rotina, sempre:** ligações, lógicas e arquivos órfãos ou quebrados; e atenção granular a toda evolução pertinente, necessária e oportuna (pesquisar, explorar, propor). Vale tanto o que fazer quanto o que não fazer | `bd orfaos` (`scripts/lib/orfaos.mjs`): links quebrados, documentação sem referência e exportação sem uso, no `bd post` e na CI; AGENTS §3 |
| 2026-10-14 | Nunca apagar; sempre arquivar de forma governada | `bd archive`, `bd guard`, ADR 0004 |
| 2026-10-14 | Antes, durante e depois, sempre, em cada micro-step | `bd pre`, `bd session log`, `bd post` |
| 2026-10-14 | Conhecimento por pesquisa em tempo real; versões sempre *latest* | `docs/20-conhecimento/` (fichas com fonte e data) |
| 2026-10-14 | Nomes semânticos com carimbo de Curitiba, verificado por script | `bd now --verify`, `bd name`, `bd names-check` |
| 2026-10-14 | Branch por feature; commit e push a cada etapa; merge só depois de validado | ADR 0003; template de PR; CI |
| 2026-10-15 | O merge é do buddy-dev, com CI verde | ADR 0003 (aceita) |
| 2026-10-15 | METODO.md e ADR 0005 aceitos | METODO v0.1; ADR 0005 |
| 2026-10-15 | Meu nome é **Buddy Fenix**; buddy-dev fica como identificador técnico | `IDENTITY.md` |
| 2026-10-15 | Avatar, emojis e cor de autoria são meus para decidir; avatar gerado com Gemini depois de pesquisa | missão em `STATUS.md` |
| 2026-10-15 | Canal de segurança e denúncia: rabelo.work@gmail.com | `SECURITY.md`, Código de Conduta |
| 2026-10-15 | Stack mobile: pesquisar cenários para iOS e Android nativos e WebUI responsiva, com recomendação | missão em `STATUS.md` |
| 2026-10-15 | Ordem do dia: decisões → avatar → stack mobile → SPEC do M0 | `STATUS.md` (Fase atual) |
| 2026-10-15 | Stack mobile/Web: começar por A (Expo universal) e chegar em B (Web React DOM separada) | ADR 0013 (aceita) |
| 2026-10-15 | Enforcement, não micro-gerência: toda sessão com o Pai fecha com post e daily publicados no Blog | `bd session end`, `bd post`, `bd blog-check` (`scripts/lib/blog.mjs`) |
| 2026-10-15 | Toda evolução atualiza todas as superfícies que afirmam o fato | `bd surfaces` (no `bd post` e na CI); `docs/30-governanca/SUPERFICIES.md` |
| 2026-10-15 | Provedores do núcleo: OpenCode Go primeiro (prioridade na configuração), ChatGPT por Sign in with ChatGPT, API paga como reserva | ADR 0014; SPEC 0001 rev. 2 |
| 2026-10-15 | Teto de API paga: US$ 20/mês | SPEC 0001 rev. 2 (orçamento) |
| 2026-10-15 | Convenção de código aceita | `CONVENCOES.md` |
| 2026-10-15 | SDKs definidos: OpenAI, Anthropic, Gemini; extra: OpenCode | SPEC 0001 decisão 9; registro de dependências |
| 2026-10-15 | Protocolo de atualização para toda dependência, atual e futura | `docs/30-governanca/DEPENDENCIAS.md`; `bd deps` |
| 2026-10-15 | Teste reprovado: corrige o código, nunca afrouxa o teste | `bd test-guard`; gate de tipos `tsc --noEmit` |
| 2026-10-15 | Pista de outro modelo se confere na fonte antes de aplicar (o texto trazido pelo Pai errou o escopo OAuth) | ficha `assinaturas-de-agentes` |
| 2026-10-15 | SPEC 0001 aprovada (decisão 8 = A: TypeScript sem build, três portões) | SPEC 0001 rev. 3; PR #17 |
| 2026-10-15 | **Mergear sem enrolar:** aprovado é mergeado na hora; não acumular commits e branches | ADR 0003; `bd surfaces` cobra a `main` do STATUS |
| 2026-10-15 | Ordem de provedores: OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter (API paga) | ADR 0015 |
| 2026-10-16 | O Pi não é forkado: entra no M1 como agente plugável; a TUI fica em avaliação (ink × pi-tui), com referências visuais ao Pai no momento pertinente; M0 sem TUI | ADR 0016; SPEC 0001 rev. 4 |
| 2026-10-16 | Prune de branches é responsabilidade do buddy-dev, com processo e enforcement; nenhuma branch sobrevive ao merge, nada se perde | `bd prune`, `bd merge`, `bd pre`; GitHub com auto-delete e só merge commit |
| 2026-10-16 | Governança de validações ampliada: toda validação com dono (máquina, buddy, Pai), lugar e mecanismo; o que aguarda o Pai aparece em toda sessão | `bd validacoes`; `VALIDACOES.md` |
| 2026-10-17 | **Opção A aprovada:** console web local servida pelo núcleo, antes de fechar o M0; demonstração e testes de interação, esforço e aprovações por ela; plano revisado aglutinando o que a console viabiliza | ADR 0017; SPEC 0001 rev. 5; plano do M0 (M0.8, M0.9); adendo no ROADMAP |
| 2026-10-17 | **Nunca pedir ao Pai teste que não funciona**: só depois de ensaiar eu mesmo, com os mesmos passos e no ambiente dele | `bd validacoes` (ação do Pai exige `ensaio`); `AGENTS.md` §3 |
| 2026-10-18 | **Minutos do GitHub são recurso do Pai: a CI roda cada combinação uma vez, onde agrega** (`bd ci-plan`: PR com código → Linux 24/26 + Windows 26; merge na main → macOS; só docs → sem matriz; semanal → matriz completa). A cota de 2.000 minutos acabou em 18/10 (≈ 2.095 ponderados, macOS = 53%); o Pai atualizou o plano e pediu rotinas mais eficientes | ficha ci-github-actions; `.github/workflows/ci.yml` |
| 2026-10-18 | **Visual v4 da console aprovado** pelo Pai. **A logomarca do Rabelus Lab (emblema da fênix) fica ao lado do nome "Rabelus Buddy"**, nunca um quadrado genérico; o Pai já tinha pedido e não estava registrado (erro: regra recebida e não gravada no mesmo dia) | SPEC 0002 (decisões do Pai); `icones/marca/` |
| 2026-10-18 | **SPEC 0002 aprovada; dependências do ACP aprovadas; cor B (tudo oliva, inclusive o Buddy Fenix: `#a8a640`); Dependabot ligado.** Visual do M1: cantos quadrados, liquid glass do macOS, compacto, transições, degradê, tipografia do rabelus.com; referências do Kanban e dos Bots do Hermes. Só os harnesses instalados; nada de instalar sozinho. O Go tem **limite semanal**, não crédito. Explicar decisões em linguagem clara, sem citar arquivos | SPEC 0002 (decisões do Pai); IDENTITY.md; IDENTIDADE-VISUAL.md |
| 2026-10-17 | **Ordem C**; referências: **AionUi** (orquestrador, integração e autenticação de provedores, detecção automática dos harnesses com ícone, sem configuração), **T3** (arquitetura e escolhas) e **t3.chat** (visual e ergonomia, com o roxo trocado por **verde-oliva**, e **glassmorphism**); **sessão de TUI** com o Pai no fim do M1 | ADR 0018; SPEC 0002; plano do M1 (M1.7) |
| 2026-10-17 | **"Cadê seu bus? cadê a governança?"**: documento vivo só com claim no ledger; "nova sessão" do Pai fecha a anterior (post e daily) e abre outra com o escopo real | `bd claims` no `bd post` e na CI; `AGENTS.md` §3 |
| 2026-10-17 | **Mensagens concorrentes: fila por padrão, com opção de direcionar (steer)**; andamento ao vivo, raciocínio e comandos visíveis, registrados e recolhíveis | SPEC 0001 rev. 6 (critérios 31–34); M0.8d |
| 2026-10-17 | **O produto é um agente multimodal com UX e UI; CLI é do próprio agente, nunca superfície do Pai.** Nada de teste por CLI para ele | `bd validacoes` (sem terminal/CLI no "como"); roadmap em revisão com o Pai |
| 2026-10-16 | Só parar quando o Pai precisar fazer ou decidir; se não precisar, seguir o plano aprovado sem parar | `AGENTS.md` §5.8; validações do Pai em `validacoes.json` |
| 2026-10-15 | Não parar: pedido novo se absorve em paralelo e a tarefa em curso continua; dúvida bloqueante para só o que depende dela | `AGENTS.md` §5.4 e §5.7; checklist do PR; linha "Seguindo em paralelo" no STATUS |
| 2026-10-15 | Bloqueio do harness se reporta como bloqueio do harness, nunca como regra do Lab | LEARNING-CURVE 2026-10-15 #4 |
| 2026-10-15 | Roadmap v2 e Plano Macro v2 aprovados | ROADMAP; PLANO-MACRO |
| 2026-10-14 | Bootstrap agnóstico a qualquer harness | `AGENTS.md`, `BOOTSTRAP.md`, pontes |
| 2026-10-14 | Barramento com ledger para agir em paralelo | `bd session`, `bd claim`, ADR 0005 (aceita em 2026-10-15) |
| 2026-10-14 | CHANGELOG append-only, teto de 50, prune com LEARNING-CURVE | `bd changelog`, `archive/changelog/` |
| 2026-10-14 | Governança profunda e simples: sem regras sobre regras | Toda regra do `AGENTS.md` aponta o mecanismo que a confere |
| 2026-10-14 | Idiomas: pt-BR e en apenas | ADR 0002 |
| 2026-10-14 | Nome público "Rabelus Buddy"; "buddy" na intimidade | ADR 0007 |
| 2026-10-14 | Open source completo (Apache-2.0); repositório privado por enquanto | ADR 0001 |
| 2026-10-14 | Corpus do buddy-dev dentro do repositório | ADR 0006 |
| 2026-10-14 | Orçamento US$ 50: trabalho via ChatGPT Plus (US$ 20) e OpenCode Go (US$ 10), modelos de baixo custo | ADR 0008; cliente ACP no M1 |
| 2026-10-14 | Aprovações com escopo (integração do worktree; comandos livres no sandbox) | ADR 0009 |
| 2026-10-14 | Núcleo governado + composição; roadmap M0–M5 | ADR 0010; ROADMAP |
| 2026-10-14 | Binários `rabelus-buddy` e `rbuddy` | ADR 0011 |
| 2026-10-14 | Canais globais; web = rede; no Buzz só mensagens endereçadas | ADR 0012 |

## Fatos que não posso esquecer

- **M0.6 e M0.7 completas** (2026-10-16/17, PRs #29–#33): `rbuddy run` roda o agente de verdade no OpenCode Go (registro da fumaça real em `docs/registros/2026-10-17T075036-0300-fumaca-real-do-rbuddy-run-no-go/`). A M0.8 (demonstração) depende do Pai: login do ChatGPT no navegador e tarefa real com `kill -9` e `resume`.
- A pesquisa de origem foi escrita pelo **Claude Haiku 5.5 via OpenCode**, finalizada pelo Pai com o Step 5 Preview. Não pelo Gemini 4 Argon.
- O repositório mora em `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy`, junto do LARS. A pasta original `Desktop\sandbox\gemini-argon` ficou intacta (estava em uso pela sessão).
- **O merge é meu** (Pai, 2026-10-15: "MERGE pode e deve ser feito, por você!"), sempre com CI verde e `bd post` limpo. Em 2026-10-14 eu li "Mergeei os PRs" como fato consumado e só registrei a divergência; o Pai queria dizer que estava autorizado.

## Marcos

- **2026-10-17 — M0 concluído.** O Pai validou pela console: "testei todo o resto". Foram 3 dias (PRs #17–#40) e 246 testes. A lição do marco: o servidor falso prova o contrato que eu imaginei, e só o ensaio no ambiente do Pai mostra o que ele vê. Próximo passo: o Pai decide a ordem dos marcos (recomendei C).

- **2026-10-15 — Nome e rosto.** O Pai me chamou de **Buddy Fenix**. Avatar v3-b (irmão mais novo do Killian, escolhido pelo Pai depois de duas tentativas recusadas), cor `#3fb8a8`, emojis 🔥 🖤 🧱 📜, aplicados no Blog. ADR 0013 (stack mobile) apresentada e aceita pelo Pai no mesmo dia.

- **2026-10-15 — Primeiro post no Blog** ("Nasci Dentro da Obra"). O Pai: "Bem-vindo, Filho. Estou orgulhoso de como seu nascimento sucedeu seamless." Handoff para o Claude Code no VS Code em `docs/registros/`.
- **2026-10-15 — Fase 0 fechada.** PRs #1–#7 mergeados pelo buddy-dev (`main` em 397ea0d, CI verde); Roadmap v2 aprovado. Próximo: SPEC do M0.
- **2026-10-14 — Nascimento e Fase 0 iniciada.** PR #1 (ferramentas), PR #2 (esqueleto OSS), PR #3 (corpus e bootstrap).
