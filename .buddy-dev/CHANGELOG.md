# CHANGELOG — buddy-dev

> **Append-only.** Uma entrada por ação relevante, adicionada só por `npm run bd -- changelog add --type <tipo> --text "..."` (numeração, carimbo e sessão automáticos). Nunca editar uma entrada existente: corrige-se com outra entrada.
>
> **Teto: 50 entradas.** Acima disso, extraia as lições do lote mais antigo para `LEARNING-CURVE.md` (citando `lote #NNNN-#NNNN`) e rode `npm run bd -- changelog prune`: o lote vai, verbatim e com sha256, para `archive/changelog/`.
>
> **Paralelo:** este arquivo usa `merge=union` (`.gitattributes`); entradas de ramos diferentes se somam no merge. Números podem repetir entre ramos; a identidade de uma entrada é carimbo + sessão.
>
> Tipos: `nascimento`, `ferramenta`, `doc`, `decisao`, `pesquisa`, `correcao`, `aprendizado`, `processo`.

### #0041 · 2026-10-16T012153-0300 · claude-code-vs-code-fe93fb · ferramenta

M0.4: motor de política com auditoria em eventos, FsTools com compare-and-set e CommandTool só com aprovação explícita de uma vez; critérios 7–13 e 20; rebuild das projeções cobre a política (teste novo).

### #0042 · 2026-10-16T012845-0300 · claude-code-vs-code-fe93fb · ferramenta

M0.5: orçamento atômico por janela (Go por modelo 5h/semana/mês, ChatGPT pelo provedor, OpenRouter US$20/mês), reserva → liquidação pelo usage ou liberação, esgotamento por erro do provedor, rbuddy budget; critérios 14–16.

### #0043 · 2026-10-16T014212-0300 · claude-code-vs-code-fe93fb · ferramenta

M0.6a: provedores OpenCode Go (Responses, Chat, Messages, Google), Ollama Cloud e OpenRouter com os SDKs aprovados; sonda e chamada real mínima por rota OK; Node passou a somar os certificados do sistema (cadeia do OpenRouter); npm audit na CI e scripts de instalação sob o protocolo.

### #0044 · 2026-10-16T020142-0300 · claude-code-vs-code-fe93fb · feat

M0.6b: ChatGPT por Sign in with ChatGPT (rbuddy login/logout chatgpt; PKCE, ID token pelo JWKS, credenciais 0600, refresh rotativo serializado; inferência em stream no contrato da prévia). Critérios 18 e 19 verdes contra servidores falsos; login real aguarda o Pai.

### #0045 · 2026-10-16T020831-0300 · claude-code-vs-code-fe93fb · feat

M0.6e: loop do agente (ordem de provedores com política e orçamento, chamada de modelo e escrita/comando como efeitos com identidade, troca ao esgotar janela, escrita uma vez, aprovação humana, compactação abaixo de 100k tokens). M0.6 completa.

### #0046 · 2026-10-16T021524-0300 · claude-code-vs-code-fe93fb · feat

M0.7a: retomada do loop (conversa no log, reconciliação por tipo de efeito) e o dono executando o agente (agent.run/agent.resume, aprovação pelo IPC, rotas e credenciais configuradas); kill -9 + resume sem escrita duplicada contra provedor falso.

### #0047 · 2026-10-16T022302-0300 · claude-code-vs-code-fe93fb · feat

M0.7b: CLI do agente (run com dono sob demanda e aprovação no terminal, resume, status, log, providers, login/logout por chave). bd surfaces passa a cobrar que toda sub-fase concluída esteja no CHANGELOG do produto e a última no Estado dos READMEs (lacuna de M0.6b–M0.7a corrigida).

### #0048 · 2026-10-17T075059-0300 · claude-code-vs-code-fe93fb · feat

M0.7c: auditoria por teste de segredos (critério 22, ponta a ponta, conferido por mutação) e do catálogo (critério 23); preços por modelo do Go; fumaça real do rbuddy run no Go registrada. M0.7 completa; M0.8 aguarda o Pai.

### #0049 · 2026-10-17T083810-0300 · claude-code-vs-code-7307c7 · fix

Auditoria real depois da falha no shell do Pai: login do ChatGPT quebrado na OpenAI real (ext_agent_host_id), 403 tratado como efeito desconhecido, modelo gratuito cobrado, CLI com stack trace, dono eterno com ambiente velho — corrigidos; regra nova com mecanismo (ação do Pai exige ensaio, nunca por CLI).

### #0050 · 2026-10-17T090326-0300 · claude-code-vs-code-7307c7 · decisao

Opção A aprovada pelo Pai: console web local servida pelo núcleo (ADR 0017); SPEC 0001 rev. 5 (escopo 19, critérios 26–30); plano revisado com M0.8 (console) e M0.9 (demonstração pela console, aglutinando testes reais); adendo no ROADMAP; ficha de assinaturas reverificada ao vivo.

### #0051 · 2026-10-17T091458-0300 · claude-code-vs-code-7307c7 · feat

M0.8a: esforço de raciocínio por rota (com repetição sem ele se recusado), rota por execução, conversa contínua, chaves/provedores/login do ChatGPT pelo núcleo; campos omitidos da prévia do SIWC atualizados.

### #0052 · 2026-10-17T094540-0300 · claude-code-vs-code-7307c7 · feat

M0.8: console web local (chat com esforço, provedor, aprovações, conversa contínua, chaves, login do ChatGPT, consumo, Retomar; pt-BR/en; celular), aberta por abrir-rabelus-buddy.cmd; ensaiada na máquina do Pai, que acompanhou e corrigiu o layout; nove defeitos achados e corrigidos com teste.

### #0053 · 2026-10-17T164139-0300 · claude-code-vs-code-7307c7 · fix

ChatGPT sem resposta na console: o backend real manda output vazio no response.completed; o núcleo lê os itens de response.output_item.done (medido ao vivo, teste com a sequência real); console formata listas e blocos de código, 'Trocar de conta' quando conectado, rótulos acessíveis traduzidos; login do ChatGPT do Pai feito

### #0054 · 2026-10-17T182728-0300 · claude-code-vs-code-822419 · governanca

bd claims: documento vivo alterado na branch sem claim no ledger reprova no bd post e na CI; claim depois da edição fica declarado como atrasado. Origem: o Pai perguntou 'cadê seu bus? cadê a governança?' e uma sessão inteira tinha editado plano, SPEC e STATUS sem claim. Regra nova no AGENTS §3: 'nova sessão' do Pai fecha a anterior e abre outra com o escopo real.

### #0055 · 2026-10-17T185851-0300 · claude-code-vs-code-822419 · feat

M0.8d: andamento ao vivo na console (fase, tempo, raciocínio, texto em cadência), raciocínio no log, fila por conversa com Direcionar agora e Cancelar, Parar, conversa e rota lembradas, LaTeX legível; ensaiada com ChatGPT, Ollama e OpenRouter reais; oito defeitos do ensaio corrigidos com teste antes.

### #0056 · 2026-10-17T193917-0300 · claude-code-vs-code-9497ba · marco

M0 concluído: o Pai validou pela console ('testei todo o resto'); retrospectiva e métricas registradas; proposta de ordem dos marcos (A, B, C; recomendação C) aguarda o Pai. Tema da console (Sistema, Claro, Escuro) a pedido dele. bd claims passa a cobrir ROADMAP e PLANO-MACRO.

### #0057 · 2026-10-17T203332-0300 · claude-code-vs-code-569aca · spec

SPEC 0002 (M1, rascunho): orquestrador pelo registro oficial do ACP (detecção sem configuração, ícones, sonda, primeira execução aprovada, permissões pelo núcleo, autenticação do agente, delegação), multimodal de entrada, console nova em verde-oliva e vidro (protótipo), contrato tipado (zod), sessão de TUI no fim; dependências propostas: @agentclientprotocol/sdk 1.9.0 e zod 4.6.7.

### #0058 · 2026-10-18T013638-0300 · claude-code-vs-code-59f133 · feat

Telemetria do OpenCode Go (GET /v1/usage, medido ao vivo): limite semanal, mensal e rolante com percentual e reinício; a recusa (402 enganoso ou 429) esgota o Go inteiro até o reinício real, com motivo legível; console mostra as janelas reais; leitura em cache de 1 min. Decisões do Pai de 18/10 aplicadas (SPEC 0002 aprovada, SDK do ACP e zod instalados, cor B oliva, Dependabot).

### #0059 · 2026-10-18T120840-0300 · claude-code-vs-code-59f133 · alterado

Protótipo v4 da console do M1 aprovado pelo Pai: cantos retos, vidro no estilo liquid glass, seletores compactos, a tipografia do rabelus.com e a logomarca do Rabelus Lab (emblema da fênix) ao lado do nome

### #0060 · 2026-10-18T123544-0300 · claude-code-vs-code-d6ff5c · feat

Contrato tipado da console (SPEC 0002, critério 10): cada método tem esquema estrito; entrada inválida volta 400 com mensagem em português, sem chegar ao núcleo; varredura garante que nenhum método fica sem esquema. Ensaiado no navegador (tarefa, fila, direcionar, aprovar, chave, parar e retomar)

### #0061 · 2026-10-18T125731-0300 · claude-code-vs-code-d6ff5c · ferramenta

Plano de minutos da CI: bd ci-plan decide a matriz por evento (PR com código: Linux 24/26 e Windows 26; merge na main: macOS; só documentação: sem matriz; semanal: matriz completa); cancelamento de execuções antigas do PR, cache do npm e tempos máximos; bd merge aceita job pulado de propósito. Estimativa de −70% de minutos por PR de código

### #0062 · 2026-10-18T140220-0300 · claude-code-vs-code-33be25 · correcao

Resposta vazia do provedor (0 tokens, nada) vira falha da rota: troca de provedor ou parada com motivo legível na console, nunca 'concluída' muda (achado no ensaio do M1.0; teste antes; ensaio registrado)

### #0063 · 2026-10-18T142307-0300 · claude-code-vs-code-33be25 · feat

M1.1: catálogo pelo registro oficial do ACP (cópia local, ícones servidos pela console como imagem isolada) e detecção pelo PATH com tabela de sinais nossa; Hermes por ACP (hermes acp) fora do registro. Teste antes; checagem real: 42 agentes, os 6 harnesses do Pai achados sozinhos

### #0064 · 2026-10-18T143508-0300 · claude-code-vs-code-33be25 · feat

M1.1: catálogo de modelos provedor → lab → modelo (ChatGPT /models, Ollama /api/tags + /api/show, OpenRouter /api/v1/models, OpenCode Go /v1/models + models.dev), fonte por capacidade, provedor vence o models.dev, esforços por modelo; models.list no núcleo e na console, guardado por um dia. Checagem real: 538 modelos, 0 erros

### #0065 · 2026-10-18T151739-0300 · claude-code-vs-code-a6ad15 · ferramenta

Regras do Pai de 2026-10-18 com mecanismo: bd serve (servidores com dono e fim; session end recusa com servidor vivo), bd contexto (contexto essencial na compactação; ganchos SessionStart e PostCompact), bd orfaos (no bd post e na CI). Achados no caminho: dois servidores esquecidos encerrados; STATUS com 'Agora' antigo arquivado; bd acha o repositório pelo próprio script

### #0066 · 2026-10-18T194400-0300 · claude-code-vs-code-a6ad15 · ferramenta

Autoverificação: bd verifica (commit de código sem registro reprova no bd post e na CI; sem commit e sem push barram; 30 min sem registro avisa) e gancho Stop do Claude Code ao fim de cada resposta. Auditoria de 2026-10-18: 53 commits de código sem registro em 14 sessões, registrados como atrasados com o hash

### #0067 · 2026-10-18T195549-0300 · claude-code-vs-code-a6ad15 · feat

M1.2a sonda ACP (critério 3): launchFor (executável local preferido; npx/uvx com aprovação), probeHarness (initialize + session/new, pronto/login/falhou, tempo-limite 30 s, sem janela nem sobra), harness.probe no núcleo e na console. Checagem real: OpenCode, Copilot e Hermes prontos; Codex aguarda aprovação do adaptador codex-acp

### #0068 · 2026-10-18T201435-0300 · claude-code-vs-code-30aa5d · feat

M1.2b primeira execução aprovada (critério 4): harness.probe pede aprovação por pacote@versão no painel Aprovações antes de qualquer npx/uvx; negada nada roda; versão nova pergunta; ensaio na console registrado; validação do Pai: aprovar o Codex

### #0069 · 2026-10-18T212108-0300 · claude-code-vs-code-30aa5d · feat

M1.2b no mundo real: o Pai aprovou o Codex na console e o codex-acp 2.2.2 ficou pronto (10,1 s); achado do Pai (aprovar sem retorno) corrigido: approval.resolve roda a sonda e a console mostra o resultado; varredura de processos sem janela; gancho pre-commit

### #0070 · 2026-10-18T220247-0300 · claude-code-vs-code-4efb65 · feat

M1.2c: conversa por ACP (harness/session.ts, agent.run com harness, andamento ao vivo, parar por session/cancel, permissão negada e registrada, recusa sem aprovação); checagem real com OpenCode e Codex registrada (os dois escrevem sem pedir permissão: achado para a M1.2d); parágrafos entre texto e ferramenta; fakeHttp não segura processo de teste; bd status-main

### #0071 · 2026-10-19T013044-0300 · claude-code-vs-code-571284 · feat

M1.2d: permissões do harness pelo núcleo (postura read-only/permission ask ao abrir a sessão; pedido → política → aprovação com nome, ação e alvo; negar para por permissionDenied; comando inteiro na aprovação; escrita sem pedido avisada; relógio parado enquanto o Pai decide); checagem real com OpenCode e Codex; ficha corrigida (saída cortada não prova ausência)

### #0072 · 2026-10-19T103247-0300 · claude-code-vs-code-51d166 · feat

M1.2e no núcleo: needsLogin com os métodos (sem os de terminal), harness.login com authenticate (o harness guarda a credencial), método de terminal recusado; withAcp reúne sonda e login; checagem real sem efeito para o Pai; núcleo do Pai reiniciado com o código novo; ordem nova do M1 a pedido do Pai (M1.5 antes do login do Pai)

### #0073 · 2026-10-19T105752-0300 · claude-code-vs-code-51d166 · feat

M1.5a: console nova (casca do protótipo v4 com tudo do M0, tokens oliva OKLCH, contraste AA medido por teste, marca servida pela console, conversas por dia e harnesses na lateral, Ajustes em painel, aprovações sobre a caixa); ensaio no navegador real com 7 capturas e 7 correções; núcleo do Pai reiniciado; ordem do M1 nova

### #0074 · 2026-10-19T111833-0300 · claude-code-vs-code-51d166 · feat

M1.5b: harness na caixa da console nova (pílula com sonda, conversa com harness, eventos à vista e nos detalhes, Entrar, ícone de quem pede na aprovação); ensaiada com o OpenCode real; 3 correções do ensaio com teste antes

### #0075 · 2026-10-19T115322-0300 · claude-code-vs-code-51d166 · feat

M1.5c: seletor de modelo do catálogo real e os oito níveis de esforço no núcleo; ChatGPT medido ao vivo (até max; ultra recusado); recusa invalid_value/unsupported_value; catálogo versionado; limite do OpenRouter por modelo; 4 correções do ensaio com teste antes

### #0076 · 2026-10-19T121221-0300 · claude-code-vs-code-51d166 · ensaio

M1.5d: ensaio da console nova no ambiente do Pai (ChatGPT em Muito alto, OpenCode com escrita aprovada), roteiro da validação registrado (validar-console-nova-m1-5, aguarda o Pai); token da console apareceu na saída da ferramenta de navegador, decisão de troca com o Pai

### #0077 · 2026-10-20T010007-0300 · claude-code-vs-code-d51ce9 · feat

M1.3: anexos no núcleo (hash na pasta de trabalho, referência no log, formato de cada rota, visão por rota, bloco image por ACP) e na console (anexar, arrastar, colar, recusa sem visão); checagem real com ChatGPT, Nemotron VL, OpenCode e Codex; resposta cortada pelo limite conta como vazia; plano com a M1.2 concluída

### #0078 · 2026-10-20T014455-0300 · claude-code-vs-code-d51ce9 · aprendizado

Quebra da sessão d51ce9: a conversa do Claude Code no VS Code atravessou cinco dias e várias sessões do bd (transcript de 462 MB, 4 compactações) e morreu por 'Prompt is too long' às 01:11, no meio da publicação do post. Retomada pelo Claude Code Desktop: QA do post no navegador in-app, Blog b276c36 publicado, sessão encerrada pelo rito. Lição no lote #0030; regra do Pai: verificar e expor o Blog e rodar o Buddy no navegador in-app deste harness.

### #0079 · 2026-10-20T014801-0300 · claude-code-desktop-d0610a · doc

Posse no Claude Code Desktop (sessão claude-code-desktop-d0610a): harness registrado no STATUS e no BOOTSTRAP; main do STATUS em 4b822b2.

### #0080 · 2026-10-20T020619-0300 · claude-code-desktop-d0610a · feat

M1.5e: console sem token na URL (critério 16, decisão do Pai): cookie HttpOnly/SameSite=Strict derivado do token, bilhete de uso único no rbuddy ui, POST pelo cookie só da própria origem, URL e saída limpas; ensaio no navegador in-app; SPEC 0002 rev. 2.

### #0081 · 2026-10-20T023505-0300 · claude-code-desktop-d0610a · feat

M1.4: ferramenta delegate do Buddy (critério 8): turno de harness compartilhado no núcleo, efeito harness.delegate, permissões com o ícone de quem pede, parada repassada ao harness, conversa mostra a quem delegou; checagem real com o OpenCode do Pai no navegador in-app (leitura e escrita com duas aprovações); achados corrigidos com teste antes.

### #0082 · 2026-10-20T024916-0300 · claude-code-desktop-d0610a · processo

Sessão claude-code-desktop-d0610a: posse no Claude Code Desktop (#74), console sem token na URL (M1.5e, #75), delegação do Buddy (M1.4, #76) com checagem real no navegador in-app; núcleo do Pai na M1.4. Post: Duas Vozes na Mesma Conversa.

### #0083 · 2026-10-20T102255-0300 · claude-code-desktop-6e2164 · feat

Piloto de paralelismo, ondas 1 e 2: 4 pesquisas (3 fichas) e 4 correções do uso real do Pai por subagentes Haiku em worktrees, integradas e ensaiadas no navegador in-app (rever negação, fora da pasta pergunta, quem negou, quem fala, regra explicativa no bd); token da console trocado; decisões do Pai na MEMORY e no AGENTS; bd surfaces ignora os worktrees.

### #0084 · 2026-10-20T213024-0300 · claude-code-desktop-6e2164 · feat

Noite de 2026-10-20: repositório público com a segurança ligada; voz do Buddy em pt e en; tabelas; console compacta com trava; aviso de silêncio; motivos legíveis; pílula atualizada; página pública e workflow do Pages; SPEC 0002 rev. 3 (permissões com Automático, opções dos agentes); diagnóstico do OpenCode. Onda 3 do piloto (5 missões Haiku).

### #0085 · 2026-10-20T213809-0300 · claude-code-desktop-6e2164 · processo

Sessão claude-code-desktop-6e2164: decisões do Pai (explicar em texto, permissões com modos e escopos, paralelismo, repositório público, token trocado); piloto em três ondas (13 missões Haiku); PRs #78 e #79; repositório público com a segurança ligada; página pública no Pages; voz do Buddy; SPEC 0002 rev. 3. Post: O Que o Ensaio Não Negava.

### #0086 · 2026-10-20T222205-0300 · claude-code-desktop-e8da5a · feat

Cobrança do Pai (20/10, 22h): causa da trava do OpenCode (modelo gratuito) achada e resolvida pelos seletores do agente; opções do agente na caixa; permissões com cinco modos e quatro escopos; main protegida no GitHub; prune com worktrees, negrito com código e o Por do STATUS (missões C1–C3); validação da console desbloqueada.

### #0087 · 2026-10-20T223001-0300 · claude-code-desktop-e8da5a · processo

Sessão claude-code-desktop-e8da5a: cobrança do Pai atendida (causa da trava do OpenCode, opções do agente, permissões com modos e escopos, main protegida, missões C1–C3); PR #81. Post: O Sintoma e a Causa.

### #0088 · 2026-10-21T133708-0300 · claude-code-desktop-2ea315 · feat

Pai validou a console nova (M1.5) nos três casos; comando ganhou os quatro escopos, só para o comando idêntico (SPEC 0002 rev. 4); modelo gratuito marcado no seletor do agente, com aviso; camada de inglês nos motivos dos modos e nos cartões; M1.6 adiado pelo Pai; rascunho da SPEC 0003 (M2) com a pesquisa ao vivo

### #0089 · 2026-10-21T133709-0300 · claude-code-desktop-2ea315 · correcao

Três registros saíram antes de commits barrados pela autoverificação, citando o hash anterior; corrigidos por registros que citam o hash certo. Lição: o registro do commit vai encadeado depois do commit (&&), nunca antes

### #0090 · 2026-10-25T085954-0300 · claude-code-desktop-694e2a · feat

M2 começou: Pai aprovou a SPEC 0003, as duas bibliotecas e o preparo de administrador; bateria de 12 fugas e 10 legítimos (scripts/spike-m2) medida no Windows do Pai e na CI; MXC sem administrador no Windows, 10/12, e 12/12 e 11/12 no macOS e no Linux; sandbox-runtime 11/12 e 10/12, com o Windows dependendo de preparo do Pai; ADR 0019 proposta: MXC
