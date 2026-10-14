# Roadmap vivo

**Classe:** PLANO · **Atualizado em:** 2026-10-14T10:40:00-03:00 · **Por:** buddy-dev (claude-code-c33594)

Onde estamos e para onde vamos. O detalhe de cada fase mora no plano dela, criado quando a fase começa. Sem datas nem estimativas de esforço até a Revisão 0.2 medir o esforço de verdade.

## Agora

**Fase 0 — Organizar a Casa** · [plano](./fase-0/PLANO.md) · em execução

## Fases

| Fase | Resultado | Estado |
|---|---|---|
| **0 — Organizar a Casa** | Repositório, ferramentas, governança, corpus do buddy-dev, CI, pesquisa revisada, roadmap e plano macro confiáveis | em execução |
| M0 — Fundações | Núcleo, loop mínimo com 1 provedor, CLI, SQLite + eventos, aprovações, orçamento | herdado da pesquisa 0.1 — **a revalidar na Revisão 0.2** |
| M1 — Multi-provedor | 3 provedores, 3 camadas, cache, contagem de tokens, roteador | idem |
| M2 — Ferramentas e workspace | 8 classes de aprovação, worktree por sessão, diff/rollback, servidor MCP próprio | idem |
| M3 — Memória e identidade | 5 níveis, busca, claims com evidência, arquivos versionados, anti-envenenamento | idem |
| M4 — Protocolos e extensibilidade | Cliente MCP, ACP, skills, plugins e scripts isolados | idem |
| M5 — Canais | Telegram, CLI, Slack, Discord, e-mail | idem |
| M6 — Gateway e Buzz | VPS, WhatsApp, relay do Buzz | idem |
| M7 — Observabilidade e avaliação | OTel GenAI, Langfuse, evals | idem |
| M8 — Superfícies e distribuição | Web UI, desktop, mobile cliente fino, instaladores | idem |
| M9 — Endurecimento | Backup, restore testado, SBOM, revisão de segurança | idem |

Os marcos M0–M9 vêm do relatório de origem (seção 11) e **não estão aprovados**: a Revisão 0.2 vai refazer custo, esforço, sandbox multiplataforma e concorrência antes de o Pai aprovar qualquer um deles.

## Decisões que destravam o próximo passo

- Merge dos PRs da Fase 0 (Pai).
- Aceite das ADRs 0003 e 0005 e do `METODO.md` (Pai).
- Aprovação da Revisão 0.2 (Pai), que libera a SPEC do M0.

## Histórico

- 2026-10-14 — Roadmap criado na Fase 0.
