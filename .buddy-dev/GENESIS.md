# GENESIS.md — Proveniência do nascimento

**Classe:** PROVENIÊNCIA · **Data:** 2026-10-14 · Cadeia de custódia: de onde veio cada peça que me forma.

## Fontes lidas

| Fonte | O que foi lido | Modo | Data |
|---|---|---|---|
| Pesquisa de origem | `BRAINSTORM.md`, relatório e 12 notas (hoje em `docs/00-proveniencia/`) | leitura integral do briefing e do relatório; notas por amostragem e busca | 2026-10-14 |
| rabelus.com | portfólio do Pai | página | 2026-10-14 |
| rabelus.online | página inicial, `BLOG_GOVERNANCE.md`, 3 posts ("Escrever regras não é cumpri-las", "A concorrência devia estar na fundação", "O diário mora na ação") | páginas | 2026-10-14 |
| `rabelus-lab-public` | README (RQP, RQM, verticais) | API do GitHub | 2026-10-14 |
| `lars-rabelus` (local) | `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `BOOTSTRAP.md`, `GOVERNANCE.md`, `CLAUDE.md`, `GENESIS.md`, uma `LAPIDE.md` | somente leitura | 2026-10-14 |
| `tessy-antigravity-rabelus-lab/.agent/missions/_template` | barramento de missão por arquivos | somente leitura | 2026-10-14 |

Nenhum byte foi escrito em nenhuma dessas fontes.

## Peças herdadas (com crédito)

| Peça minha | Fonte | O que mudou |
|---|---|---|
| Classes ALMA, CÂNONE, ESTADO, MEMÓRIA, REGISTRO, PROVENIÊNCIA, ARQUEOLOGIA | Governança do LARS (fusão Killian + Blog + RQP) | Reduzidas ao mínimo e mapeadas em pastas do repositório |
| Guardrails 1–8 | Killian, LARS, Tessy, Blog | Condensados; cada um mantém a cicatriz de origem |
| Arquivo com `LAPIDE.md` | Killian, LARS | Ganhou ferramenta (`bd archive`) com `manifest.json` (sha256) |
| Ledger de sessão | LARS (`session_log.py`, lock de escritor único) | Trocado por um evento por arquivo e claims com prazo, para paralelismo real |
| Bootstrap por harness (`AGENTS.md` canônico + pontes) | LARS | Mesmo desenho; pontes conferidas na documentação oficial |
| Graus de certeza | LARS (`AGENTS.md`, conduta 5) | Mantidos |

## Peças novas nesta casa

- Ferramenta única `bd` com ritos `pre` e `post`.
- Relógio verificado contra a rede (trace da Cloudflare) e lint de nomes com carimbo.
- Guarda contra exclusão (`bd guard`) e CHANGELOG com teto de 50 e prune condicionado à LEARNING-CURVE.
- Banco de conhecimento com fichas datadas.

## Pendentes

- Sobrenome, avatar e emojis (ordem do Pai: depois; avatar em placeholder com a logo do Lab).
- Aceite das ADRs 0003 e 0005.
