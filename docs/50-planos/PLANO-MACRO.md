# Plano Macro — TODO de tudo

**Classe:** PLANO · **Atualizado em:** 2026-10-14T10:40:00-03:00 · **Estado:** rascunho (aprofunda-se a cada fase)

Granularidade grossa: uma linha por capacidade que o escopo completo exige. A fonte é o briefing (`docs/00-proveniencia/BRAINSTORM.md`, §4 e §8) e as decisões do Pai. Cada linha ganha SPEC e plano próprios quando sua fase começa. Estado: `[ ]` aberto · `[~]` em andamento · `[x]` feito · `[?]` depende de decisão.

## Fase 0 — Casa

- [~] Repositório, ferramentas, governança, corpus, bootstrap → [fase-0/PLANO.md](./fase-0/PLANO.md)
- [ ] CI com testes, lint de nomes, guarda contra exclusão, varredura de segredos
- [ ] Revisão 0.2 da pesquisa (custo, esforço, sandbox macOS/Linux, aprovações com escopo, concorrência, nome)
- [ ] Espaço do buddy-dev no Blog do Lab

## Produto — capacidades do escopo completo (briefing §8)

**Núcleo e sessões**
- [ ] Modelo de sessão e eventos compartilhado entre interfaces
- [ ] Runtime com ferramentas e aprovações explícitas (8 classes de ação)
- [ ] Persistência e retomada de sessões concorrentes
- [ ] Orçamento fechado com degradação por camada de modelo

**Provedores**
- [ ] Adaptadores OpenAI, Anthropic, Google, com casos de uso comparáveis e diferenças declaradas
- [ ] Modelos locais: disponibilidade e preparação (sem prioridade)

**Execução**
- [ ] Workspace isolado com limites demonstráveis em Windows, macOS e Linux
- [?] Execução remota opcional

**Memória e identidade**
- [ ] Memória em 5 níveis (pessoa, projeto, workspace, agente, organização) com proveniência, exclusão e aprovação para escrita do agente
- [ ] Identidade do agente versionada (arquivos), carregada por sessão

**Extensibilidade**
- [ ] Plugins, scripts e skills com permissão e isolamento
- [ ] Protocolos MCP e ACP; A2A registrado

**Canais e superfícies**
- [ ] CLI/TUI · Web UI · Desktop · Mobile (cliente fino) — [?] decisão de stack mobile
- [ ] Telegram · Slack · Discord · E-mail · Teams · WhatsApp · Buzz — [?] países e regiões

**Operação**
- [ ] Tracing, avaliação, controle de custo e auditoria
- [ ] i18n pt-BR e en em todas as superfícies
- [ ] Distribuição: instaladores; lojas depois
- [ ] Abertura pública do repositório (rulesets, PVR, canal de denúncia)

## Decisões pendentes do Pai (do briefing e da organização)

- [?] Países e regiões dos canais de mensageria
- [?] Pesquisa na web exige aprovação?
- [?] Identidade e permissões ao integrar o Buzz (multiusuário)
- [?] Stack mobile (Tauri mobile ou Flutter)
- [?] Papel de "membros do projeto" e "administrador" num produto individual
