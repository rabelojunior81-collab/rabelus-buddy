# SPEC — M0: Núcleo governado

**ID:** 0001-nucleo-governado · **Tamanho:** fase · **Revisão:** 2 · **Estado:** rascunho
**Autor:** buddy-dev (Buddy Fenix), sessões `claude-code-vs-code-438d04`, `-5cfc7b`, `-3a6e29` · **Criada em:** 2026-10-15T04:29:18-03:00 · **Aprovada por:** pendente
**Revisão anterior:** revisão 1 (rascunho, nunca aprovada), commit `6083ac2`. A revisão 2 aplica as respostas do Pai de 2026-10-15: assinaturas como provedor ([ADR 0014](../../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md)), teto de US$ 20, convenção de código aceita, SDKs definidos, protocolo de dependências e testes sem flexibilidade.

## Problema e resultado

O Pai quer operar agentes de IA sob aprovação humana, orçamento fechado e registro completo, sem depender de um harness de terceiros para a governança (ADR 0010). Hoje essa governança existe só no desenvolvimento (`bd`, ledger, gates); o produto ainda não existe.

O M0 entrega o **núcleo governado mínimo**:
- um processo local dono do estado;
- uma CLI (`rabelus-buddy` / `rbuddy`);
- um loop de agente que trabalha **dentro das assinaturas do Pai**: OpenCode Go primeiro, ChatGPT Plus pelo Sign in with ChatGPT, e API paga só como reserva.

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
7. **Provedores** (ADR 0014), atrás de uma interface única, com um adaptador por rota:
   - **OpenCode Go** (prioridade): base `https://opencode.ai/inference/go/v1`, chave da assinatura; adaptadores por rota (`openai` para `/responses` e `/chat/completions`; `@anthropic-ai/sdk` para `/messages`; `@google/genai` para a rota Google); `User-Agent: rabelus-buddy/<versão>` e `x-opencode-session` estável por sessão, como os termos exigem.
   - **ChatGPT Plus por Sign in with ChatGPT** (fluxo de código aberto):
     - `rbuddy login chatgpt` abre o navegador;
     - OAuth com PKCE S256 e callback em `http://127.0.0.1:<porta>/…`;
     - registro com `dynamic_agent_client` e `ext_agent_host_id` opaco e persistido;
     - escopos `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`;
     - refresh token rotativo;
     - Responses API com `store: false` e `stream: true`, sem os campos que a prévia proíbe; sucesso só em `response.completed`.
   - **API paga por token** (OpenAI, Anthropic ou Gemini): reserva, desligada por padrão, com teto de **US$ 20/mês**.
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
    - aprovações com `readline`.
17. **Dependências sob protocolo:** toda dependência, de produção ou de desenvolvimento, segue o [protocolo de dependências](../../30-governanca/DEPENDENCIAS.md):
    - registro com versão exata, licença e ficha;
    - reverificação com prazo;
    - checagem `bd deps` no `bd post` e na CI.
18. **Testes sem flexibilidade:**
    - teste reprovado se resolve corrigindo o código;
    - nenhum PR pode remover asserções, apagar teste, marcar `skip`/`todo`/`only` ou reduzir o número de testes de um arquivo;
    - conferido pelo `bd test-guard` no `bd post` e na CI.

**Fora** (com o marco que entrega):

- Agentes externos por ACP e o `@opencode-ai/sdk` (cliente do servidor do OpenCode): **M1**.
- Sandbox, worktree por sessão, aprovação na integração, comandos livres no workspace, rede por lista de domínios: **M2**.
- Memória de longo prazo e identidade versionada do agente do usuário: **M3**.
- Gateway, canais e entrada por mensagem (R5-2): **M4**.
- Web UI, desktop, mobile (ADR 0013), MCP, subagentes (C2) e TUI com `ink`: **M5+**.
- Instaladores e publicação no npm: **M5+**. No M0 a CLI roda do repositório.

## Decisões técnicas (cada uma com fonte)

| # | Tema | Decisão | Por quê | Fonte |
|---|---|---|---|---|
| 1 | Banco | `node:sqlite` (RC) atrás de adaptador; `better-sqlite3` como plano B documentado | zero dependência nativa; spike atendeu R5-1 e R5-7 em Windows, Linux e macOS, Node 24 e 26 | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md), [spike](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md) |
| 2 | IPC | JSON-RPC 2.0 por linhas sobre `node:net` | mesma API nos três SOs; mesmo modelo de mensagem do ACP (M1) | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md) |
| 3 | Provedores | **Decidido pelo Pai** ([ADR 0014](../../60-decisoes/0014-assinaturas-consumidas-pelo-nucleo.md)): Go → ChatGPT (SIWC) → API paga | trabalho dentro dos US$ 30 das assinaturas | [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md) |
| 4 | CLI e TUI | `parseArgs` + despacho próprio; `readline`; sem TUI no M0 | menos dependências; `ink` quando houver telas interativas | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 5 | i18n | i18next 26.x; JSON por domínio | o mesmo catálogo serve à CLI, à Web e ao app (ADR 0013) | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 6 | Orçamento | reserva por estimativa e liquidação pelo `usage`; janelas por assinatura como recurso; erro de limite do provedor é fonte de verdade | o SIWC proíbe `max_output_tokens` e nenhuma assinatura informa preço por chamada | [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md), [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 7 | Fora do M0 | ver "Fora"; comandos sempre em `ask` | ADR 0009 (até o M2), ADR 0010 | ROADMAP |
| 8 | Linguagem e execução | **Aguarda o Pai depois da explicação** ([anexo](./EXPLICACAO-BUILD-E-TESTES.md)): TypeScript só com sintaxe apagável, executado direto pelo Node; `tsc --noEmit` como gate obrigatório da CI; workspaces `core`, `client`, `cli` | sem build no caminho de execução e de teste; tipos checados por um gate separado | [node-runtime](../../20-conhecimento/node-runtime.md), [anexo](./EXPLICACAO-BUILD-E-TESTES.md) |
| 9 | SDKs | **Decidido pelo Pai:** `openai`, `@anthropic-ai/sdk`, `@google/genai` no M0; `@opencode-ai/sdk` no M1 | cobrem todas as rotas do Go e a API paga | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 10 | Atualização de dependências | **Decidido pelo Pai:** protocolo com mecanismo (`bd deps`), valendo para toda dependência nova | regra sem mecanismo é desejo | [DEPENDENCIAS.md](../../30-governanca/DEPENDENCIAS.md) |

**Dependências do M0** (versões exatas no registro do protocolo):
- **em tempo de execução:** `openai`, `@anthropic-ai/sdk`, `@google/genai`, `i18next`;
- **só no desenvolvimento:** `typescript` e `@types/node`, condicionados à decisão 8.

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

17. Toda requisição ao Go leva `User-Agent: rabelus-buddy/<versão>` e `x-opencode-session` igual ao longo da mesma sessão (espião no transporte), e cada modelo vai pela rota e pelo SDK certos.
18. Toda requisição pelo SIWC leva `store: false` e `stream: true`, não leva nenhum campo proibido pela prévia, e só é concluída em `response.completed`. `response.failed` com `subscription_sharing_usage_limit_exceeded` esgota a janela do SIWC.
19. O fluxo `rbuddy login chatgpt` usa PKCE S256, callback em `127.0.0.1`, `state` e `nonce` novos por tentativa, e o mesmo `ext_agent_host_id` entre logins. Um refresh substitui juntos access token, expiração e refresh token. Testado contra um servidor OAuth falso local.
20. Modelos que treinam com os dados são negados por padrão; usá-los exige concessão explícita de projeto, registrada.

**Agente, contexto, segredos e catálogo**

21. Nenhuma chamada sai com mais de 100k tokens de entrada estimados: acima do limiar, o histórico é compactado, e a compactação vira evento.
22. Em toda a suíte, chaves, tokens OAuth e qualquer valor lido de `.env*` não aparecem no banco, no log, na auditoria, na saída nem nos temporários (busca pelo valor), e o arquivo de credenciais fica com permissão só do dono.
23. Toda string mostrada pela CLI vem do catálogo: as chaves existem em `pt-BR` e `en`, e a troca de idioma (`--lang` ou `RBUDDY_LANG`) muda a saída.

**Processo**

24. `bd deps` passa: toda dependência instalada está no registro com versão exata, licença permitida e verificação dentro do prazo.
25. `bd test-guard` passa: nenhum teste removido, enfraquecido ou pulado em relação à base.
26. **Demonstração do marco** (real, com o Pai):
    - o Pai roda `rbuddy run` numa tarefa real de leitura e edição, na assinatura do Go;
    - cada aprovação e cada consumo aparecem em `rbuddy log`;
    - `kill -9` no meio e `rbuddy resume` levam a tarefa ao fim sem efeito duplicado;
    - o mesmo passo roda uma vez pelo ChatGPT (SIWC).

Desenho de cada teste: [TESTES.md](./TESTES.md). Os critérios 1–25 rodam com provedores falsos determinísticos e um servidor OAuth falso. O 26 usa as assinaturas reais e é validado pelo Pai.

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

Respondidas pelo Pai em 2026-10-15:
- provedor (ADR 0014);
- teto (US$ 20);
- convenção de código (aceita);
- SDKs e protocolo de dependências (decisões 9 e 10).

Resta uma, que o Pai pediu para ver explicada antes de decidir:

1. **Decisão 8, linguagem e execução sem build.** Explicação com prova executada em [EXPLICACAO-BUILD-E-TESTES.md](./EXPLICACAO-BUILD-E-TESTES.md).

Não bloqueante, mas necessário para a demonstração (critério 26): a chave do OpenCode Go em `.buddy-dev/.env.local` como `OPENCODE_API_KEY`, e uma conta ChatGPT Plus para o `rbuddy login chatgpt`.

**Enquanto isso, segue em paralelo** (AGENTS §5.4):
- os mecanismos `bd deps` e `bd test-guard`;
- o protocolo de dependências;
- o plano e o desenho dos testes atualizados.

Código do produto, só depois da aprovação.
