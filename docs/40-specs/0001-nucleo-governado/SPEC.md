# SPEC — M0: Núcleo governado

**ID:** 0001-nucleo-governado · **Tamanho:** fase · **Revisão:** 1 · **Estado:** rascunho
**Autor:** buddy-dev (Buddy Fenix), sessão `claude-code-vs-code-438d04` · **Criada em:** 2026-10-15T04:29:18-03:00 · **Aprovada por:** pendente
**Revisão anterior:** —

## Problema e resultado

O Pai quer operar agentes de IA sob aprovação humana, orçamento fechado e registro completo, sem depender de um harness de terceiros para a governança (ADR 0010). Hoje essa governança existe só no desenvolvimento (`bd`, ledger, gates); o produto ainda não existe.

O M0 entrega o **núcleo governado mínimo**: um processo local dono do estado, uma CLI (`rabelus-buddy` / `rbuddy`) e um loop de agente com **um** provedor por API. Toda ação passa pelo motor de política, todo gasto passa pelo orçamento atômico, e todo fato vira evento num log que sobrevive a `kill -9`.

**Saberemos que deu certo quando** (ROADMAP, linha M0): uma tarefa real roda do início ao fim pela CLI, com cada aprovação e cada custo no log. Um `kill -9` no meio é seguido de retomada correta. E os requisitos 1, 6 e 7 da R5 passam na CI em Windows, Linux e macOS.

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
   - 3 chamadas idênticas seguidas pausam a sessão.
6. **Ferramentas do agente no M0** (sem sandbox, ADR 0009):
   - `read_file` e `list_dir`: `allow` dentro do workspace;
   - `write_file`: `ask`, com compare-and-set pelo hash da última leitura (R5-3, R5-8);
   - `run_command`: sempre `ask` até o M2;
   - "apagar" não existe; o equivalente é arquivar, e arquivar é `ask`.
7. **Orçamento atômico** (R5-6, ADR 0008):
   - reserva antes de cada chamada ao modelo, pelo custo máximo estimado;
   - liquidação depois, pelo uso real;
   - teto mensal em dólares para a API;
   - contadores por janela modelados desde já (prontos para as assinaturas do M1).
8. **Efeitos externos com identidade** (R5-5): toda chamada ao provedor e todo comando é uma intenção com id. Timeout ou queda deixa o efeito em estado **desconhecido**, que exige reconciliação antes de nova tentativa.
9. **Loop de agente** com um provedor da camada barata por API e **compactação de contexto** (R1): nenhuma chamada sai com mais de 100k tokens de entrada.
10. **Retomada** (R5-7): ao reiniciar, o dono reprojeta o estado do log. Execuções interrompidas aparecem como interrompidas, aprovações pendentes continuam pendentes, e efeitos sem recibo ficam "desconhecidos".
11. **Privacidade no provedor:** toda chamada sai com `store: false` (o padrão da Responses API guarda a resposta por 30 dias).
12. **Auditoria append-only sem conteúdo sensível:** chave de API, conteúdo de `.env*` e valores de segredos nunca entram no log nem na saída.
13. **i18n desde a primeira string** (ADR 0002): toda mensagem ao usuário sai de catálogo i18next em `locales/pt-BR/` e `locales/en/` ([ficha](../../20-conhecimento/bibliotecas-do-nucleo.md)).
14. **CLI:**
    - comandos `run "<tarefa>"`, `status`, `approvals`, `approve`/`deny`, `budget`, `log`, `resume`, `daemon start|stop|status`;
    - binários `rabelus-buddy` e `rbuddy` (ADR 0011);
    - argumentos com `node:util` `parseArgs`;
    - perguntas de aprovação com `node:readline`.

**Fora** (com o marco que entrega):

- Agentes externos por ACP e contagem real de janelas de assinatura: **M1**.
- Sandbox, worktree por sessão, aprovação na integração, comandos livres no workspace, rede por lista de domínios: **M2**.
- Memória de longo prazo e identidade versionada do agente do usuário: **M3**.
- Gateway, canais e entrada por mensagem (R5-2): **M4**.
- Web UI, desktop, mobile (ADR 0013), multi-provedor, MCP, subagentes (C2) e TUI com `ink`: **M5+**.
- Instaladores e publicação no npm: **M5+**. No M0 a CLI roda do repositório.

## Decisões técnicas propostas (cada uma com fonte)

| # | Pergunta do handoff | Proposta | Por quê | Fonte |
|---|---|---|---|---|
| 1 | Banco | `node:sqlite` (RC) atrás de adaptador; `better-sqlite3` como plano B documentado | zero dependência nativa; spike atendeu R5-1 e R5-7 no Windows | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md), [spike](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md) |
| 2 | IPC | JSON-RPC 2.0 por linhas sobre `node:net` (pipe e socket) | mesma API nos três SOs; mesmo modelo de mensagem do ACP (M1) | [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md) |
| 3 | Provedor do plano B | **GPT-6 Luna** pelo SDK `openai` 7.x (Apache-2.0); Claude Haiku 5.5 como alternativa | mesmo preço que o Haiku, sem a faixa cara acima de 100k e sem o tokenizador +30%; é o modelo do Plus e do Go no M1 | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md), [precos-llm](../../20-conhecimento/precos-llm.md), [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md) |
| 4 | CLI e TUI | `parseArgs` + despacho próprio; `readline` para aprovações; sem TUI no M0 | menos dependências e superfície de ataque; `ink` (React) entra quando houver telas interativas | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 5 | i18n | i18next 26.x; catálogos JSON por domínio, plurais `_one`/`_other` | o mesmo catálogo serve à CLI, à Web e ao app Expo (ADR 0013) | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md) |
| 6 | Orçamento antes do M1 | dólares por API com reserva/liquidação; tipo "janela" já no modelo (unidade, capacidade, período), alimentado no M1; cabeçalhos `x-ratelimit-*` registrados como observação | ADR 0008 exige medir janelas; o M0 só tem API | [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md), [assinaturas](../../20-conhecimento/assinaturas-de-agentes.md) |
| 8 | Linguagem e build (surgiu ao derivar o plano) | **TypeScript só com sintaxe apagável, executado direto pelo Node** (type stripping, estável no 24.12+ e no 26), sem etapa de build; `tsc --noEmit` na CI para checar tipos; monorepo com npm workspaces: `packages/core`, `packages/client` (`@rabelus-buddy/client`, o pacote compartilhado da ADR 0013) e `packages/cli` | tipos no protocolo compartilhado com Web e app; zero build; o que o Node não executa (`enum`, decorators) fica proibido por regra do `tsconfig` | [node-runtime](../../20-conhecimento/node-runtime.md), [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md), ADR 0013 |
| 7 | Fora do M0 | ver "Fora" acima; comandos sempre em `ask` | ADR 0009 (até o M2), ADR 0010 | ROADMAP |

Dependências do produto no M0: **`openai` e `i18next`**, e nenhuma outra em tempo de execução. Só para desenvolvimento: `typescript` e `@types/node`. Cada dependência nova exige revisão desta SPEC.

## Critérios de aceitação (observáveis; cada um vira teste)

**Concorrência e log**

1. Dadas duas CLIs abertas, quando cada uma emite 1.000 comandos ao mesmo tempo, então nenhum `SQLITE_BUSY` chega ao usuário e a sequência de eventos de cada sessão é contígua (R5-1). Roda em Windows, Linux e macOS.
2. Dado um dono vivo, quando um segundo `rbuddy daemon start` é chamado, então ele recusa com mensagem do catálogo e o primeiro continua servindo.
3. Dado que o banco de projeções foi apagado, quando o dono reconstrói a partir do log, então as projeções são iguais às de antes (comparação por hash).

**Retomada**

4. Dada uma execução com uma chamada de ferramenta em andamento, quando o dono recebe `kill -9` e é reiniciado, então a execução aparece como **interrompida**, o efeito em curso como **desconhecido** (nunca "concluído" sem recibo) e o `integrity_check` retorna `ok` (R5-7).
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

14. Dado um teto com saldo para uma única chamada, quando N sessões tentam chamar o modelo ao mesmo tempo, então só uma chamada sai; as outras são bloqueadas antes de qualquer custo (R5-6).
15. Ao fim de cada chamada, a reserva é liquidada pelo uso real; o gasto acumulado do mês bate com a soma dos eventos de liquidação.
16. Acima do teto, a tarefa para com a mensagem do catálogo e a opção de escalar (que exige aprovação).

**Agente, contexto e auditoria**

17. Nenhuma chamada ao provedor sai com mais de 100k tokens de entrada estimados: acima do limiar, o histórico é compactado, e a compactação vira evento.
18. Em toda a suíte, a chave de API e qualquer valor lido de `.env*` não aparecem no log, na auditoria nem na saída (busca pelo valor nos artefatos de teste).
19. Toda string mostrada pela CLI vem do catálogo: as chaves existem em `pt-BR` e `en`, e a troca de idioma (`--lang` ou `RBUDDY_LANG`) muda a saída.
20. Toda chamada ao provedor sai com `store: false`, e a liquidação usa `input_tokens`, `cached_tokens`, `cache_write_tokens` e `output_tokens` (que já inclui o raciocínio), com o preço da ficha. Verificado contra o provedor falso e, na demonstração, contra uma resposta real.
21. **Demonstração do marco** (com o provedor real): o Pai roda `rbuddy run` numa tarefa real de leitura e edição num repositório de teste. Cada aprovação e cada custo aparecem em `rbuddy log`. Um `kill -9` no meio e um `rbuddy resume` levam a tarefa ao fim sem efeito duplicado.

Desenho de cada teste: [TESTES.md](./TESTES.md). Os critérios 1–20 rodam com um provedor falso determinístico. O 21 usa o provedor real e é validado pelo Pai.

## Métricas (registradas, sem meta fixa no M0)

Custo por tarefa (US$), latência de IPC p50/p95, número de aprovações por tarefa, tokens de entrada por chamada antes e depois da compactação.

## Fontes de verdade

- [ROADMAP](../../50-planos/ROADMAP.md) e [PLANO-MACRO](../../50-planos/PLANO-MACRO.md) (M0).
- R1 ([custos](../../10-pesquisa/rev-0.2/r1-custos.md)), R3 ([aprovações](../../10-pesquisa/rev-0.2/r3-aprovacoes.md)), R5 ([concorrência](../../10-pesquisa/rev-0.2/r5-concorrencia.md)).
- ADRs [0002](../../60-decisoes/0002-idiomas-pt-br-e-en.md), [0008](../../60-decisoes/0008-orcamento-por-assinaturas.md), [0009](../../60-decisoes/0009-aprovacoes-com-escopo.md), [0010](../../60-decisoes/0010-nucleo-governado-e-composicao.md), [0011](../../60-decisoes/0011-binarios-da-cli.md), [0013](../../60-decisoes/0013-stack-mobile-e-web.md).
- Fichas: [banco-e-ipc](../../20-conhecimento/banco-e-ipc.md), [bibliotecas-do-nucleo](../../20-conhecimento/bibliotecas-do-nucleo.md), [precos-llm](../../20-conhecimento/precos-llm.md), [assinaturas-de-agentes](../../20-conhecimento/assinaturas-de-agentes.md), [node-runtime](../../20-conhecimento/node-runtime.md).
- Evidência: [spike de banco e IPC](../../registros/2026-10-15T042718-0300-spike-banco-e-ipc-do-m0/README.md).

## Capacidade do produto que esta unidade antecipa (METODO §4)

O M0 é onde o lore vira produto:
- o ledger por arquivo vira log de eventos com projeções;
- sessões e claims viram concorrência com compare-and-set;
- `bd pre`/`post` viram início e fechamento de sessão do agente;
- aprovações do Pai viram motor de política;
- o relógio verificado vira carimbo de evento.

## Riscos e rollback

| Risco | Mitigação |
|---|---|
| `node:sqlite` ainda é Release candidate e já renomeou a classe entre o 24 e o 26 | adaptador fino; testes nas duas linhas na CI; `better-sqlite3` como plano B |
| Mudança nos campos de uso da Responses API (verificados nos tipos do SDK 7.34.0 em 2026-10-15) | o provedor falso implementa o mesmo contrato; teste de contrato contra o tipo do SDK na versão fixada |
| Estimativa de custo antes da chamada (reserva) acima ou abaixo do real | reserva pelo máximo (`max_output_tokens` × preço); liquidação devolve a diferença |
| Permissões de named pipe no Windows | teste de acesso por outro usuário marcado como manual no M0, automatizado no M2 |
| Custo real da demonstração | teto do M0 abaixo do saldo de API (ver dúvida 3) |

**Rollback:** o M0 é código novo, num pacote novo; nada nas ferramentas `bd` depende dele. Reverter é reverter os merges; o log de eventos de teste vive fora do repositório.

## Dúvidas bloqueantes

Sem resposta do Pai, esta SPEC não pode ser aprovada:

1. **Provedor e chave:** GPT-6 Luna por API (recomendado) exige uma chave da OpenAI com crédito. O tier Build pede US$ 5 em créditos. Se preferir o Claude Haiku 5.5, é uma chave da Anthropic. Qual, e onde a chave vai ficar (variável de ambiente, como a do Gemini em `.buddy-dev/.env.local`)?
2. **Teto de API do M0:** proposta de **US$ 10/mês**, dentro dos cerca de US$ 20 que a ADR 0008 deixa para API, VPS e backup.
3. **Convenção de código** (`CONVENCOES.md` §Idiomas, pendente desde 2026-10-14): identificadores em inglês, comentários e mensagens de desenvolvimento em pt-BR, strings do produto pelo catálogo. Aceita?
4. **Dependências e linguagem:** só `openai` e `i18next` em tempo de execução; `typescript` e `@types/node` só no desenvolvimento; código em TypeScript apagável, sem build (decisão 8). Aceita?

**Enquanto isso, segue sem as respostas** (AGENTS §5.4): o [plano de fase do M0](../../50-planos/m0/PLANO.md), a verificação dos fatos em aberto e o desenho dos testes de cada critério. Código do produto só depois da aprovação.
