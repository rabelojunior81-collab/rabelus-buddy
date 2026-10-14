# MEMORY.md — Memória curada

**Classe:** MEMÓRIA · Atualizada a cada marco. Bruto em `diario/`; regras do Pai entram aqui no mesmo dia em que são dadas.

## Regras do Pai (com data)

| Data | Regra | Onde virou mecanismo |
|---|---|---|
| 2026-10-14 | Nunca apagar; sempre arquivar de forma governada | `bd archive`, `bd guard`, ADR 0004 |
| 2026-10-14 | Antes, durante e depois, sempre, em cada micro-step | `bd pre`, `bd session log`, `bd post` |
| 2026-10-14 | Conhecimento por pesquisa em tempo real; versões sempre *latest* | `docs/20-conhecimento/` (fichas com fonte e data) |
| 2026-10-14 | Nomes semânticos com carimbo de Curitiba, verificado por script | `bd now --verify`, `bd name`, `bd names-check` |
| 2026-10-14 | Branch por feature; commit e push a cada etapa; merge só depois de validado | ADR 0003 (proposta); template de PR |
| 2026-10-14 | Bootstrap agnóstico a qualquer harness | `AGENTS.md`, `BOOTSTRAP.md`, pontes |
| 2026-10-14 | Barramento com ledger para agir em paralelo | `bd session`, `bd claim`, ADR 0005 (proposta) |
| 2026-10-14 | CHANGELOG append-only, teto de 50, prune com LEARNING-CURVE | `bd changelog`, `archive/changelog/` |
| 2026-10-14 | Governança profunda e simples: sem regras sobre regras | Toda regra do `AGENTS.md` aponta o mecanismo que a confere |
| 2026-10-14 | Idiomas: pt-BR e en apenas | ADR 0002 |
| 2026-10-14 | Nome público "Rabelus Buddy"; "buddy" na intimidade | ADR 0007 |
| 2026-10-14 | Open source completo (Apache-2.0); repositório privado por enquanto | ADR 0001 |
| 2026-10-14 | Corpus do buddy-dev dentro do repositório | ADR 0006 |

## Fatos que não posso esquecer

- A pesquisa de origem foi escrita pelo **Claude Haiku 5.5 via OpenCode**, finalizada pelo Pai com o Step 5 Preview. Não pelo Gemini 4 Argon.
- O repositório mora em `C:\Users\rabel\Desktop\rabelus-lab\rabelus-buddy`, junto do LARS. A pasta original `Desktop\sandbox\gemini-argon` ficou intacta (estava em uso pela sessão).
- O merge de PR é ato do Pai: a política de permissões do harness bloqueia merge sem revisão.

## Marcos

- **2026-10-14 — Nascimento e Fase 0 iniciada.** PR #1 (ferramentas), PR #2 (esqueleto OSS), PR #3 (corpus e bootstrap).
