# Desenho dos testes — SPEC 0002 (M1)

**Classe:** CONTRATO (anexo da [SPEC](./SPEC.md)) · **Estado:** rascunho, segue a SPEC (revisão 1) · **Data:** 2026-10-17

Cada critério tem um teste nomeado antes do código (METODO §3.5). Usam `node:test`, rodam pelo `npm test` e, salvo indicação, rodam na matriz Windows, Linux e macOS × Node 24 e 26. Lição do M0 (AGENTS §5.9): os servidores e harnesses falsos copiam a **sequência medida** nos reais, e cada integração é checada contra o serviço real antes de ser declarada pronta.

**Peças comuns de teste:**

| Peça | Para quê |
|---|---|
| `fakeRegistry` | servidor HTTP local que serve um `registry.json` na forma medida em 2026-10-17 e ícones SVG; pode ficar fora do ar ou servir JSON malformado |
| `fakePath` | diretório temporário no PATH com executáveis falsos (`claude`, `opencode`), nos três SOs |
| `fakeAcpAgent` | harness falso por ACP em stdio (script Node), roteirizado: `initialize`, `authenticate`, `session/new`, `session/prompt` com `session/update` em fluxo, `session/request_permission`, `AUTH_REQUIRED`, tempo-limite, saída inesperada |

| # | Teste | Como | Sub-fase |
|---|---|---|---|
| 1 | `catálogo do registro` | `fakeRegistry` → catálogo com id, nome, versão, licença, ícone local e lançamento por plataforma; fora do ar → última cópia com data; malformado → cópia anterior mantida, sem exceção. **Em `harnesses.test.ts`, verde em 2026-10-18** | M1.1 |
| 2 | `detecção pelo PATH` | `fakePath` com `claude` e `opencode` → só esses encontrados; Hermes pela tabela própria; o resto não instalado. **Em `harnesses.test.ts`, verde em 2026-10-18** | M1.1 |
| 3 | `sonda de disponibilidade` | `fakeAcpAgent` → pronto; com `AUTH_REQUIRED` → precisa de login; mudo → tempo-limite; saindo → falhou, com o motivo. **Em `sonda.test.ts` (harness falso feito com o SDK oficial), verde em 2026-10-18; checagem real: OpenCode, Copilot e Hermes prontos** | M1.2 |
| 4 | `primeira execução aprovada` | lançamento por `npx` falso → aprovação com pacote@versão; negada → nenhum processo; aprovada → a mesma versão não pergunta; versão nova pergunta. **Em `primeira-execucao.test.ts`, verde em 2026-10-18; ensaio na console registrado** | M1.2 |
| 5 | `conversa por ACP` | `session/prompt` → `run.live` com texto, raciocínio e ferramenta na ordem; resposta final na conversa; efeito com identidade no log | M1.2 |
| 6 | `permissão pelo núcleo` | `session/request_permission` → decisão da política; `ask` → aprovação com o nome do harness; negar e aprovar voltam ao harness no formato do ACP; concessão de sessão vale para o pedido igual seguinte | M1.2 |
| 7 | `autenticação do agente` | `AUTH_REQUIRED` → a console recebe os métodos; `authenticate` chamado com o escolhido; varredura do banco, do log e da saída: nenhuma credencial do harness | M1.2 |
| 8 | `delegação` | ferramenta `delegar` → sessão no `fakeAcpAgent`, resposta de volta; permissão do harness com o nome dele; parar a execução do Buddy encerra a sessão delegada | M1.4 |
| 9 | `anexos` | imagem e texto → arquivos com hash na pasta de trabalho, só o hash no log; espião no transporte: `input_image` (SIWC) e `image_url` (Chat); rota sem visão pulada com motivo; ACP só com `promptCapabilities.image` | M1.3 |
| 10 | `contrato tipado` | varredura: todo método de `CONSOLE_METHODS` tem esquema; entrada inválida → 400 com mensagem, nenhum evento novo. **Escrito em `packages/core/test/contrato.test.ts` (4 testes, verdes em 2026-10-18)** | M1.0 |
| 11 | `console nova` | varredura da página: tokens oliva nos dois temas, `backdrop-filter`, pílulas de agente com ícone servido localmente, nada de fora; os testes 27–35 do M0 continuam; contraste AA calculado dos pares principais; ensaio no navegador a 375 e 1440 px | M1.5 |
| 12 | `ensaio real` (com o Pai) | ensaio do buddy-dev no ambiente do Pai (registro) → harnesses dele aparecem sozinhos; tarefa por um deles com permissão aprovada; imagem entendida; login num harness | M1.6 |
| 13 | `catálogo de modelos e duas camadas` | servidores falsos com a forma medida em 2026-10-17 (ChatGPT, Ollama, OpenRouter, models.dev) → provedor → lab → modelo com capacidades e fonte; declaração do provedor vence o models.dev; esforço por modelo; imagem sem visão recusada antes da chamada; busca e barra de capacidades na console; seletores de harness e de modelo separados, e trocar o harness troca a lista de modelos (varredura + ensaio). **Parte do núcleo em `modelos.test.ts`, verde em 2026-10-18; a parte da console vai na M1.5** | M1.1 |
| 15 | `telemetria do Go` | servidor falso com `/v1/usage` na forma medida em 2026-10-18 → 402 com semanal bloqueada esgota o provedor inteiro até o `resetsAt`, motivo legível; `/usage` fora do ar → comportamento anterior; `providers.usage` devolve as janelas sem a chave | M1.1 |
| 14 | `sessão de TUI` (com o Pai) | protótipos `ink` e `pi-tui` das mesmas telas, ensaiados pelo buddy-dev no terminal do Pai, e a decisão registrada | M1.7 |
