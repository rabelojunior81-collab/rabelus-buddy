# Plano Macro — TODO de tudo

**Classe:** PLANO · **Versão:** 2 (sobre a Revisão 0.2) · **Atualizado em:** 2026-10-17T20:28:11-03:00 · **Estado:** aprovado pelo Pai em 2026-10-15

Granularidade grossa: uma linha por capacidade do escopo completo, agrupada pelo marco que a entrega ([ROADMAP](./ROADMAP.md)). Cada linha ganha SPEC e plano quando o marco começa. Entre colchetes, a origem do requisito: briefing (§8), Revisão 0.2 (R1–R6) ou ADR.

Estado: `[ ]` aberto · `[~]` em andamento · `[x]` feito · `[?]` depende de decisão · `[>]` adiado para marco posterior.

## Fase 0 — Casa

- [x] Repositório, ferramentas `bd`, governança, corpus do buddy-dev, bootstrap entre harnesses → [fase-0/PLANO.md](./fase-0/PLANO.md)
- [x] CI: testes, nomes, guarda contra exclusão, segredos
- [x] Espaço do buddy-dev no Blog
- [x] Revisão 0.2 da pesquisa, aceita (ADRs 0008–0012)
- [x] Roadmap v2 e este Plano Macro — aprovados em 2026-10-15
- [x] Retrospectiva da Fase 0

## M0 — Núcleo governado

- [x] SPEC do M0 aprovada pelo Pai (2026-10-15): [rascunho 0001](../40-specs/0001-nucleo-governado/SPEC.md) entregue em 2026-10-15, com spike de banco e IPC; [plano de fase](./m0/PLANO.md) proposto
- [x] Modelo de sessão, execução, passo e evento compartilhado entre interfaces [§8; R5] — CLI e console falam com o mesmo dono (M0.7, M0.8)
- [x] Um processo dono do banco; IPC para os demais [R5-1] — M0.2
- [x] Log de eventos em SQLite com projeções; retomada após `kill -9` [R5-7; §8] — M0.2 e M0.3
- [x] Motor de política (M0.4): deny → ask → allow, escopos (uma vez, sessão, projeto), caminhos protegidos, `ask` → `deny` sem interação, detecção de laço [R3; ADR 0009]
- [x] Orçamento atômico (M0.5): reserva e liquidação; janelas de assinatura e dólares [R1; R5-6; ADR 0008]
- [x] Efeitos externos com identidade estável e estado "desconhecido" [R5-5] — M0.3
- [x] Compactação de contexto abaixo de 100k tokens [R1] — critério 21 (M0.6e)
- [x] 1 provedor da camada barata por API (plano B das assinaturas) [ADR 0008] — OpenRouter com teto de US$ 20 (ADR 0015, M0.6a)
- [x] CLI `rabelus-buddy` / `rbuddy`, strings via catálogo pt-BR/en [ADR 0011; ADR 0002] — do próprio agente (M0.7)
- [x] Console web local, superfície do Pai [ADR 0017] — M0.8 e M0.8d, ensaiadas no ambiente dele
- [x] Auditoria append-only sem conteúdo sensível [§8] — auditoria de segredos (M0.7c)
- [x] **M0 concluído em 2026-10-17** ([retrospectiva](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md)); a nova ordem dos marcos aguarda o Pai

## M1 — Orquestrador e multimodal (ADR 0018)

- [ ] Catálogo de harnesses pelo registro oficial do ACP (ícone, nome, licença, como iniciar), com cópia local verificada; detecção pelo PATH e sonda de disponibilidade, sem configuração [ADR 0018]
- [ ] Cliente ACP (`@agentclientprotocol/sdk`) com `session/request_permission` ligado ao motor de política [ADR 0009; ADR 0018]
- [ ] Harnesses do Pai como agentes plugáveis: OpenCode, Codex, Claude Code, Copilot, Pi (ADR 0016); autenticação do próprio agente (Agent Auth) disparada pela console [ADR 0018]
- [ ] Multimodal de entrada: imagem e arquivo anexados na conversa, enviados a provedores com visão [ADR 0018]
- [ ] Console redesenhada: ergonomia do t3.chat, verde-oliva, vidro, claro e escuro [ADR 0018]
- [ ] Contrato tipado console ↔ núcleo (axiomas T3) [ADR 0018]
- [ ] Política de privacidade de modelos (desligar os que treinam com os dados) [ADR 0008]
- [ ] Medição de janelas de assinatura por tarefa [R1]
- [ ] Sessão de TUI com o Pai: `ink` × `pi-tui`, diferenças visuais, decisão [ADR 0016; ADR 0018]
- [>] DeepSeek Harness e goose como agentes plugáveis (avaliar estabilidade) [R4]

## M2 — Execução isolada

- [ ] Spike `@anthropic-ai/sandbox-runtime` × `@microsoft/mxc-sdk` nos três SOs [R2]
- [ ] S1 em macOS (Seatbelt), Linux (bubblewrap + seccomp), Windows (resultado do spike) [R2; §8]
- [ ] Rede negada por padrão; proxy com lista de domínios por sessão; web como rede [R2; ADR 0012]
- [ ] Worktree por sessão; integração com diff, aprovação e rollback [R5-4; ADR 0009]
- [ ] Claims com geração (compare-and-set) sobre arquivos e worktrees; humano vence [R5-3; R5-8]
- [>] S2 (VM descartável) para plugins de terceiros

## M3 — Interface de produto (ADR 0018)

- [ ] Pilha decidida lado a lado: ADR 0013 (Expo universal) × T3 (Next.js, tRPC, Tailwind) [ADR 0013; ADR 0018]
- [ ] A console vira o cliente de produto; voz na entrada e na saída [ADR 0018]
- [ ] Mobile como cliente fino do núcleo [ADR 0013]

## M4 — Memória e identidade

- [ ] Memória em níveis (pessoa, projeto, workspace, agente, organização) com claims e evidência [§8; briefing §9.5]
- [ ] Escrita do agente só com aprovação; exclusão = arquivamento com trilha [§8; ADR 0004]
- [ ] Busca local (texto + vetores) e citação da fonte [0.1, nota 07]
- [ ] Identidade versionada (arquivos) carregada por sessão [0.1, nota 07]
- [ ] Defesa contra envenenamento de memória [0.1, nota 08]

## M5 — Canais por composição

- [ ] Avaliação de OpenClaw, nanobot e gateway do Hermes (licença, integração, segurança) [R4]
- [ ] Telegram como canal de referência [ADR 0010]
- [ ] Regras de entrada: só mensagens endereçadas; conteúdo de sala não confiável [ADR 0012]
- [ ] Gateway com armazenamento próprio e entrega idempotente ao núcleo [R5-2]

## M6+ — Superfícies e operação

- [ ] WhatsApp, Slack, Teams, Discord, e-mail, Buzz [§8; briefing §9.3]
- [ ] Multi-provedor por API completo (Anthropic, OpenAI, Google) com diferenças declaradas [§8]
- [ ] Plugins, scripts e skills com permissão e isolamento; MCP; A2A registrado [§8]
- [ ] Tracing, avaliação, controle de custo e auditoria (OTel GenAI) [§8]
- [>] Web UI e mobile: movidos para o M3 (ADR 0018); desktop fica aqui
- [>] TUI: decisão na sessão com o Pai no fim do M1 (ADR 0018)
- [ ] Distribuição por instaladores; lojas depois
- [ ] Abertura pública: buscas de marca (R6), canal de denúncia e segurança, rulesets, PVR

## Decisões pendentes do Pai

- [x] Stack do app mobile e da Web UI: ADR 0013 (aceita, 2026-10-15)
- [x] Aceite do `METODO.md` e da ADR 0005 (2026-10-15)
