# Plano — M1: Orquestrador e multimodal

**SPEC:** [0002-orquestrador-e-multimodal](../../40-specs/0002-orquestrador-e-multimodal/SPEC.md) · **Estado:** em execução (aprovado pelo Pai em 2026-10-18, com a SPEC) · **Decisão:** [ADR 0018](../../60-decisoes/0018-ordem-c-depois-do-m0.md)
**Branch(es):** uma por sub-fase, `feat/m1-N-<slug>` · **Atualizado em:** 2026-10-20T00:51:00-03:00

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
- [x] **M1.2 Cliente ACP:** sonda, primeira execução aprovada, conversa com andamento ao vivo, permissões pelo núcleo, autenticação do agente (critérios 3–7); checagem contra um harness real do Pai (OpenCode ou Codex) registrada (**feita em 2026-10-19**, as cinco sub-fases abaixo; o login do Pai num harness real fica para o ensaio da M1.6, por decisão dele)
  - [x] **M1.2a Sonda** (critério 3): pronto, precisa de login ou falhou; executável local preferido. Checagem real em 2026-10-18: OpenCode, Copilot e Hermes **prontos**
  - [x] **M1.2b Primeira execução aprovada** (critério 4), **começando pelo Codex** (**feita em 2026-10-18**: o Pai aprovou na console e o Codex ficou pronto; aprovar agora roda a sonda e mostra o resultado): o `codex` instalado (0.163.0) não fala ACP direto (sem subcomando `acp`; só `app-server` e `exec`), então o caminho é o adaptador `npx @agentclientprotocol/codex-acp@2.2.2`, que usa o login do ChatGPT do Pai. A aprovação aparece na console com pacote e versão; aprovada, vale para essa versão. Depois, Claude (`claude-agent-acp`) e pi (`pi-acp`)
  - [x] **M1.2c Conversa por ACP** (critério 5): `session/prompt` com andamento ao vivo no `run.live`; checagem real com o OpenCode e com o Codex (**feita em 2026-10-18**: os dois responderam e usaram ferramentas; [registro](../../registros/2026-10-18T220140-0300-checagem-real-da-conversa-por-acp/README.md))
  - [x] **M1.2d Permissões pelo núcleo** (critério 6) (**feita em 2026-10-19**). Achado da M1.2c: o OpenCode e o Codex **escreviam sem pedir permissão** na configuração do Pai. Agora o núcleo define a postura ao abrir a sessão: Codex em `read-only`; OpenCode com `permission: ask` só no processo filho. Cada pedido passa pela política e, se for `ask`, vira aprovação com o nome do harness e o alvo; negar para a execução por `permissionDenied`; escrita sem pedido vira aviso. Checagem real com os dois ([registro](../../registros/2026-10-19T012430-0300-checagem-real-das-permissoes-pelo-nucleo/README.md)); o ícone e a escolha do harness na tela são da M1.5
  - [x] **M1.2e Login do harness** (critério 7), **só no núcleo** (**feita em 2026-10-19**): com `auth_required`, a conversa para por `needsLogin` com os métodos que o harness declara (sem os de terminal); `harness.login` chama `authenticate`, e o harness abre o navegador e guarda a própria credencial; método de terminal é recusado antes do `authenticate`. Teste com o harness falso; checagem real sem efeito para o Pai ([registro](../../registros/2026-10-19T103147-0300-checagem-real-do-login-do-harness-sem-efeito/README.md)). Por decisão do Pai em 2026-10-19, a participação dele foi transportada: o "Entrar" na tela é da M1.5, e o login dele num harness real é do ensaio da M1.6. O layout antigo impede ver, testar e validar.

**Ordem a partir de 2026-10-19** (pedido do Pai): M1.2e (núcleo) → **M1.5** → M1.3 → M1.4 → M1.6 → M1.7. A M1.5 já podia correr em paralelo desde a M1.0, e os anexos da M1.3 vivem na caixa de mensagem nova.
- [ ] **M1.3 Multimodal de entrada:** anexos na caixa de mensagem, tabela de visão medida, rotas sem visão puladas, imagem por ACP (critério 9); checagem real com ChatGPT e Nemotron registrada
  - [x] **M1.3a No núcleo** (**feita em 2026-10-20**):
    - anexo guardado na pasta de trabalho com o hash no nome, e só a referência no log;
    - imagem e texto no formato de cada rota;
    - visão pelo catálogo medido, com a tabela da SPEC como piso, e rota sem visão pulada com o motivo;
    - bloco `image` só para o harness que declara suporte.

    Checagem real: o ChatGPT, o Nemotron VL e o OpenCode entenderam a imagem, e o Codex a recebeu ([registro](../../registros/2026-10-20T005032-0300-checagem-real-dos-anexos-e-da-imagem/README.md)).
  - [ ] **M1.3b Na console:** anexar, arrastar e colar na caixa de mensagem, com chips e remover; botão de imagem ativo só com visão; motivos à vista; ensaio no navegador real.
- [ ] **M1.4 Delegação:** ferramenta `delegar` do Buddy (critério 8)
- [ ] **M1.5 Console nova** (inclui os níveis de esforço além de baixo, médio e alto que o ChatGPT declara: `xhigh`, `max`, `ultra`, executados no núcleo com teste antes de a console oferecê-los) (protótipo v4 **aprovado** pelo Pai em 2026-10-18, com a logomarca do Rabelus Lab ao lado do nome; ajustes visuais do Pai de 2026-10-18: cantos quadrados, liquid glass, compacto, transições, degradê, tipografia do rabelus.com; referências do Kanban e dos Bots do Hermes): o protótipo aprovado vira a console, com tudo do M0 rearranjado e o contraste AA medido (critério 11); ensaio no navegador real
  - [x] **M1.5a Casca nova com tudo do M0** (**feita em 2026-10-19**, ensaiada no navegador real: [registro](../../registros/2026-10-19T105620-0300-ensaio-da-console-nova-m1-5a/README.md)):
    - barra lateral com a marca, "Nova conversa", conversas e harnesses encontrados;
    - início com saudação, e a conversa;
    - caixa de mensagem ancorada, de vidro, com esforço, provedor, Enviar e Parar;
    - painel de Ajustes com provedores, ChatGPT, chaves, consumo, idioma, tema e pasta de trabalho;
    - aprovação também dentro da conversa;
    - paleta oliva OKLCH nos dois temas, contraste AA medido por teste, 375 px sem rolagem horizontal, nada de fora (a marca é servida pela própria console).
  - [x] **M1.5b Harness na caixa** (**feita em 2026-10-19**, ensaiada com o OpenCode real: [registro](../../registros/2026-10-19T111729-0300-ensaio-do-harness-na-caixa-m1-5b/README.md)): pílula de harness com ícone e estado; conversa com o harness escolhido; cartão de permissão com o ícone de quem pede; "Entrar" para o harness que pede login (`harness.login`); avisos de escrita sem pedido.
  - [x] **M1.5c Seletor de modelo** (**feita em 2026-10-19**, com checagem real dos níveis no ChatGPT e ensaio no navegador: [registro](../../registros/2026-10-19T115201-0300-ensaio-do-seletor-de-modelo-m1-5c/README.md)): o catálogo real (provedor → lab → modelo, capacidades, busca e filtro) no lugar do seletor de provedor; esforço conforme o modelo; níveis `xhigh`, `max` e `ultra` no núcleo, com teste antes.
  - [ ] **M1.5d Ensaio completo** no navegador real, a 375 e a 1440 px, nos dois temas, com capturas; depois, a validação do Pai pela console. **Ensaio feito em 2026-10-19**: as larguras e os temas nos ensaios da M1.5a a M1.5c; o roteiro do Pai no ambiente dele, com o ChatGPT em "Muito alto" e o OpenCode com escrita aprovada ([registro](../../registros/2026-10-19T121109-0300-ensaio-da-console-nova-no-ambiente-do-pai-m1-5d/README.md)). **Aguarda a validação do Pai** (`validar-console-nova-m1-5`).
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
