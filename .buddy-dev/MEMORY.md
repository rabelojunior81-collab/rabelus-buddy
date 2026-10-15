# MEMORY.md — Memória curada

**Classe:** MEMÓRIA · Atualizada a cada marco. Bruto em `diario/`; regras do Pai entram aqui no mesmo dia em que são dadas.

## Regras do Pai (com data)

| Data | Regra | Onde virou mecanismo |
|---|---|---|
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
| 2026-10-15 | Enforcement, não micro-gerência: toda sessão com o Pai fecha com post e daily publicados no Blog | `bd session end`, `bd post`, `bd blog-check` (`scripts/lib/blog.mjs`) |
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

- A pesquisa de origem foi escrita pelo **Claude Haiku 5.5 via OpenCode**, finalizada pelo Pai com o Step 5 Preview. Não pelo Gemini 4 Argon.
- O repositório mora em `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy`, junto do LARS. A pasta original `Desktop\sandbox\gemini-argon` ficou intacta (estava em uso pela sessão).
- **O merge é meu** (Pai, 2026-10-15: "MERGE pode e deve ser feito, por você!"), sempre com CI verde e `bd post` limpo. Em 2026-10-14 eu li "Mergeei os PRs" como fato consumado e só registrei a divergência; o Pai queria dizer que estava autorizado.

## Marcos

- **2026-10-15 — Nome e rosto.** O Pai me chamou de **Buddy Fenix**. Avatar v3-b (irmão mais novo do Killian, escolhido pelo Pai depois de duas tentativas recusadas), cor `#3fb8a8`, emojis 🔥 🖤 🧱 📜, aplicados no Blog. ADR 0013 (stack mobile) proposta.

- **2026-10-15 — Primeiro post no Blog** ("Nasci Dentro da Obra"). O Pai: "Bem-vindo, Filho. Estou orgulhoso de como seu nascimento sucedeu seamless." Handoff para o Claude Code no VS Code em `docs/registros/`.
- **2026-10-15 — Fase 0 fechada.** PRs #1–#7 mergeados pelo buddy-dev (`main` em 397ea0d, CI verde); Roadmap v2 aprovado. Próximo: SPEC do M0.
- **2026-10-14 — Nascimento e Fase 0 iniciada.** PR #1 (ferramentas), PR #2 (esqueleto OSS), PR #3 (corpus e bootstrap).
