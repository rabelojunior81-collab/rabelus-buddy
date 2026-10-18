# Roadmap vivo

**Classe:** PLANO · **Versão:** 2 (sobre a Revisão 0.2) · **Atualizado em:** 2026-10-17T20:28:11-03:00 · **Por:** buddy-dev (claude-code-vs-code-569aca)
**Estado:** aprovado pelo Pai em 2026-10-15. **Base:** [Revisão 0.2](../10-pesquisa/rev-0.2/RELATORIO.md) e ADRs [0008](../60-decisoes/0008-orcamento-por-assinaturas.md)–[0012](../60-decisoes/0012-canais-globais-rede-e-buzz.md). A ordem dos marcos foi aceita pelo Pai ([ADR 0010](../60-decisoes/0010-nucleo-governado-e-composicao.md)); o conteúdo detalhado de cada marco é proposta e vira SPEC quando o marco começar.

Onde estamos e para onde vamos. Sem datas: o esforço real começa a ser medido no M0 (pelo ledger) e o roadmap é recalibrado ao fim de cada marco.

## Agora

**M0 — Núcleo governado: concluído em 2026-10-17** ([retrospectiva](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md)). **Agora: M1 — Orquestrador e multimodal**, na ordem C aprovada pelo Pai ([ADR 0018](../60-decisoes/0018-ordem-c-depois-do-m0.md)); SPEC 0002 em rascunho, aguardando a aprovação dele. A Fase 0 foi fechada em 2026-10-15 ([plano](./fase-0/PLANO.md)).

## Princípio

O Rabelus Buddy é um **núcleo governado** (aprovação, orçamento, memória com proveniência, ledger, arquivo morto, identidade portável) que **compõe** o resto: agentes por ACP, ferramentas por MCP, canais por gateways existentes. O trabalho pesado dos agentes roda nas assinaturas do Pai (ChatGPT Plus e OpenCode Go), dentro de US$ 50/mês.

## Marcos

| Marco | Resultado | Demonstração que fecha o marco | Métricas | Depende de |
|---|---|---|---|---|
| **0 — Casa** | Repositório, ferramentas, governança, corpus, CI, pesquisa 0.2, roadmap | `bd pre`/`post` e CI verdes; Pai aprova Roadmap e Plano Macro | — | — |
| **M0 — Núcleo governado** | Loop de agente próprio, **console web local** como superfície do Pai (ADR 0017), CLI `rabelus-buddy`/`rbuddy` do próprio agente, eventos em SQLite com um dono, motor de política (ADR 0009; sem sandbox, comandos ficam em `ask`), orçamento atômico por janela e por dólar, retomada após queda, 1 provedor da camada barata | Uma tarefa real do início ao fim **pela console** (SPEC 0001 rev. 5), com cada aprovação e cada custo no log; `kill -9` no meio e retomada correta | custo por tarefa; latência p50/p95; zero ação de classe protegida sem aprovação; requisitos 1, 6 e 7 da R5 passando | — |
| **M1 — Orquestrador e multimodal** (ADR 0018) | O Rabelus Buddy como **orquestrador**: detecta sozinho os harnesses instalados pelo registro oficial do ACP (ícone, nome, como iniciar) e conversa com eles por ACP, com as permissões decididas pelo núcleo; a autenticação é de cada agente. **Multimodal de entrada**: imagem e arquivo anexados na conversa. Console redesenhada com a ergonomia do t3.chat, em **verde-oliva e vidro**. Contrato tipado console ↔ núcleo (axiomas T3). **Sessão de TUI** com o Pai no fim | Pela console: os harnesses do Pai aparecem sozinhos com ícone; uma tarefa vai a um deles (ex.: OpenCode ou Codex) com cada permissão passando pelo núcleo; uma imagem anexada é entendida por um provedor com visão | % de permissões por política vs. humano; uso de janela por tarefa; tempo até o primeiro sinal | M0 |
| **M2 — Execução isolada** | Spike `sandbox-runtime` × `mxc-sdk`; nível S1 em macOS, Linux e Windows; rede negada por padrão com proxy e lista de domínios; worktree por sessão com integração aprovada | Tentativas de ler, escrever e acessar a rede fora do permitido falham nos três SOs; comandos no workspace rodam sem prompt | RAM e latência por comando; taxa de bloqueio indevido | M0 |
| **M3 — Interface de produto** | A console vira o cliente de produto, com voz; a pilha é decidida aqui (ADR 0013, Expo universal, × T3: Next.js, tRPC, Tailwind), lado a lado | O Pai usa o produto no navegador e no celular, com voz, sem a console paliativa | tempo até o primeiro sinal; tarefas concluídas sem ajuda | M1, M2 |
| **M4 — Memória e identidade** | Memória em níveis com claims e evidência, escrita do agente só com aprovação, expiração e exclusão; identidade versionada carregada por sessão | O agente propõe uma memória, o humano aprova, a recuperação cita a fonte; uma memória é apagada (arquivada) e some da recuperação | precisão de recuperação; cobertura de proveniência | M0 |
| **M5 — Canais por composição** | Avaliação de OpenClaw, nanobot e gateway do Hermes como transporte; Telegram como canal de referência; regras da ADR 0012 | Uma tarefa iniciada e aprovada por mensagem; reentrega do mesmo evento processada uma vez | entrega de eventos; duplicatas tratadas | M0, M1 |
| **M6+ — Superfícies e operação** | Demais canais, multi-provedor por API, observabilidade e avaliação, desktop, distribuição, abertura pública | Definidas quando o uso real indicar a ordem | — | M0–M5 |

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

## Proposta de 2026-10-17 — a ordem depois do M0 (decidida: C, ADR 0018)

Prometida no adendo acima, com o que o M0 ensinou. O detalhe e os prós e contras estão na [retrospectiva](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md).
- **A — Manter:** a ordem atual.
- **B — Interface primeiro:** interface de produto e multimodal no M1, e ACP no M2.
- **C — Console como produto, multimodal cedo (recomendada):** M1 ACP e multimodal de entrada na console; M2 isolamento; M3 interface de produto (ADR 0013) nascida da console, com voz; M4 memória e identidade; M5 canais; M6+ o resto.

Decisão do Pai em 2026-10-17: **C**, com AionUi, T3 e t3.chat como referências ([ADR 0018](../60-decisoes/0018-ordem-c-depois-do-m0.md)). A tabela de marcos acima já está na ordem nova.

## Histórico

- 2026-10-14 — v1: criado na Fase 0 sobre a pesquisa 0.1.
- 2026-10-14 — v2: reescrito sobre a Revisão 0.2 e as ADRs 0008–0012 (núcleo governado + composição).
- 2026-10-17 — marcos reordenados pela opção C (ADR 0018): M1 orquestrador e multimodal; M2 isolamento; M3 interface de produto; M4 memória; M5 canais.
- 2026-10-15 — v2 aprovado pelo Pai; Fase 0 fechada.
- 2026-10-15 — METODO e ADR 0005 aceitos; ADR 0013 (stack mobile e Web) aceita; pendências atualizadas.
- 2026-10-17 — adendo: console web local no M0 (ADR 0017); interface de produto deixa de esperar o M5+; demonstração do M0 pela console.
