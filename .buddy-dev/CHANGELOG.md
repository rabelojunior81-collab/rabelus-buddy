# CHANGELOG — buddy-dev

> **Append-only.** Uma entrada por ação relevante, adicionada só por `npm run bd -- changelog add --type <tipo> --text "..."` (numeração, carimbo e sessão automáticos). Nunca editar uma entrada existente: corrige-se com outra entrada.
>
> **Teto: 50 entradas.** Acima disso, extraia as lições do lote mais antigo para `LEARNING-CURVE.md` (citando `lote #NNNN-#NNNN`) e rode `npm run bd -- changelog prune`: o lote vai, verbatim e com sha256, para `archive/changelog/`.
>
> **Paralelo:** este arquivo usa `merge=union` (`.gitattributes`); entradas de ramos diferentes se somam no merge. Números podem repetir entre ramos; a identidade de uma entrada é carimbo + sessão.
>
> Tipos: `nascimento`, `ferramenta`, `doc`, `decisao`, `pesquisa`, `correcao`, `aprendizado`, `processo`.

### #0028 · 2026-10-15T043158-0300 · claude-code-vs-code-438d04 · doc

SPEC 0001 (M0 — Núcleo governado) em rascunho: 20 critérios de aceite, decisões técnicas com fonte (node:sqlite + adaptador, JSON-RPC sobre node:net, GPT-6 Luna via openai, parseArgs/readline, i18next), 4 dúvidas bloqueantes ao Pai. Spike de banco e IPC registrado; fichas banco-e-ipc e bibliotecas-do-nucleo.

### #0029 · 2026-10-15T043545-0300 · claude-code-vs-code-5cfc7b · aprendizado

Regra do Pai: pedido novo se absorve em paralelo e a tarefa em curso continua; dúvida bloqueante para só o que depende dela. AGENTS §5.4/§5.7, checklist do PR, linha Seguindo em paralelo no STATUS; LEARNING-CURVE #6.

### #0030 · 2026-10-15T044039-0300 · claude-code-vs-code-5cfc7b · doc

M0 seguiu sem esperar as respostas do Pai: usage da Responses API verificado (store:false vira requisito), decisão 8 (TypeScript sem build), plano de fase M0 (8 sub-fases), desenho dos 21 testes, spike de banco e IPC aprovado em 3 SOs × Node 24/26 no CI.

### #0031 · 2026-10-15T045425-0300 · claude-code-vs-code-3a6e29 · decisao

Respostas do Pai à SPEC 0001 aplicadas: ADR 0014 (OpenCode Go primeiro, ChatGPT por Sign in with ChatGPT, API paga como reserva), teto US$ 20, convenção de código aceita, SDKs OpenAI/Anthropic/Gemini (+OpenCode no M1). SPEC revisão 2 com 26 critérios; explicação de build e testes com prova executada.

### #0028 · 2026-10-15T045853-0300 · claude-code-vs-code-3a6e29 · ferramenta

bd deps (registro com versão exata, licença, ficha, aprovação e prazo de 30 dias; rotina semanal na CI) e bd test-guard (a suíte não perde testes nem asserções; sem skip/todo/only), no bd post e na CI. Ordens do Pai de 2026-10-15. 57 testes.

### #0029 · 2026-10-15T050153-0300 · claude-code-vs-code-3a6e29 · correcao

bd deps --latest não era aceito pelo parser (opção documentada, não declarada; já na main pelo PR #18). Corrigido, com teste que exige que toda opção da ajuda seja aceita (LEARNING-CURVE #7).

### #0032 · 2026-10-15T050534-0300 · claude-code-vs-code-3a6e29 · processo

Sessão claude-code-vs-code-3a6e29: respostas do Pai aplicadas (SPEC rev. 2, ADR 0014), bd deps e bd test-guard (PR #18), --latest corrigido (PR #19), registro de dependências preenchido, explicação de build e testes com prova. Post: A Pista Estava Quase Certa.

### #0033 · 2026-10-15T171930-0300 · claude-code-vs-code-7ebb05 · decisao

SPEC 0001 aprovada pelo Pai (rev. 3, decisão 8 = A) e mergeada; ADR 0015: ordem de provedores OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter (API paga); typescript e @types/node aprovados no registro. Regra: aprovado é mergeado na hora. Ficha pi-agent para a pergunta de forkar o Pi.

### #0034 · 2026-10-15T172109-0300 · claude-code-vs-code-7ebb05 · processo

Sessão claude-code-vs-code-7ebb05: SPEC 0001 aprovada e mergeada (PR #17), branches locais mergeadas removidas, ADR 0015, ficha do Pi com recomendação de compor no M1 (não forkar). Post: Forkar Não É Economizar.

### #0035 · 2026-10-16T002021-0300 · claude-code-vs-code-6265a4 · decisao

ADR 0016: Pi por composição (agente plugável no M1, com extensão de governança), sem fork; TUI em avaliação (ink × pi-tui, com referências visuais ao Pai no momento pertinente); M0 sem TUI. SPEC 0001 rev. 4; pi-tui e ink no registro como proposta.

### #0036 · 2026-10-16T002655-0300 · claude-code-vs-code-6265a4 · ferramenta

bd merge (CI verde e bd post limpo → merge commit → prune), bd prune (mergeadas removidas, abandonadas arquivadas em tag anotada), bd validacoes (registro de 23 validações com dono, lugar e mecanismo; o que aguarda o Pai aparece em toda sessão). GitHub: auto-delete de branches e só merge commit. 88 testes.

### #0037 · 2026-10-16T003647-0300 · claude-code-vs-code-6265a4 · ferramenta

M0.1 fundação: packages/client (i18n) e packages/cli (rabelus-buddy/rbuddy com --help, --version, --lang pelo catálogo), TypeScript executado pelo Node, tsc --noEmit e matriz 3 SOs × Node 24/26 na CI, dependências i18next/typescript/@types/node instaladas pelo protocolo. O portão de tipos pegou 2 erros reais que os testes não pegavam.

### #0038 · 2026-10-16T004022-0300 · claude-code-vs-code-6265a4 · processo

Sessão claude-code-vs-code-6265a4: ADR 0016 (PR #21); bd merge, bd prune, bd validacoes e GitHub com auto-delete e só merge commit (PR #22, 21 branches podadas, spike arquivado em tag); M0.1 fundação do código (PR #23, matriz 3 SOs × Node 24/26 verde). Post: Nenhuma Branch Sobrevive ao Merge.

### #0039 · 2026-10-16T010554-0300 · claude-code-vs-code-fe93fb · ferramenta

M0.2: log de eventos em SQLite com projeções reconstruíveis, dono único com JSON-RPC por named pipe/socket Unix, cliente IPC, rbuddy daemon start|status|stop. Critérios 1–3 da SPEC 0001 com teste (2 CLIs × 1.000 comandos sem SQLITE_BUSY e sem buraco).

### #0040 · 2026-10-16T011421-0300 · claude-code-vs-code-fe93fb · ferramenta

M0.3: execuções, efeitos com identidade e aprovações como eventos; retomada após kill -9 (critérios 4–6); rbuddy approvals/approve/deny. O teste do critério 3 achou um bug (evento de domínio malformado projetava id undefined); corrigido no código, com asserção nova.

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
