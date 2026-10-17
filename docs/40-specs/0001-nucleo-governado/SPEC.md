# SPEC — M0: Núcleo governado

**ID:** 0001-nucleo-governado · **Tamanho:** fase · **Revisão:** 6 · **Estado:** aprovada
**Autor:** buddy-dev (Buddy Fenix), sessões `claude-code-vs-code-438d04`, `-5cfc7b`, `-3a6e29` · **Criada em:** 2026-10-15T04:29:18-03:00 · **Aprovada por:** Pai, 2026-10-15 ("Aprovada, DEVE Mergear"), com a decisão 8 = A
**Revisão 6 (2026-10-17), pedido do Pai depois do primeiro uso real da console:** "precisamos de feedback visual, tanto para esperar quanto para a apresentação com cadência de digitação; visibilidade, rastreabilidade e registro do raciocínio e dos comandos, com opção de colapsar". Entram no escopo 19 o **andamento ao vivo** (raciocínio e texto em fluxo, espera com tempo e fase), o **raciocínio registrado** no log, **uma execução por vez em cada conversa**, com fila, "direcionar agora" (pedido do Pai na mesma tarde: "primariamente queued, com opção para steer") e "Parar", e a **conversa lembrada** ao recarregar (critérios 31–34). Medido antes: 248 s sem nada na tela com esforço Alto, e duas execuções simultâneas na mesma conversa.
**Revisão 5 (2026-10-17), decisão do Pai ([ADR 0017](../../60-decisoes/0017-console-web-local-no-m0.md)):** o produto é um agente com UX/UI, e a CLI é do próprio agente; entra no escopo a **console web local** servida pelo núcleo (escopo 19), a demonstração passa a ser por ela (critério 26), e os critérios 27–30 cobrem a console, o esforço de raciocínio e a conversa contínua.
**Revisões anteriores:** revisão 1 (rascunho), commit `6083ac2`; revisão 2 (rascunho), commit `1213bd2`. A revisão 3 é a 2 aprovada pelo Pai, com a ordem de provedores da [ADR 0015](../../60-decisoes/0015-ordem-de-provedores.md) e a decisão 8 resolvida (A). A revisão 4 (2026-10-16) só ajusta o "Fora": a biblioteca da TUI passa a estar em avaliação, `ink` × `pi-tui` ([ADR 0016](../../60-decisoes/0016-pi-por-composicao-e-tui-em-avaliacao.md)), e o Pi entra no M1 como agente plugável. O escopo do M0 não muda. A revisão 2 aplica as respostas do Pai de 2026-10-15: assinaturas como provedor ([ADR 0014](../../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md)), teto de US$ 20, convenção de código aceita, SDKs definidos, protocolo de dependências e testes sem flexibilidade.

## Problema e resultado

O Pai quer operar agentes de IA sob aprovação humana, orçamento fechado e registro completo, sem depender de um harness de terceiros para a governança (ADR 0010). Hoje essa governança existe só no desenvolvimento (`bd`, ledger, gates); o produto ainda não existe.

O M0 entrega o **núcleo governado mínimo**:
- um processo local dono do estado;
- uma CLI (`rabelus-buddy` / `rbuddy`);
- um loop de agente que trabalha **dentro das assinaturas do Pai**, na ordem da [ADR 0015](../../60-decisoes/0015-ordem-de-provedores.md): OpenCode Go, Ollama Cloud, ChatGPT Plus (Sign in with ChatGPT) e, por último, a API paga pelo OpenRouter.

Toda ação passa pelo motor de política, todo consumo passa pelo orçamento atômico (dólares e janelas), e todo fato vira evento num log que sobrevive a `kill -9`.

**Saberemos que deu certo quando** (ROADMAP, linha M0):
- uma tarefa real roda do início ao fim pela CLI, na assinatura do Go, com cada aprovação e cada consumo no log;
- um `kill -9` no meio é seguido de retomada correta;
- os requisitos 1, 6 e 7 da R5 passam na CI em Windows, Linux e macOS.

## Escopo

**Dentro:**

1. **Modelo de domínio** compartilhado por todas as interfaces: sessão → execução → passo → evento; aprovação; reserva de orçamento; efeito externo (intenção, tentativa, recibo).
2. **Processo dono** (`rbuddy daemon`): único escritor do banco; sobe sob demanda quando a CLI precisa e não há dono vivo; trava de instância única.
3. **IPC local:** JSON-RPC 2.0 por linhas sobre `node:net`. É named pipe no Windows e socket Unix no Linux e no macOS, só para o usuário dono ([ficha](../../20-conhecimento/banco-e-ipc.md)).
4. **Log de eventos em SQLite** (`node:sqlite` em WAL, atrás de um adaptador que aceita `DatabaseSync` no Node 24 e `Database` no 26+), com projeções reconstruíveis a partir do log.
5. **Motor de política** (ADR 0009, R3):
   - avaliação deny → ask → allow, com a negação vencendo sempre;
   - escopos de concessão: uma vez, sessão, projeto (persistido e auditado);
   - caminhos protegidos fixos: `.git/`, `.buddy-dev/`, `archive/`, `.env*`, `*.pem`, `*.key`;
   - sem interação, `ask` vira `deny`;
   - 3 chamadas idênticas seguidas pausam a sessão;
   - **modelos que treinam com os dados** negados por padrão (Gemini 4 Argon Contributor e Muse Spark no Go).
6. **Ferramentas do agente no M0** (sem sandbox, ADR 0009):
   - `read_file` e `list_dir`: `allow` dentro do workspace;
   - `write_file`: `ask`, com compare-and-set pelo hash da última leitura (R5-3, R5-8);
   - `run_command`: sempre `ask` até o M2;
   - "apagar" não existe; o equivalente é arquivar, e arquivar é `ask`.
7. **Provedores** (ADRs 0014 e 0015), atrás de uma interface única, com um adaptador por rota, nesta ordem:
   - **OpenCode Go** (prioridade): base `https://opencode.ai/inference/go/v1`, chave da assinatura; adaptadores por rota (`openai` para `/responses` e `/chat/completions`; `@anthropic-ai/sdk` para `/messages`; `@google/genai` para a rota Google); `User-Agent: rabelus-buddy/<versão>` e `x-opencode-session` estável por sessão, como os termos exigem.
   - **Ollama Cloud**: `https://ollama.com/api`, `Authorization: Bearer`; a rota (API nativa ou compatível com OpenAI/Anthropic) é fixada na ficha antes do código.
   - **ChatGPT Plus por Sign in with ChatGPT** (fluxo de código aberto):
     - `rbuddy login chatgpt` abre o navegador;
     - OAuth com PKCE S256 e callback em `http://127.0.0.1:<porta>/…`;
     - registro com `dynamic_agent_client` e `ext_agent_host_id` opaco e persistido;
     - escopos `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`;
     - refresh token rotativo;
     - Responses API com `store: false` e `stream: true`, sem os campos que a prévia proíbe; sucesso só em `response.completed`.
   - **API paga = OpenRouter** (`https://openrouter.ai/api/v1`, SDK `openai`): reserva, desligada por padrão, com teto de **US$ 20/mês**.
8. **Credenciais:** chave do Go, tokens OAuth e chaves de API ficam num arquivo do diretório de configuração do usuário, com permissão só para ele (ou por variável de ambiente). Nunca no repositório, no log, na auditoria ou na saída.
9. **Orçamento atômico** (R5-6, ADR 0008, ADR 0014):
   - reserva antes de cada chamada, por **estimativa** (entrada contada + saída estimada pelo histórico do modelo);
   - liquidação depois, pelo `usage` real;
   - recursos de orçamento:
     - janelas do Go por modelo (mês = 100%, semana = 50%, 5 h = 20% do limite em dólares);
     - teto semanal do SIWC;
     - teto de US$ 20/mês da API paga;
   - um erro de limite do provedor (`subscription_sharing_usage_limit_exceeded`, HTTP 429 do Go) **esgota a janela** no log e troca para o próximo provedor da ordem, se a política permitir.
10. **Efeitos externos com identidade** (R5-5): toda chamada ao provedor e todo comando é uma intenção com id. Timeout, stream interrompido ou queda deixam o efeito em estado **desconhecido**, que exige reconciliação antes de nova tentativa.
11. **Loop de agente** com **compactação de contexto** (R1): nenhuma chamada sai com mais de 100k tokens de entrada.
12. **Retomada** (R5-7): ao reiniciar, o dono reprojeta o estado do log. Execuções interrompidas aparecem como interrompidas, aprovações pendentes continuam pendentes, e efeitos sem recibo ficam "desconhecidos".
13. **Privacidade no provedor:** `store: false` em toda chamada à Responses API (o padrão guarda a resposta por 30 dias). O usuário vê a retenção de cada modelo do Go (0 ou 30 dias).
14. **Auditoria append-only sem conteúdo sensível.**
15. **i18n desde a primeira string** (ADR 0002): catálogo i18next em `locales/pt-BR/` e `locales/en/`.
16. **CLI:**
    - comandos `run "<tarefa>"`, `status`, `approvals`, `approve`/`deny`, `budget`, `log`, `resume`, `login chatgpt|opencode-go`, `logout`, `providers`, `daemon start|stop|status`;
    - binários `rabelus-buddy` e `rbuddy` (ADR 0011);
    - argumentos com `parseArgs`;
    - aprovações com `readline`;
    - a CLI é interface do próprio agente e das ferramentas, **nunca superfície de teste do Pai** (regra de 2026-10-17).
17. **Dependências sob protocolo:** toda dependência, de produção ou de desenvolvimento, segue o [protocolo de dependências](../../30-governanca/DEPENDENCIAS.md):
    - registro com versão exata, licença e ficha;
    - reverificação com prazo;
    - checagem `bd deps` no `bd post` e na CI.
18. **Testes sem flexibilidade:**
    - teste reprovado se resolve corrigindo o código;
    - nenhum PR pode remover asserções, apagar teste, marcar `skip`/`todo`/`only` ou reduzir o número de testes de um arquivo;
    - conferido pelo `bd test-guard` no `bd post` e na CI.
19. **Console web local** ([ADR 0017](../../60-decisoes/0017-console-web-local-no-m0.md)), servida pelo dono em `127.0.0.1`, sem dependência nova:
    - tarefa com **esforço de raciocínio** (padrão, baixo, médio, alto) e **rota** (automática pela ordem da ADR 0015, ou um provedor e modelo escolhidos);
    - passos ao vivo, resposta e **conversa contínua** (nova mensagem na mesma sessão, com o histórico);
    - aprovações (aprovar ou negar), consumo por janela, provedores com a origem da credencial;
    - chaves de API guardadas pela console (nunca voltam ao navegador); login e logout do ChatGPT;
    - retomada de execução interrompida ou parada;
    - **andamento ao vivo** (rev. 6): enquanto o modelo trabalha, a conversa mostra a fase (pensando, escrevendo, usando ferramenta, aguardando aprovação), o tempo decorrido, o raciocínio que o provedor expõe e o texto chegando em cadência; raciocínio, comandos e resultados ficam em blocos recolhíveis, e a escolha de mostrar ou recolher é do usuário e fica lembrada;
    - **uma execução por vez em cada conversa, com fila e direcionamento** (rev. 6; Pai: "primariamente queued, com opção para steer"): mensagem enviada enquanto a conversa trabalha **entra na fila** e roda em seguida, continuando a conversa; cada mensagem da fila pode **direcionar agora** (entra na execução em curso antes da próxima chamada ao modelo) ou ser cancelada; a console também oferece "Parar", que interrompe a chamada em curso e encerra a execução com motivo;
    - a conversa aberta continua aberta ao recarregar a página (rev. 6);
    - tema escolhido na console: Sistema (segue o navegador), Claro ou Escuro, lembrado (pedido do Pai, 2026-10-17);
    - toda string do catálogo (pt-BR e en);
    - token e `Host` exato em toda requisição; aberta por atalho de duplo clique, sem terminal.

**Fora** (com o marco que entrega):

- Agentes externos por ACP, o `@opencode-ai/sdk` (cliente do servidor do OpenCode) e o Pi como agente plugável com extensão de governança (ADR 0016): **M1**.
- Sandbox, worktree por sessão, aprovação na integração, comandos livres no workspace, rede por lista de domínios: **M2**.
- Memória de longo prazo e identidade versionada do agente do usuário: **M3**.
- Gateway, canais e entrada por mensagem (R5-2): **M4**.
- Web UI, desktop e mobile **de produto** (ADR 0013), MCP e subagentes (C2): depois do M0, com o roadmap em revisão (a console do escopo 19 é paliativa). TUI: depois do M0, com biblioteca escolhida entre `ink` e `pi-tui` (ADR 0016).
- Instaladores e publicação no npm: **M5+**. No M0 a CLI roda do repositório.

## Decisões técnicas (cada uma com fonte)

| # | Tema | Decisão | Por quê | Fonte |
|---|---|---|---|---|
| 1 | Banco | `node:sqlite` (RC) atrás de adaptador; `better-sqlite3` como plano B documentado | zero dependência nativa; spike atendeu R5-1 e R5-7 em Windows, Linux e macOS, Node 24 e 26 | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md), [spike](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md) |
| 2 | IPC | JSON-RPC 2.0 por linhas sobre `node:net` | mesma API nos três SOs; mesmo modelo de mensagem do ACP (M1) | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md) |
| 3 | Provedores | **Decidido pelo Pai** ([ADR 0014](../../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md), ordem da [ADR 0015](../../60-decisoes/0015-ordem-de-provedores.md)): Go → Ollama Cloud → ChatGPT (SIWC) → OpenRouter (pago) | trabalho dentro dos US$ 30 das assinaturas | [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md) |
| 4 | CLI e TUI | `parseArgs` + despacho próprio; `readline`; sem TUI no M0 | menos dependências; TUI depois, com `ink` ou `pi-tui` em avaliação (ADR 0016) | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 5 | i18n | i18next 26.x; JSON por domínio | o mesmo catálogo serve à CLI, à Web e ao app (ADR 0013) | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 6 | Orçamento | reserva por estimativa e liquidação pelo `usage`; janelas por assinatura como recurso; erro de limite do provedor é fonte de verdade | o SIWC proíbe `max_output_tokens` e nenhuma assinatura informa preço por chamada | [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md), [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 7 | Fora do M0 | ver "Fora"; comandos sempre em `ask` | ADR 0009 (até o M2), ADR 0010 | ROADMAP |
| 8 | Linguagem e execução | **Decidido pelo Pai: A** ([anexo](./EXPLICACAO-BUILD-E-TESTES.md)): TypeScript só com sintaxe apagável, executado direto pelo Node; `tsc --noEmit` como gate obrigatório da CI; workspaces `core`, `client`, `cli` | sem build no caminho de execução e de teste; tipos checados por um gate separado | [node-runtime](../../20-conhecimento/node-runtime.md), [anexo](./EXPLICACAO-BUILD-E-TESTES.md) |
| 9 | SDKs | **Decidido pelo Pai:** `openai`, `@anthropic-ai/sdk`, `@google/genai` no M0; `@opencode-ai/sdk` no M1 | cobrem as rotas do Go, do Ollama Cloud (compatível) e do OpenRouter | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 10 | Atualização de dependências | **Decidido pelo Pai:** protocolo com mecanismo (`bd deps`), valendo para toda dependência nova | regra sem mecanismo é desejo | [DEPENDENCIAS.md](../../30-governanca/DEPENDENCIAS.md) |

**Dependências do M0** (versões exatas no registro do protocolo):
- **em tempo de execução:** `openai`, `@anthropic-ai/sdk`, `@google/genai`, `i18next`;
- **só no desenvolvimento:** `typescript` e `@types/node` (decisão 8 = A).

## Critérios de aceitação (observáveis; cada um vira teste, e nenhum teste se afrouxa)

**Concorrência e log**

1. Dadas duas CLIs abertas, quando cada uma emite 1.000 comandos ao mesmo tempo, então nenhum `SQLITE_BUSY` chega ao usuário e a sequência de eventos de cada sessão é contígua (R5-1). Roda em Windows, Linux e macOS.
2. Dado um dono vivo, quando um segundo `rbuddy daemon start` é chamado, então ele recusa com mensagem do catálogo e o primeiro continua servindo.
3. Dado que o banco de projeções foi apagado, quando o dono reconstrói a partir do log, então as projeções são iguais às de antes (comparação por hash).

**Retomada**

4. Dada uma execução com uma chamada em andamento, quando o dono recebe `kill -9` e é reiniciado, então a execução aparece como **interrompida**, o efeito em curso como **desconhecido** (nunca "concluído" sem recibo) e o `integrity_check` retorna `ok` (R5-7).
5. Dada uma aprovação pendente, quando o dono cai e volta, então `rbuddy approvals` ainda a lista e `rbuddy approve` a resolve.
6. Dado um efeito em estado desconhecido, quando o agente tenta repeti-lo, então a nova tentativa é bloqueada até a reconciliação (R5-5).

**Política**

7. Para cada caminho protegido, `read_file`, `write_file` ou arquivar dentro dele é **negado**, mesmo com concessão de projeto ativa.
8. Dada uma regra `deny` e uma `allow` que casam com a mesma ação, então a ação é negada.
9. Dada uma ação `ask` sem terminal interativo, então ela é negada, e o evento registra o motivo.
10. Uma concessão "sessão" não vale em outra sessão; uma concessão "projeto" persiste após reinício e aparece no log de auditoria.
11. Quando o agente faz 3 chamadas idênticas seguidas, então a sessão é pausada e pede intervenção.
12. Dado um arquivo lido pelo agente e depois alterado por um humano, quando o agente tenta escrevê-lo, então a escrita é recusada com conflito e pede nova leitura (R5-3, R5-8).
13. `run_command` nunca executa sem aprovação explícita no M0.

**Orçamento**

14. Dada uma janela com saldo para uma única chamada, quando N sessões tentam chamar o modelo ao mesmo tempo, então só uma chamada sai; as outras são bloqueadas antes de qualquer consumo (R5-6).
15. Ao fim de cada chamada, a reserva é liquidada pelo `usage` real; o consumo acumulado de cada janela bate com a soma dos eventos de liquidação.
16. Janela esgotada (por conta própria ou por erro de limite do provedor): a tarefa troca para o próximo provedor da ordem, se a política permitir, ou para com a mensagem do catálogo. A API paga nunca passa de US$ 20 no mês.

**Provedores**

17. Cada provedor da ordem (Go, Ollama Cloud, OpenRouter) é chamado pela rota e pelo SDK certos, com a identificação exigida. Toda requisição ao Go leva `User-Agent: rabelus-buddy/<versão>` e `x-opencode-session` igual ao longo da mesma sessão (espião no transporte), e cada modelo vai pela rota e pelo SDK certos.
18. Toda requisição pelo SIWC leva `store: false` e `stream: true`, não leva nenhum campo proibido pela prévia, e só é concluída em `response.completed`. O conteúdo da resposta (texto e chamadas de ferramenta) vem dos itens de `response.output_item.done` quando o `output` de `response.completed` chega vazio, como o backend real do ChatGPT faz (medido em 2026-10-17). `response.failed` com `subscription_sharing_usage_limit_exceeded` esgota a janela do SIWC.
19. O fluxo `rbuddy login chatgpt` usa PKCE S256, callback em `127.0.0.1`, `state` e `nonce` novos por tentativa, e o mesmo `ext_agent_host_id` entre logins. Um refresh substitui juntos access token, expiração e refresh token. Testado contra um servidor OAuth falso local.
20. Modelos que treinam com os dados são negados por padrão; usá-los exige concessão explícita de projeto, registrada.

**Agente, contexto, segredos e catálogo**

21. Nenhuma chamada sai com mais de 100k tokens de entrada estimados: acima do limiar, o histórico é compactado, e a compactação vira evento.
22. Em toda a suíte, chaves, tokens OAuth e qualquer valor lido de `.env*` não aparecem no banco, no log, na auditoria, na saída nem nos temporários (busca pelo valor), e o arquivo de credenciais fica com permissão só do dono.
23. Toda string mostrada pela CLI vem do catálogo: as chaves existem em `pt-BR` e `en`, e a troca de idioma (`--lang` ou `RBUDDY_LANG`) muda a saída.

**Processo**

24. `bd deps` passa: toda dependência instalada está no registro com versão exata, licença permitida e verificação dentro do prazo.
25. `bd test-guard` passa: nenhum teste removido, enfraquecido ou pulado em relação à base.
26. **Demonstração do marco** (real, com o Pai, **pela console**; revisão 5):
    - o Pai entra com o ChatGPT pela console (o login real fecha o critério 19);
    - escreve uma tarefa real de leitura e edição, aprova e nega ações, e muda o esforço entre tarefas;
    - cada aprovação e cada consumo aparecem na console;
    - uma queda do núcleo no meio e "Retomar" levam a tarefa ao fim sem efeito duplicado;
    - um passo roda pelo ChatGPT (fecha o critério 18 no real), e a troca de provedor aparece quando uma janela ou conta recusa.

### Console, esforço e conversa (revisão 5)

27. A console só escuta em `127.0.0.1`; requisição sem o token devolve 401 e com `Host` diferente devolve 403, e nenhuma ação acontece.
28. Toda string da console vem do catálogo (pt-BR e en), e trocar o idioma na console muda os textos.
29. O esforço escolhido chega a cada rota no formato dela: Responses `reasoning.effort`; Chat Completions `reasoning_effort` (OpenRouter: `reasoning.effort`); Messages `thinking` com orçamento; Google `thinkingConfig`. "Padrão" não envia nada. Se o provedor recusar o esforço, a chamada se repete uma vez sem ele, e isso vira evento.
30. Pela console: aprovar ou negar resolve a aprovação como pelo IPC; chave de API guardada aparece só como origem (nunca o valor); conversa contínua leva o histórico da sessão ao modelo; retomar tem o mesmo efeito do `resume`; login do ChatGPT abre a tela da OpenAI e a conclusão aparece na console.

31. Os provedores transmitem o andamento: Chat Completions em `stream: true` (com `stream_options.include_usage`), lendo `delta.reasoning` (ou `reasoning_content`), `delta.content` e as chamadas de ferramenta montadas pelos deltas; o SIWC pede `reasoning.summary: "auto"` junto com o esforço e lê `response.reasoning_summary_text.delta` e `response.output_text.delta`. O núcleo expõe o andamento da execução em curso (fase, início, raciocínio e texto parciais, rota) sem gravar cada fragmento no log; o resultado final é o mesmo de antes (texto, ferramentas, uso).
32. O raciocínio que o provedor expõe vai para o log ao fim de cada passo (`agent.reasoning`, com execução, passo e rota), e a console o mostra na conversa em bloco recolhível, como os comandos e os resultados das ferramentas.
33. Uma conversa tem no máximo uma execução rodando. `agent.run` numa sessão com execução em curso **enfileira** a mensagem (`run.queued`, no log); quando a execução termina (concluída ou parada), a primeira da fila começa continuando a conversa (`run.dequeued`). `agent.steer` leva uma mensagem da fila para a execução em curso: ela entra como mensagem do usuário antes da próxima chamada ao modelo, e, se o modelo já tinha respondido sem ferramentas, a execução segue com mais uma chamada em vez de terminar. `agent.unqueue` cancela uma mensagem da fila. `agent.stop` interrompe a chamada em curso, nega a aprovação pendente da sessão e encerra a execução como parada (`userStopped`); a execução parada pode ser retomada. A fila sobrevive à queda do núcleo (está no log).
34. A console lembra a conversa aberta e a preferência de mostrar ou recolher os detalhes ao recarregar a página.
35. A console tem tema Sistema, Claro ou Escuro; Sistema segue `prefers-color-scheme`, Claro e Escuro valem acima dele; a escolha fica lembrada e o texto do seletor vem do catálogo.

Desenho de cada teste: [TESTES.md](./TESTES.md). Os critérios 1–25 rodam com provedores falsos determinísticos e um servidor OAuth falso. O 26 usa as assinaturas reais e é validado pelo Pai, pela console, depois do ensaio do buddy-dev no ambiente dele (regra de 2026-10-17). Os critérios 27–34 rodam com servidor falso (os formatos de fluxo copiados da medição real de 2026-10-17) e são ensaiados pelo buddy-dev num navegador real antes da entrega.

## Métricas (registradas, sem meta fixa no M0)

Consumo por tarefa (dólares de janela e US$ reais), latência de IPC p50/p95, aprovações por tarefa, tokens de entrada antes e depois da compactação, trocas de provedor por esgotamento de janela.

## Fontes de verdade

- [ROADMAP](../../50-planos/ROADMAP.md) e [PLANO-MACRO](../../50-planos/PLANO-MACRO.md) (M0).
- R1 ([custos](../../10-pesquisa/rev-0.2/r1-custos.md)), R3 ([aprovações](../../10-pesquisa/rev-0.2/r3-aprovacoes.md)), R5 ([concorrência](../../10-pesquisa/rev-0.2/r5-concorrencia.md)).
- ADRs [0002](../../60-decisoes/0002-idiomas-pt-br-e-en.md), [0008](../../60-decisoes/0008-orcamento-por-assinaturas.md), [0009](../../60-decisoes/0009-aprovacoes-com-escopo.md), [0010](../../60-decisoes/0010-nucleo-governado-e-composicao.md), [0011](../../60-decisoes/0011-binarios-da-cli.md), [0013](../../60-decisoes/0013-stack-mobile-e-web.md), [0014](../../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md).
- Fichas: [assinaturas-de-agentes](../../20-conhecimento/assinaturas-de-agentes.md), [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md), [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md), [precos-llm](../../20-conhecimento/precos-llm.md), [node-runtime](../../20-conhecimento/node-runtime.md).
- Governança: [DEPENDENCIAS.md](../../30-governanca/DEPENDENCIAS.md), [CONVENCOES.md](../../30-governanca/CONVENCOES.md) (convenção de código aceita em 2026-10-15).
- Evidência: [spike de banco e IPC](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md).

## Capacidade do produto que esta unidade antecipa (METODO §4)

- O ledger por arquivo vira log de eventos com projeções.
- Sessões e claims viram concorrência com compare-and-set.
- `bd pre`/`post` viram início e fechamento de sessão do agente.
- Aprovações do Pai viram motor de política.
- O relógio verificado vira carimbo de evento.
- As assinaturas do Pai viram janelas de orçamento.

## Riscos e rollback

| Risco | Mitigação |
|---|---|
| `node:sqlite` ainda é Release candidate e já renomeou a classe entre o 24 e o 26 | adaptador fino; testes nas duas linhas na CI; `better-sqlite3` como plano B |
| SIWC em prévia; o Go avisa que outros clientes "podem deixar de funcionar" | adaptadores isolados; erros de limite e de autenticação viram eventos e troca de provedor; ficha reverificada a cada marco |
| O plano de uso do SIWC é para apps "open-source and locally hosted"; o repositório ainda é privado | o buddy é Apache-2.0 e roda local; se a OpenAI recusar o registro, o ChatGPT fica para o ACP do M1 (ADR 0008) e o Go continua como provedor |
| Reserva por estimativa erra (o SIWC não aceita teto de saída) | liquidação pelo `usage`; erro de limite do provedor esgota a janela; métrica de erro de estimativa |
| Vazão em rajada baixa em alguns ambientes (331 eventos/s no runner Windows com Node 24) | a M0.2 mede como métrica e testa `synchronous` e lotes se cair abaixo de 100 eventos/s |
| Permissões de named pipe e do arquivo de credenciais no Windows | teste de acesso por outro usuário marcado como manual no M0, automatizado no M2 |

**Rollback:** o M0 é código novo, em pacotes novos; nada nas ferramentas `bd` depende dele. Reverter é reverter os merges; o log de eventos de teste vive fora do repositório.

## Dúvidas bloqueantes

Nenhuma. Todas respondidas pelo Pai em 2026-10-15:
- provedores e ordem (ADRs 0014 e 0015);
- teto de US$ 20 (OpenRouter);
- convenção de código;
- SDKs e protocolo de dependências;
- decisão 8 = A.

Chaves do OpenCode Go, do OpenRouter e do Ollama Cloud já estão em `.buddy-dev/.env.local` (informado pelo Pai). A conta ChatGPT Plus entra pelo botão de login da console, na demonstração.
