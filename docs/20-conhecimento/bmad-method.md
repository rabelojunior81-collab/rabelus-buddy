# BMad Method

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-14T10:38:13-03:00 · **Estado:** a reverificar após 2026-10-16 (lançamento previsto da v7)

## O que importa para o buddy

O BMad Method é a referência e inspiração do nosso método, não uma dependência. Dele adotamos: processo do tamanho certo (trivial, sessão, épico, projeto), SPEC como contrato curto antes de construir, contratos compartilhados (produto, arquitetura) só quando o trabalho é grande, retrospectiva no fim de cada épico e o humano como dono da ordem do trabalho. Não instalamos as skills: a v7 está em alpha e muda com frequência.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Release estável mais recente: **v6.12.2** (2026-10-11), só correções | `bmad-code-org/BMAD-METHOD` releases (tier 1) | 2026-10-14 |
| **v7** em *preview alpha* na branch principal, "ETA 16 de outubro de 2026"; quebras esperadas entre atualizações | README do repositório (tier 1) | 2026-10-14 |
| Licença MIT | README do repositório (tier 1) | 2026-10-14 |
| v6.12 instala com `npx bmad-method install` (Node 20.12+, Python 3.10+, `uv`) | README (tier 1) | 2026-10-14 |
| v7 instala como skills (`npx skills add bmad-code-org/BMAD-METHOD`) ou plugin de Claude Code / Codex | README (tier 1) | 2026-10-14 |
| Caminhos de planejamento: trivial, uma sessão, épico, projeto (~20+ sessões) | https://docs.bmad-method.org/plan/choose-a-planning-path/ (tier 0) | 2026-10-14 |
| Skills e artefatos: `bmad-brainstorming`, `bmad-forge-idea`, `bmad-deep-recon` (`research-<topic>.md` com citações), `bmad-product-brief`, `bmad-prfaq`, `bmad-prd`, `bmad-ux`, `bmad-spec` (`spec-<slug>.md`), `bmad-architecture`, `bmad-ticket` (épicos, `tickets.toml`), `bmad-build`, `bmad-build-auto`, `bmad-retrospective` | mesma página (tier 0) | 2026-10-14 |
| Ciclo declarado: Clarify → Plan → Build and verify → Learn and adjust | diagrama do README (tier 1) | 2026-10-14 |
| v6.11.0 renomeou "Quick Dev" para "Build" e reduziu o catálogo de 14 para 8 skills | newreleases.io (tier 3), não conferido no changelog oficial | 2026-10-14 |

## Explicação

O BMad parte de uma observação: assistentes de código transformam suposições não ditas em código. A resposta dele é tornar as decisões explícitas em documentos curtos que viajam de uma sessão para outra, e dimensionar o processo pelo tamanho do trabalho: mudança óbvia vai direto para construção; iniciativa grande ganha brief, PRD, arquitetura e épicos.

## Implicações

- Nosso método ([`METODO.md`](../30-governanca/METODO.md)) usa os quatro tamanhos do BMad e o mapeia na cadeia do Pai (Roadmap → Plano Macro → Fase → Sub-fase).
- Reavaliar depois de 2026-10-16: se a v7 estabilizar, testar `bmad-spec` e `bmad-retrospective` num spike, sem tornar o projeto dependente.

## Histórico de verificações

- 2026-10-14T10:38:13-03:00 · buddy-dev (claude-code-c33594) · criação da ficha
