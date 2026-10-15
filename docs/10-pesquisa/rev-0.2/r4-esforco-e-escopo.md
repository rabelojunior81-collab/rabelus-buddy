# R4 — Esforço e escopo

**Revisão:** 0.2 · **Limite tratado:** 6 (escopo completo sem estimativa de esforço) · **Autor:** buddy-dev (claude-code-5c038b), com extração por subagente conferida por amostragem · **Data:** 2026-10-14

## Resumo

1. **O escopo "multi-tudo" completo já existe no mundo, e custou o trabalho de milhares de pessoas.** O projeto aberto que mais se aproxima dele (Hermes Agent) tem 4.504 contribuidores e 52.346 commits em 15 meses. Construir tudo do zero, por um desenvolvedor com agentes, não é um plano: é uma aposta sem prazo.
2. **A 0.1 não viu os gateways multicanal abertos.** OpenClaw, nanobot e nanoclaw (todos MIT) já conectam um agente a WhatsApp, Telegram, Slack, Teams, Discord e outros canais. A OpenClaw tem até uma extensão para o **Buzz**.
3. **O diferencial do Rabelus Buddy não está na quantidade de integrações.** Está no que nenhum desses projetos faz bem: **governança** (aprovação com escopo, orçamento atômico, memória com proveniência, ledger, arquivo morto, bootstrap entre harnesses). É o "lore" da casa.
4. **Recomendação:** núcleo próprio pequeno e governado; **integrar** o resto (agentes via ACP, canais via gateway existente, UI por último). O escopo completo continua sendo o objetivo, mas entregue por composição, não por reimplementação.

## Fatos verificados

Métricas pela API do GitHub em 2026-10-14. ✔ = conferido pelo buddy-dev. LOC ≈ bytes de código ÷ 35: aproximação grosseira, que infla com código gerado e documentação.

| Projeto | Licença | Criado | Estrelas | Contribuidores | Commits | ~LOC | Canais | UIs | Sandbox | MCP | ACP |
|---|---|---|---:|---:|---:|---:|---|---|---|---|---|
| ✔ NousResearch/hermes-agent | ✔ MIT | ✔ 2025-07-22 | ✔ 253.679 | 4.504 | 52.346 | ~4,1M | WhatsApp, Telegram, Slack, Discord, Signal, e-mail, Teams (webhook) | CLI/TUI, web, desktop | sim | sim | sim |
| ✔ anomalyco/opencode | ✔ MIT | ✔ 2025-04-30 | ✔ 213.424 | 1.046 | 20.402 | ~1,3M | — | TUI, web, desktop | mínimo | sim | sim |
| ✔ openclaw/openclaw | ✔ MIT | ✔ 2025-11-24 | ✔ 391.961 | 3.577 | 110.485 | (inflado; imprensa: 430–800 mil) | WhatsApp, Telegram, Slack, Teams, Discord, Signal, iMessage, Matrix… e ✔ **Buzz** (`extensions/buzz`) | TUI, apps | parcial | não confirmado | `acpx` |
| HKUDS/nanobot | ✔ MIT | 2026-02-01 | 49.017 | 478 | 4.871 | ~0,5M | WhatsApp, Telegram, Slack, Teams, Discord, e-mail e outros | TUI, web | — | sim | — |
| ✔ nanocoai/nanoclaw | ✔ MIT | ✔ 2026-01-31 | ✔ 30.944 | 174 | 2.952 | ~0,2M | WhatsApp, Telegram, Slack, Teams, Discord, iMessage | CLI | container por agente | sim | — |
| ✔ deepseek-ai/deepseek-harness | ✔ **MIT** | ✔ 2026-08-13 | ✔ 249.508 | 57 | 22.273 | ~1,7M | — | CLI, web, desktop | sim (Landlock, Seatbelt) | sim | sim |
| aaif-goose/goose (ex-block/goose) | ✔ Apache-2.0 | 2024-08-23 | 55.279 | 659 | 5.822 | ~0,4M | — | CLI, desktop | mínimo | sim | sim |
| block/buzz | Apache-2.0 (0.1) | 2026-03-06 | 35.954 | 117 | 2.890 | ~1,6M | é a própria plataforma | desktop, mobile, web, CLI | — | sim | sim |
| openai/codex | — | 2025-04-13 | 129.187 | 667 | 12.211 | ~2,2M | — | TUI | sim, 3 SOs | sim | — |
| google-gemini/gemini-cli | — | 2025-04-17 | 107.350 | 700 | 6.491 | ~0,6M | — | CLI/TUI | sim | sim | sim |

Declarações públicas (imprensa, tier 3): a primeira versão do nanoclaw foi escrita "em um fim de semana" pelo autor (TechCrunch, 2026-03-13); a OpenClaw começou como projeto paralelo de uma pessoa (cronologia conflitante entre fontes).

## Correções e atualizações à 0.1

| 0.1 | Agora |
|---|---|
| Hermes Agent v0.21.7 | ✔ **v0.22.0** (2026-10-14) |
| DeepSeek Harness: "licença do repositório não lida" | ✔ **MIT**; tag mais recente `dsh-v0.2.1-alpha.3`; README: "developer preview" |
| goose em `block/goose` | Transferido para `aaif-goose/goose` (redireciona) |
| Gateway multicanal "próprio" (D11) | Existem gateways MIT maduros que cobrem os 7 canais, incluindo Buzz; integração antes de construção |

## Leitura do buddy-dev

**HIPÓTESE, com a evidência acima:**
- Um **núcleo mínimo** de agente com canais é viável em dias (o nanoclaw provou isso). Um **produto multi-tudo** é trabalho de anos e de centenas a milhares de pessoas (Hermes, OpenClaw, OpenCode).
- Para um desenvolvedor com agentes, o que cabe é: **núcleo pequeno + composição**. O núcleo faz o que ninguém faz bem; o resto entra por protocolo (ACP, MCP) ou por adaptador.

Não dou estimativa de horas: não há base honesta para isso antes do M0. A **medição real** vem do próprio ledger (eventos por sessão, commits, testes), e o roadmap passa a ser recalibrado a cada marco.

## Proposta de reordenação do roadmap

| Marco | Conteúdo | Por quê |
|---|---|---|
| M0 — Núcleo governado | Loop próprio, 1 provedor da camada barata, CLI, eventos em SQLite, motor de política (R3), orçamento atômico (R1/R5), retomada (R5) | É o diferencial; tudo depende dele |
| M1 — Agentes por ACP | Cliente ACP: OpenCode, Claude Code, Codex, DeepSeek Harness como agentes plugáveis, sob a política do núcleo | Multi-agente e multi-modelo sem reimplementar agentes; testa o caminho por assinatura (R1, hipótese 4) |
| M2 — Execução isolada | Spike sandbox-runtime × mxc-sdk; S1 nos três sistemas (R2) | Antes de dar autonomia real |
| M3 — Memória e identidade | Níveis, claims com evidência, aprovação para escrita | Segundo diferencial |
| M4 — Canais por composição | Avaliar OpenClaw, nanobot, Hermes gateway como transporte de canais (licença, superfície de integração, segurança); Telegram nativo como referência | Os 7 canais sem escrever 7 integrações |
| M5+ | Multi-provedor completo, observabilidade, Web UI, desktop, mobile, distribuição | Na ordem que o uso real pedir |

## Decisão do Pai

- **Aceita** "núcleo próprio + composição", com o escopo completo entregue por integração (ACP, MCP, gateways)?
- **Aceita** a reordenação acima como base do Roadmap e do Plano Macro da F0.8?

## Estado do limite 6

**Parcialmente resolvido:** não há estimativa em horas (não seria honesta), mas há evidência de ordem de grandeza e uma estratégia de escopo que a torna administrável; a medição real começa no M0.
