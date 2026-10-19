# Plano — M1: Orquestrador e multimodal

**SPEC:** [0002-orquestrador-e-multimodal](../../40-specs/0002-orquestrador-e-multimodal/SPEC.md) · **Estado:** em execução (aprovado pelo Pai em 2026-10-18, com a SPEC) · **Decisão:** [ADR 0018](../../60-decisoes/0018-ordem-c-depois-do-m0.md)
**Branch(es):** uma por sub-fase, `feat/m1-N-<slug>` · **Atualizado em:** 2026-10-18T22:02:35-03:00

## Objetivo

O Rabelus Buddy vira o **orquestrador**:
- reconhece sozinho os harnesses instalados, pelo registro oficial do ACP, e os mostra com ícone;
- conversa com eles por ACP, com cada permissão decidida pelo núcleo;
- entende imagem e arquivo anexados;
- ganha a console nova, com a ergonomia do t3.chat, em verde-oliva e vidro.

O marco fecha com o ensaio real com o Pai e com a sessão de decisão da TUI.

## TODO

- [x] **M1.0 Fundação:** dependências aprovadas instaladas (`@agentclientprotocol/sdk`, `zod`) com ficha e registro; contrato tipado dos métodos da console (critério 10), com teste antes e ensaio no navegador ([registro](../../registros/2026-10-18T123449-0300-ensaio-do-m1-0-contrato-tipado/README.md)). **Feito em 2026-10-18.**
- [x] **M1.1 Catálogo e detecção** (**feita em 2026-10-18** na parte do núcleo; o seletor de modelo e a lista de harnesses na tela são da M1.5): registro oficial com cópia local e ícones servidos pela console; sinais de instalação; tabela de fora do registro (critérios 1 e 2) (**feito em 2026-10-18**, com checagem real: os 6 harnesses do Pai achados sozinhos); **catálogo de modelos provedor → lab → modelo com capacidades e fonte, em seletor separado do de harness** (critério 13; **núcleo feito em 2026-10-18**, com checagem real: 538 modelos em 4 provedores; o seletor é da M1.5); **resposta vazia do provedor (0 tokens, nenhum pedaço) vira aviso visível, não "concluída" muda** (achado no ensaio do M1.0), com teste antes (**feito em 2026-10-18**: troca de provedor ou parada com motivo legível)
- [ ] **M1.2 Cliente ACP:** sonda, primeira execução aprovada, conversa com andamento ao vivo, permissões pelo núcleo, autenticação do agente (critérios 3–7); checagem contra um harness real do Pai (OpenCode ou Codex) registrada
  - [x] **M1.2a Sonda** (critério 3): pronto, precisa de login ou falhou; executável local preferido. Checagem real em 2026-10-18: OpenCode, Copilot e Hermes **prontos**
  - [x] **M1.2b Primeira execução aprovada** (critério 4), **começando pelo Codex** (**feita em 2026-10-18**: o Pai aprovou na console e o Codex ficou pronto; aprovar agora roda a sonda e mostra o resultado): o `codex` instalado (0.163.0) não fala ACP direto (sem subcomando `acp`; só `app-server` e `exec`), então o caminho é o adaptador `npx @agentclientprotocol/codex-acp@2.2.2`, que usa o login do ChatGPT do Pai. A aprovação aparece na console com pacote e versão; aprovada, vale para essa versão. Depois, Claude (`claude-agent-acp`) e pi (`pi-acp`)
  - [x] **M1.2c Conversa por ACP** (critério 5): `session/prompt` com andamento ao vivo no `run.live`; checagem real com o OpenCode e com o Codex (**feita em 2026-10-18**: os dois responderam e usaram ferramentas; [registro](../../registros/2026-10-18T220140-0300-checagem-real-da-conversa-por-acp/README.md))
  - [ ] **M1.2d Permissões pelo núcleo** (critério 6) e **M1.2e Login do harness** (critério 7). Achado da M1.2c: o OpenCode e o Codex **escreveram sem pedir permissão** na configuração do Pai; a M1.2d começa por fazer o harness perguntar ao núcleo (modos e opções de sessão do ACP, configuração de cada harness)
- [ ] **M1.3 Multimodal de entrada:** anexos na caixa de mensagem, tabela de visão medida, rotas sem visão puladas, imagem por ACP (critério 9); checagem real com ChatGPT e Nemotron registrada
- [ ] **M1.4 Delegação:** ferramenta `delegar` do Buddy (critério 8)
- [ ] **M1.5 Console nova** (inclui os níveis de esforço além de baixo, médio e alto que o ChatGPT declara: `xhigh`, `max`, `ultra`, executados no núcleo com teste antes de a console oferecê-los) (protótipo v4 **aprovado** pelo Pai em 2026-10-18, com a logomarca do Rabelus Lab ao lado do nome; ajustes visuais do Pai de 2026-10-18: cantos quadrados, liquid glass, compacto, transições, degradê, tipografia do rabelus.com; referências do Kanban e dos Bots do Hermes): o protótipo aprovado vira a console, com tudo do M0 rearranjado e o contraste AA medido (critério 11); ensaio no navegador real
- [ ] **M1.6 Ensaio real e demonstração com o Pai** (critério 12); métricas; retrospectiva
- [ ] **M1.7 Sessão de TUI com o Pai:** `ink` × `pi-tui`, diferenças visuais, decisão registrada (critério 14; ADR 0016)

## Dependências e bloqueios

| Sub-fase | Depende de | Bloqueada por resposta do Pai |
|---|---|---|
| M1.0 | — | aprovação da SPEC, do protótipo e das duas dependências |
| M1.1, M1.3 | M1.0 | — |
| M1.2 | M1.0, M1.1 | — |
| M1.4 | M1.2 | — |
| M1.5 | M1.0 (pode correr em paralelo a M1.1–M1.4) | aprovação do protótipo visual |
| M1.6 | M1.1–M1.5 | o Pai: demonstração pela console |
| M1.7 | — (preparação em paralelo) | o Pai: a sessão e a decisão |

**Enquanto a SPEC aguarda o Pai** (AGENTS §5.4), sem código de produto:
- ficam prontos o desenho dos testes e as peças falsas (`fakeRegistry`, `fakePath`, `fakeAcpAgent`);
- a leitura da especificação do ACP (`session/update`, `request_permission`, `authenticate`);
- a tabela de sinais de instalação dos 42 agentes do registro.
