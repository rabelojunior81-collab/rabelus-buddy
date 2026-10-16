# Plano Macro — TODO de tudo

**Classe:** PLANO · **Versão:** 2 (sobre a Revisão 0.2) · **Atualizado em:** 2026-10-16T01:05:52-03:00 · **Estado:** aprovado pelo Pai em 2026-10-15

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
- [ ] Modelo de sessão, execução, passo e evento compartilhado entre interfaces [§8; R5]
- [x] Um processo dono do banco; IPC para os demais [R5-1] — M0.2
- [~] Log de eventos em SQLite com projeções; retomada após `kill -9` [R5-7; §8] — log e projeções na M0.2; retomada na M0.3
- [ ] Motor de política: deny → ask → allow, escopos (uma vez, sessão, projeto), caminhos protegidos, `ask` → `deny` sem interação, detecção de laço [R3; ADR 0009]
- [ ] Orçamento atômico: reserva e liquidação; janelas de assinatura e dólares [R1; R5-6; ADR 0008]
- [ ] Efeitos externos com identidade estável e estado "desconhecido" [R5-5]
- [ ] Compactação de contexto abaixo de 100k tokens [R1]
- [ ] 1 provedor da camada barata por API (plano B das assinaturas) [ADR 0008]
- [~] CLI `rabelus-buddy` / `rbuddy`, strings via catálogo pt-BR/en [ADR 0011; ADR 0002] — base na M0.1
- [ ] Auditoria append-only sem conteúdo sensível [§8]

## M1 — Agentes por ACP

- [ ] Cliente ACP com `session/request_permission` ligado ao motor de política [ADR 0009]
- [ ] OpenCode via `opencode acp` com OpenCode Go; identificação conforme os termos do Go [ADR 0008]
- [ ] Codex via `@agentclientprotocol/codex-acp` com login ChatGPT [ADR 0008]
- [ ] Política de privacidade de modelos (desligar os que treinam com os dados) [ADR 0008]
- [ ] Medição de janelas de assinatura por tarefa [R1]
- [>] DeepSeek Harness e goose como agentes plugáveis (avaliar estabilidade) [R4]

## M2 — Execução isolada

- [ ] Spike `@anthropic-ai/sandbox-runtime` × `@microsoft/mxc-sdk` nos três SOs [R2]
- [ ] S1 em macOS (Seatbelt), Linux (bubblewrap + seccomp), Windows (resultado do spike) [R2; §8]
- [ ] Rede negada por padrão; proxy com lista de domínios por sessão; web como rede [R2; ADR 0012]
- [ ] Worktree por sessão; integração com diff, aprovação e rollback [R5-4; ADR 0009]
- [ ] Claims com geração (compare-and-set) sobre arquivos e worktrees; humano vence [R5-3; R5-8]
- [>] S2 (VM descartável) para plugins de terceiros

## M3 — Memória e identidade

- [ ] Memória em níveis (pessoa, projeto, workspace, agente, organização) com claims e evidência [§8; briefing §9.5]
- [ ] Escrita do agente só com aprovação; exclusão = arquivamento com trilha [§8; ADR 0004]
- [ ] Busca local (texto + vetores) e citação da fonte [0.1, nota 07]
- [ ] Identidade versionada (arquivos) carregada por sessão [0.1, nota 07]
- [ ] Defesa contra envenenamento de memória [0.1, nota 08]

## M4 — Canais por composição

- [ ] Avaliação de OpenClaw, nanobot e gateway do Hermes (licença, integração, segurança) [R4]
- [ ] Telegram como canal de referência [ADR 0010]
- [ ] Regras de entrada: só mensagens endereçadas; conteúdo de sala não confiável [ADR 0012]
- [ ] Gateway com armazenamento próprio e entrega idempotente ao núcleo [R5-2]

## M5+ — Superfícies e operação

- [ ] WhatsApp, Slack, Teams, Discord, e-mail, Buzz [§8; briefing §9.3]
- [ ] Multi-provedor por API completo (Anthropic, OpenAI, Google) com diferenças declaradas [§8]
- [ ] Plugins, scripts e skills com permissão e isolamento; MCP; A2A registrado [§8]
- [ ] Tracing, avaliação, controle de custo e auditoria (OTel GenAI) [§8]
- [ ] Web UI · desktop · mobile cliente fino — stack da ADR 0013 (Expo universal → Web React DOM)
- [ ] TUI — biblioteca em avaliação, `ink` × `pi-tui`, com referências visuais ao Pai (ADR 0016)
- [ ] Distribuição por instaladores; lojas depois
- [ ] Abertura pública: buscas de marca (R6), canal de denúncia e segurança, rulesets, PVR

## Decisões pendentes do Pai

- [x] Stack do app mobile e da Web UI: ADR 0013 (aceita, 2026-10-15)
- [x] Aceite do `METODO.md` e da ADR 0005 (2026-10-15)
