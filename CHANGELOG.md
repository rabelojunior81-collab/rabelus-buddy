# Changelog

Todas as mudanças relevantes do **produto** Rabelus Buddy ficam registradas aqui.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/).

> O registro granular do desenvolvimento (cada ação do buddy-dev) mora em `.buddy-dev/CHANGELOG.md` e no ledger `.buddy-dev/bus/ledger/`. Este arquivo é a visão do produto para quem o usa.

## [Não publicado]

### Adicionado

- Núcleo para a console (M0.8a): esforço de raciocínio por execução (baixo, médio, alto) no formato de cada provedor, com uma repetição sem ele se o provedor recusar; rota escolhida por execução; conversa contínua com o histórico da sessão; chaves de API, estado dos provedores e login do ChatGPT pelo próprio núcleo.

### Alterado

- Rumo do M0 (decisão do Pai, 2026-10-17; [ADR 0017](./docs/60-decisoes/0017-console-web-local-no-m0.md)): o Rabelus Buddy é um agente com UX/UI, e a CLI é do próprio agente. A superfície do M0 passa a ser uma console web local servida pelo núcleo, e a demonstração acontece nela (SPEC 0001 revisão 5; plano com M0.8 e M0.9).

### Corrigido

- Achados da auditoria real de 2026-10-17, pelo binário e contra os serviços reais: o login do ChatGPT era recusado pela OpenAI (`ext_agent_host_id` agora no formato `urn:uuid:`); resposta HTTP de recusa (como o 403 de chave sem assinatura) parava a tarefa como efeito desconhecido e cobrava estimativa — agora é recusa com motivo no log e o agente passa ao próximo provedor; modelo gratuito do OpenRouter era cobrado; a CLI mostrava stack trace quando o dono caía; o dono sob demanda nunca se desligava e guardava credenciais velhas; `providers` agora diz de onde vem cada credencial.

### Adicionado

- Auditoria (M0.7c; com ela, a M0.7 completa): teste de ponta a ponta de que chave de API, token OAuth e valor de `.env` nunca aparecem no banco, no log, na saída nem nos temporários; varredura de que toda string da CLI vem do catálogo pt-BR/en; mensagens de erro do núcleo e do login pelo catálogo; preços por modelo do OpenCode Go, para as janelas contarem o consumo real.

- CLI do agente (M0.7b): `rbuddy run "<tarefa>"` sobe o dono quando preciso, acompanha a execução pelo catálogo e pergunta cada aprovação no terminal; `resume`, `status`, `log` (aprovações, consumo, escritas; nunca a conversa) e `providers` (ordem e credenciais); `login`/`logout` de `opencode-go`, `ollama-cloud` e `openrouter` com a chave lida sem eco e guardada só para o usuário.

- Retomada (M0.7a): a conversa do agente fica no log; depois de uma queda, `resume` reconcilia cada efeito desconhecido (chamada de modelo refeita; escrita pelo hash do conteúdo pedido; comando, só com o humano) e leva a tarefa ao fim sem efeito duplicado. O dono executa o agente em segundo plano, com aprovação pelo IPC, rotas e credenciais por `config.json`, `credentials/keys.json` ou variáveis de ambiente.

- Loop do agente (M0.6e; com ele, a M0.6 completa): ferramentas `read_file`, `list_dir`, `write_file` e `run_command` pela política; cada chamada de modelo, escrita e comando é efeito com identidade; reserva e liquidação por chamada; troca para o próximo provedor ao esgotar a janela; modelo que treina com os dados pulado sem concessão; compactação abaixo de 100k tokens.

- ChatGPT por Sign in with ChatGPT (M0.6b): `rbuddy login chatgpt` (PKCE, callback em 127.0.0.1, ID token conferido pelo JWKS, credenciais só do usuário, refresh rotativo, revogação no `logout`) e inferência em stream no contrato da prévia (`store: false`, `stream: true`, sem campos proibidos, sucesso só em `response.completed`).

- Provedores (M0.6a, com a M0.6c e a M0.6d): OpenCode Go em quatro rotas (Responses, Chat Completions, Messages e Google, com os SDKs `openai`, `@anthropic-ai/sdk` e `@google/genai`), Ollama Cloud e OpenRouter; identificação própria, `store: false`, uso normalizado, limite do provedor como esgotamento de janela; certificados do sistema somados aos embutidos. Testado contra servidor falso e com uma chamada real mínima por rota.

- Núcleo (M0.5): orçamento atômico por janela móvel — reserva pela estimativa antes da chamada, liquidação pelo `usage` real (fórmula verificada), liberação sem custo; janelas do OpenCode Go por modelo (5 h, semana, mês), teto semanal do ChatGPT informado pelo provedor e US$ 20/mês do OpenRouter; esgotamento por erro de limite do provedor; `rbuddy budget`.

- Núcleo (M0.4): motor de política (deny → ask → allow; caminhos protegidos `.git/`, `.buddy-dev/`, `archive/`, `.env*`, `*.pem`, `*.key`; concessões de uma vez, sessão e projeto; `ask` sem terminal vira `deny`; três chamadas idênticas pausam a sessão; modelos que treinam com os dados só com concessão de projeto) e ferramentas de arquivo com compare-and-set e de comando só com aprovação explícita.

- Núcleo (M0.3): execuções, efeitos externos (intenção, tentativa, recibo) e aprovações como eventos; retomada depois de `kill -9` (execução interrompida, efeito sem recibo "desconhecido" e bloqueado até a reconciliação, aprovação pendente preservada); `rbuddy approvals`, `approve` e `deny`; o log recusa evento de domínio malformado.

- Núcleo (M0.2): log de eventos em SQLite com sequência contígua por sessão e projeções reconstruíveis; processo dono único (`rbuddy daemon start|status|stop`) servindo JSON-RPC 2.0 por named pipe (Windows) ou socket Unix; cliente IPC compartilhado.

- CLI `rabelus-buddy`/`rbuddy` (M0.1): `--help`, `--version` e `--lang`, com mensagens do catálogo pt-BR/en; TypeScript executado direto pelo Node, com checagem de tipos na CI em Windows, Linux e macOS (Node 24 e 26).

- Ferramentas de desenvolvimento `bd`: relógio de Curitiba verificado, nomes com carimbo, barramento com ledger, arquivo morto governado, guarda contra exclusão.
- `bd`: gate do Blog (`session end` recusa sem post e daily publicados; `blog-check`) e checagem de superfícies (`surfaces`: índices, ADR aceita citada como proposta, carimbos, `main` do STATUS), também na CI.
- `bd`: protocolo de dependências (`deps`, `deps --latest`, rotina semanal na CI) e trava de testes (`test-guard`: a suíte não perde testes nem asserções, sem `skip`/`todo`/`only`), ambos no `bd post` e na CI.
- `bd`: merge governado (`merge`: CI verde e `bd post` limpo antes do merge commit), prune de branches (`prune`: mergeadas removidas, abandonadas arquivadas em tag) e registro de validações (`validacoes`), com o `bd pre` reprovando branch para podar.
- Superfície open source: licença Apache-2.0, README e guia de contribuição em pt-BR e en, Código de Conduta, política de segurança.
