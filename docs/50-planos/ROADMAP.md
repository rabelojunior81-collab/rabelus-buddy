# Roadmap vivo

**Classe:** PLANO · **Versão:** 2 (sobre a Revisão 0.2) · **Atualizado em:** 2026-10-17T19:39:15-03:00 · **Por:** buddy-dev (claude-code-vs-code-9497ba)
**Estado:** aprovado pelo Pai em 2026-10-15. **Base:** [Revisão 0.2](../10-pesquisa/rev-0.2/RELATORIO.md) e ADRs [0008](../60-decisoes/0008-orcamento-por-assinaturas.md)–[0012](../60-decisoes/0012-canais-globais-rede-e-buzz.md). A ordem dos marcos foi aceita pelo Pai ([ADR 0010](../60-decisoes/0010-nucleo-governado-e-composicao.md)); o conteúdo detalhado de cada marco é proposta e vira SPEC quando o marco começar.

Onde estamos e para onde vamos. Sem datas: o esforço real começa a ser medido no M0 (pelo ledger) e o roadmap é recalibrado ao fim de cada marco.

## Agora

**M0 — Núcleo governado: concluído em 2026-10-17**, validado pelo Pai pela console ([retrospectiva e métricas](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md)). **Aguarda o Pai:** a ordem dos próximos marcos (proposta abaixo). A Fase 0 foi fechada em 2026-10-15 ([plano](./fase-0/PLANO.md)).

## Princípio

O Rabelus Buddy é um **núcleo governado** (aprovação, orçamento, memória com proveniência, ledger, arquivo morto, identidade portável) que **compõe** o resto: agentes por ACP, ferramentas por MCP, canais por gateways existentes. O trabalho pesado dos agentes roda nas assinaturas do Pai (ChatGPT Plus e OpenCode Go), dentro de US$ 50/mês.

## Marcos

| Marco | Resultado | Demonstração que fecha o marco | Métricas | Depende de |
|---|---|---|---|---|
| **0 — Casa** | Repositório, ferramentas, governança, corpus, CI, pesquisa 0.2, roadmap | `bd pre`/`post` e CI verdes; Pai aprova Roadmap e Plano Macro | — | — |
| **M0 — Núcleo governado** | Loop de agente próprio, **console web local** como superfície do Pai (ADR 0017), CLI `rabelus-buddy`/`rbuddy` do próprio agente, eventos em SQLite com um dono, motor de política (ADR 0009; sem sandbox, comandos ficam em `ask`), orçamento atômico por janela e por dólar, retomada após queda, 1 provedor da camada barata | Uma tarefa real do início ao fim **pela console** (SPEC 0001 rev. 5), com cada aprovação e cada custo no log; `kill -9` no meio e retomada correta | custo por tarefa; latência p50/p95; zero ação de classe protegida sem aprovação; requisitos 1, 6 e 7 da R5 passando | — |
| **M1 — Agentes por ACP** | Cliente ACP; Pi como agente plugável com extensão de governança (ADR 0016); OpenCode (`opencode acp`, OpenCode Go) e Codex (`@agentclientprotocol/codex-acp`, login ChatGPT) como agentes plugáveis sob a política do núcleo; contagem de janelas de assinatura | A mesma tarefa executada por OpenCode e por Codex, com as permissões decididas pelo núcleo e o consumo registrado | % de pedidos de permissão resolvidos por política vs. humano; uso de janela por tarefa | M0 |
| **M2 — Execução isolada** | Spike `sandbox-runtime` × `mxc-sdk`; nível S1 em macOS, Linux e Windows; rede negada por padrão com proxy e lista de domínios; worktree por sessão com integração aprovada | Tentativas de ler, escrever e acessar a rede fora do permitido falham nos três SOs; comandos no workspace rodam sem prompt | RAM e latência por comando; taxa de bloqueio indevido | M0 |
| **M3 — Memória e identidade** | Memória em níveis com claims e evidência, escrita do agente só com aprovação, expiração e exclusão; identidade versionada carregada por sessão | O agente propõe uma memória, o humano aprova, a recuperação cita a fonte; uma memória é apagada (arquivada) e some da recuperação | precisão de recuperação; cobertura de proveniência | M0 |
| **M4 — Canais por composição** | Avaliação de OpenClaw, nanobot e gateway do Hermes como transporte; Telegram como canal de referência; regras da ADR 0012 (só mensagens endereçadas, conteúdo de sala não confiável) | Uma tarefa iniciada e aprovada por mensagem; reentrega do mesmo evento processada uma vez | entrega de eventos; duplicatas tratadas | M0, M1 |
| **M5+ — Superfícies e operação** | Demais canais (WhatsApp, Slack, Teams, Discord, e-mail, Buzz), multi-provedor por API, observabilidade e avaliação, Web UI, desktop, mobile (stack: ADR 0013), distribuição, abertura pública | Definidas quando o uso real do M0–M4 indicar a ordem | — | M0–M4 |

## Riscos que o roadmap carrega

- **Assinaturas mudam sem aviso** (modelos, limites, termos). Mitigação: fichas reverificadas a cada marco; o núcleo mede janelas; plano B por API na camada barata.
- **Windows nativo sem sandbox maduro** (R2). Mitigação: spike no M2; até lá, comandos pedem aprovação.
- **Dependência de projetos de terceiros** (ACP, gateways). Mitigação: adaptadores isolados, contratos versionados.
- **Preços com data de mudança**: Gemini 4 Argon dobra em 2026-12-01; Gemini 3.8 Flash em 2027-01-01.

## Decisões ainda pendentes

- ~~Stack do app mobile e da Web UI~~: [ADR 0013](../60-decisoes/0013-stack-mobile-e-web.md) aceita em 2026-10-15 (Expo universal, depois Web React DOM separada).
- ~~Aceite do `METODO.md` e da ADR 0005~~: aceitos pelo Pai em 2026-10-15.

## Adendo de 2026-10-17 — a interface vem antes

O Pai: "não estou construindo uma CLI; estou construindo um agente multimodal com UX e UI". Decisões e consequências:
- a **console web local** (ADR 0017) entra no M0 como superfície do Pai, paliativa e sem dependência;
- a interface de produto (ADR 0013: Expo universal, depois Web React DOM) **não espera mais o M5+**: o reposicionamento dela e dos demais marcos é proposto ao Pai no fechamento do M0, com o que a console tiver ensinado;
- a CLI fica como interface do próprio agente e das ferramentas, nunca superfície de teste do Pai.

## Proposta de 2026-10-17 — a ordem depois do M0 (aguarda o Pai)

Prometida no adendo acima, com o que o M0 ensinou. O detalhe e os prós e contras estão na [retrospectiva](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md).
- **A — Manter:** a ordem atual.
- **B — Interface primeiro:** interface de produto e multimodal no M1, e ACP no M2.
- **C — Console como produto, multimodal cedo (recomendada):** M1 ACP e multimodal de entrada na console; M2 isolamento; M3 interface de produto (ADR 0013) nascida da console, com voz; M4 memória e identidade; M5 canais; M6+ o resto.

A tabela de marcos acima só muda depois da decisão.

## Histórico

- 2026-10-14 — v1: criado na Fase 0 sobre a pesquisa 0.1.
- 2026-10-14 — v2: reescrito sobre a Revisão 0.2 e as ADRs 0008–0012 (núcleo governado + composição).
- 2026-10-15 — v2 aprovado pelo Pai; Fase 0 fechada.
- 2026-10-15 — METODO e ADR 0005 aceitos; ADR 0013 (stack mobile e Web) aceita; pendências atualizadas.
- 2026-10-17 — adendo: console web local no M0 (ADR 0017); interface de produto deixa de esperar o M5+; demonstração do M0 pela console.
