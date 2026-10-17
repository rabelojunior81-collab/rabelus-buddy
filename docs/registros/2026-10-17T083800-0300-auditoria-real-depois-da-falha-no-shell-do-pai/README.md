# Auditoria real depois da falha no shell do Pai

**Classe:** REGISTRO · **Data:** 2026-10-17T08:38:01-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-7307c7`) · **Para:** M0 (SPEC 0001), regra do Pai de 2026-10-17

## O que aconteceu

Fechei a M0.7 dizendo que "o que depende de mim está feito" e pedi ao Pai que rodasse `rbuddy login chatgpt` e `rbuddy providers`. No PowerShell dele, o `rbuddy` nem existia. Além disso, o Pai disse que não está construindo uma CLI, e sim um **agente multimodal com UX e UI**: a CLI é do próprio agente, nunca superfície de teste dele.

## Método

Usei o produto como um usuário: o binário em processos separados, o dono subindo sozinho, as variáveis de ambiente da máquina do Pai, a OpenAI real num navegador (sem entrar em conta). Nada injetado pelos testes.

## Achados e o que foi feito

| # | Achado | Gravidade | Estado |
|---|---|---|---|
| 1 | `rbuddy` nunca instalado no PATH; eu pedi teste sem ensaiar no shell do Pai | grave (conduta) | regra nova com mecanismo: ação do Pai exige ensaio registrado e nunca passa por terminal/CLI (`bd validacoes`) |
| 2 | **Login do ChatGPT quebrado na OpenAI real:** `400 invalid_authorize_request` no `ext_agent_host_id` (UUID sem `urn:uuid:`). O servidor falso aceitava qualquer valor | grave | corrigido; servidor falso agora recusa como a OpenAI real; a URL corrigida abre a tela de login ([ensaio](../2026-10-17T083606-0300-ensaio-do-login-do-chatgpt-na-openai-real/README.md)) |
| 3 | A `OPENCODE_GO_API_KEY` do ambiente da máquina é uma chave sem assinatura Go (403). O produto tratou o 403 como efeito desconhecido: parou a tarefa, cobrou US$ 0,24 de estimativa, não registrou o motivo e não passou ao próximo provedor | grave | corrigido: resposta HTTP é conclusiva (4xx recusa com motivo no log, 5xx indisponível por 5 min; só a falta de resposta é inconclusiva). Cenário do Pai repetido pelo binário: Go recusa, troca para o OpenRouter, tarefa concluída |
| 4 | O modelo `:free` do OpenRouter era cobrado pelo preço conservador (consumia o teto de US$ 20) | médio | corrigido (custo 0) |
| 5 | A troca de provedor se repetia no log a cada passo | baixo | corrigido (uma vez por execução) |
| 6 | A CLI morria com stack trace quando o dono caía durante o acompanhamento | médio | corrigido (mensagem do catálogo com o caminho de volta) |
| 7 | O dono sob demanda ficava no ar para sempre, com as variáveis de ambiente do primeiro terminal: uma chave trocada não valia | médio | corrigido (desliga após 15 min ocioso; `RBUDDY_IDLE_MS`) |
| 8 | `providers` dizia "pronto" sem dizer de onde vinha a credencial | médio | corrigido (guardada, variável de ambiente pelo nome, login); a validade da chave ainda não é sondada (aberto) |
| 9 | O Pai atualizou a chave no `.buddy-dev/.env.local`, que é do buddy-dev; o produto lê a variável de ambiente do Windows ou `credentials/keys.json` | médio | aberto: depende da superfície de UX (onde o Pai configura credenciais) |
| 10 | `kill -9` real no dono destacado e `resume` | — | **funciona** (CONFIRMADO): a chamada interrompida foi reconciliada e refeita, e a tarefa terminou |
| 11 | Tarefa real com a chave válida pelo binário | — | **funciona** (2 passos, 6 s) |
| 12 | Depois do login do ChatGPT: troca do código, ID token real, escopo concedido e inferência | desconhecida | não ensaiável sem a conta do Pai; o primeiro login real é o teste |
| 13 | Aprovações só existem no terminal (TTY) | grave para o rumo do produto | aberto: precisam de UI |
| 14 | O critério 26 da SPEC e a M0.8 prescrevem a demonstração **por CLI** | grave para o rumo do produto | `demonstracao-m0` bloqueada; decisão do Pai |
| 15 | O ROADMAP põe Web UI, desktop e mobile no **M5+** | grave para o rumo do produto | decisão do Pai |
| 16 | Um dono sumiu entre duas chamadas minhas, sem rastro | — | NÃO IDENTIFICADO; observar |

## Lição

Testes com servidor falso provaram o contrato que eu imaginei, não o mundo: 194 testes verdes e um login que não passava da primeira tela. Integração externa só se declara pronta depois de uma checagem contra o serviço real (AGENTS §5.9).
