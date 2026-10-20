# Changelog

Todas as mudanças relevantes do **produto** Rabelus Buddy ficam registradas aqui.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/).

> O registro granular do desenvolvimento (cada ação do buddy-dev) mora em `.buddy-dev/CHANGELOG.md` e no ledger `.buddy-dev/bus/ledger/`. Este arquivo é a visão do produto para quem o usa.

## [Não publicado]

### Adicionado

- **O Buddy delega a outro agente** (M1.4, critério 8). Numa tarefa, o Buddy pode passar uma parte a um agente instalado (OpenCode, Codex e os outros que a console encontra) e trazer a resposta. A conversa mostra a quem ele delegou, o que pediu e como terminou. Cada permissão que o agente pedir chega ao Pai com o ícone dele, e Parar encerra também o agente.
- **Anexar pela console** (M1.3b; com ela, a M1.3 está concluída). Na caixa de mensagem, o Pai anexa uma imagem ou um arquivo pelo 📎, arrastando ou colando. Cada anexo vira uma etiqueta que dá para tirar antes de enviar, e a mensagem enviada mostra o que foi junto. Se quem vai executar não enxerga imagem, a console avisa antes de subir. No ensaio, o Nemotron VL respondeu a cor da imagem anexada pela console.
- **Imagens e arquivos na conversa, no núcleo** (M1.3a, critério 9). O núcleo aceita imagens (PNG, JPEG, WebP, GIF) e arquivos de texto ou código anexados à mensagem. Eles ficam guardados na pasta de trabalho; o histórico da conversa guarda só a referência, nunca o conteúdo. Cada provedor recebe a imagem no formato dele. Um modelo que não enxerga é pulado, com o motivo, e um agente só recebe a imagem se disser que a aceita. No computador do Pai, o ChatGPT, o Nemotron VL e o OpenCode responderam a cor certa de uma imagem de teste. Anexar pela console chega na próxima parte (M1.3b).
- **M1.2 concluída: o Buddy conversa com os agentes pelo ACP** (2026-10-19). Ele confere se cada agente está pronto, pede a aprovação do Pai antes de baixar código, conversa com o andamento ao vivo, decide as permissões pela própria política e faz o login do agente sem ver a credencial. O primeiro login do Pai num agente real fica para o ensaio da M1.6, por decisão dele.
- **Escolher o modelo na caixa de mensagem** (M1.5c, critérios 11 e 13). Uma pílula (ou Ctrl+K) abre o catálogo real de modelos:
  - uma aba por provedor, com busca e filtros por capacidade (visão, raciocínio, ferramentas, grátis, contexto grande);
  - os modelos agrupados por lab, com as capacidades em ícones e o tamanho do contexto;
  - "Automático" segue a ordem dos provedores;
  - o seletor diz quem ficou de fora da lista e por quê.

  O esforço passa a oferecer os níveis que o modelo escolhido declara, inclusive "muito alto" e "máximo" no ChatGPT, medidos ao vivo. Quando um provedor recusa um nível, o Buddy repete sem ele e avisa. No OpenRouter, o limite de um modelo grátis não bloqueia mais os outros.
- **Escolher o harness na caixa de mensagem** (M1.5b). Uma pílula na caixa escolhe quem executa: o Buddy, com os seus provedores, ou um dos harnesses encontrados no computador. Ao escolher, a console confere na hora se ele está pronto, se precisa de login ou de aprovação. A conversa com o harness mostra, à vista:
  - o pedido de permissão, com o ícone de quem pede;
  - a escrita sem pedido;
  - a falha;
  - o pedido de login, com um botão "Entrar" para cada forma que ele oferece.

  O resto do que ele faz fica nos detalhes. No computador do Pai, com o OpenCode, aprovar pela console liberou a escrita, e a resposta voltou.
- **Console nova, primeira parte** (M1.5a, critério 11). A console passa a ter a cara do protótipo aprovado pelo Pai:
  - verde-oliva e vidro, nos temas claro e escuro, com a marca do Rabelus Lab ao lado do nome e no ícone da aba;
  - barra lateral com "Nova conversa", as conversas agrupadas por dia e os harnesses encontrados no computador;
  - tela inicial com saudação e sugestões;
  - caixa de mensagem ancorada, com as aprovações pendentes logo acima, sempre à vista;
  - provedores, ChatGPT, chaves, consumo, execuções, idioma, tema e pasta de trabalho num painel de Ajustes.

  Tudo o que a console já fazia continua. O contraste é medido em cada mudança e passa o nível AA nos dois temas. No celular (375 px), a barra lateral vira gaveta, sem rolagem para os lados. Escolher o harness e o modelo na caixa chega nas próximas partes.
- **Login dos agentes pelo núcleo** (M1.2e, critério 7). Quando um agente pede para entrar, a conversa para e diz quais formas de entrar ele oferece. O núcleo pede ao agente que faça o login: o próprio agente abre o navegador e guarda a credencial dele, que nunca passa pelo Buddy. Formas de entrar que exigem terminal são recusadas com explicação. O botão "Entrar" chega com a console nova (M1.5), e o primeiro login do Pai vai para o ensaio (M1.6), por decisão dele.
- **Permissões dos agentes pelo núcleo** (M1.2d, critério 6). Ao abrir a conversa, o Buddy pede ao agente que pergunte antes de escrever ou executar: o Codex em modo somente leitura; o OpenCode com "perguntar" só para aquela conversa, sem tocar na configuração do Pai. Cada pedido passa pela política do Buddy:
  - o que ela permite segue sozinho;
  - o que exige decisão aparece em Aprovações, com o nome do agente, a ação e o alvo (para comando, o comando inteiro);
  - negar para a tarefa, com o motivo;
  - escrita feita sem pedir vira aviso.

  No computador do Pai, negar impediu a escrita no OpenCode e no Codex, e aprovar a liberou.
- **Conversa com os agentes pelo ACP** (M1.2c, critério 5): o núcleo entrega a tarefa a um agente instalado (OpenCode, Codex e outros) e mostra o andamento ao vivo: raciocínio, ferramentas e texto. A resposta entra na conversa, e "Parar" interrompe o agente. Agente que precisa baixar código só conversa depois da aprovação do Pai. No computador do Pai, o OpenCode e o Codex responderam e usaram ferramentas. A escolha do agente na tela chega com a console nova (M1.5). Um achado foi para a M1.2d: na configuração atual, os dois agentes escrevem arquivos sem pedir permissão.
- **Retorno ao aprovar** (M1.2b): aprovar a primeira execução de um agente roda a verificação na hora, e a console mostra o resultado ("Codex 2.2.2: pronto para conversar com o Buddy."). No computador do Pai, o Codex ficou pronto.
- **Primeira execução aprovada** (M1.2b, critério 4): agente que precisa baixar código (pelo `npx` ou `uvx`) só roda depois de o Pai aprovar na console, com o pacote e a versão exatos; negado, nada roda; uma versão nova pede de novo. Primeiro alvo: o Codex.
- **Sonda dos agentes** (M1.2a, critério 3): o Buddy inicia cada agente instalado, faz o aperto de mão do protocolo e diz se está pronto, se precisa de login ou por que falhou, sem abrir janela e sem deixar processo vivo. No computador do Pai: OpenCode, Copilot e Hermes prontos; Claude, Codex e pi aguardam a aprovação da primeira execução.
- **Autoverificação no `bd`** (regra do Pai, 2026-10-18): `bd verifica` acusa commit de código sem registro no barramento, alteração sem commit e commit sem push; roda no `bd post`, na CI e, no Claude Code, ao fim de cada resposta do buddy-dev.
- **Três regras do Pai com mecanismo no `bd`** (2026-10-18): `bd serve` (servidor de conferência registrado, reaproveitado e encerrado com a árvore de processos; a sessão não fecha com servidor vivo); `bd contexto` (o contexto essencial de governança volta sozinho depois de cada compactação, pelos ganchos do Claude Code); `bd orfaos` (links quebrados, documentação sem referência e exportação sem uso, no `bd post` e na CI).
- **M1.1 concluída na parte do núcleo** (2026-10-18): detecção dos agentes instalados, catálogo de modelos e aviso de resposta vazia; o seletor e a lista na tela chegam com a console nova (M1.5).
- **Catálogo de modelos** (M1.1, critério 13): o núcleo monta provedor → lab → modelo, com visão, raciocínio e os níveis de esforço, ferramentas, contexto e preço, consultando cada provedor ao vivo e o models.dev onde o provedor não declara. Cada capacidade diz de onde veio, e a declaração do provedor vence. Hoje são 538 modelos em ChatGPT, OpenCode Go, Ollama Cloud e OpenRouter, renovados no máximo uma vez por dia.
- **Os agentes instalados aparecem sozinhos** (M1.1, critérios 1 e 2). O núcleo lê o registro oficial do ACP (42 agentes, com ícone, versão, licença e como iniciar), guarda uma cópia para quando estiver sem rede e reconhece pelo PATH os que já estão no computador, sem instalar nada. No computador do Pai: Claude Code, Codex, Copilot, OpenCode, pi e Hermes (este fora do registro, por tabela própria).
- **M1.0: contrato tipado da console.** Cada pedido da console é conferido antes de chegar ao núcleo: campo desconhecido, tipo errado ou valor fora da lista volta como erro com mensagem clara em português, e nada é executado nem gravado.

- **M1 em execução** (SPEC 0002 aprovada pelo Pai em 2026-10-18): o SDK oficial do ACP e o `zod` foram instalados. Os alertas de segurança do GitHub (Dependabot) foram ligados.

- **M0 concluído** (2026-10-17): o núcleo governado com a console web local, validado pelo Pai pela console ([retrospectiva e métricas](./docs/registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md)).

- **Tema da console** Sistema, Claro ou Escuro, lembrado e aplicado antes de a página aparecer (critério 35, pedido do Pai). Títulos em Markdown formatados na conversa.

- **Andamento ao vivo na console** (M0.8d; SPEC 0001 rev. 6, critérios 31–34; pedido do Pai depois de 248 s de tela parada no esforço Alto). Enquanto o agente trabalha, a conversa mostra:
  - a fase (pensando, escrevendo, usando uma ferramenta, aguardando aprovação) e o tempo;
  - o raciocínio que o provedor expõe (resumo no ChatGPT, por inteiro na Ollama e no OpenRouter);
  - o texto chegando em cadência.

  Raciocínio, comandos e resultados ficam em blocos recolhíveis, com a preferência lembrada. O raciocínio vai para o log (`agent.reasoning`). Uma conversa roda uma execução por vez: a mensagem nova entra **na fila**, com **"Direcionar agora"** (entra na execução em curso) e "Cancelar". **"Parar"** interrompe a chamada em curso. Recarregar a página mantém a conversa e o provedor escolhido. Contas em LaTeX aparecem legíveis. Ensaiado com os provedores reais ([registro](./docs/registros/2026-10-17T185732-0300-ensaio-da-m0-8d-andamento-ao-vivo-e-fila/README.md)).

- **`bd claims`**: documento vivo alterado sem claim no ledger reprova no `bd post` e na CI.

- **Console web local** (M0.8: núcleo na M0.8a, console na M0.8b, ensaio na M0.8c; ADR 0017): aberta por duplo clique em `abrir-rabelus-buddy.cmd` (ou `rbuddy ui`), servida pelo núcleo só em 127.0.0.1 com token. É um chat: caixa de mensagem embaixo da conversa, esforço de raciocínio e provedor por mensagem, conversa contínua, aprovar e negar, provedores com a origem da chave, chaves guardadas (nunca devolvidas à página), entrar e sair do ChatGPT, consumo por janela, execuções com Retomar, pt-BR e en, tela de celular. Ensaiada num navegador real na máquina do Pai.

- Núcleo para a console (M0.8a): esforço de raciocínio por execução (baixo, médio, alto) no formato de cada provedor, com uma repetição sem ele se o provedor recusar; rota escolhida por execução; conversa contínua com o histórico da sessão; chaves de API, estado dos provedores e login do ChatGPT pelo próprio núcleo.

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

### Alterado

- **A console não leva mais o token no endereço** (M1.5e, critério 16; decisão do Pai em 2026-10-20). O atalho abre a console por um bilhete de uso único, que vira um cookie protegido, e o endereço fica limpo: `http://127.0.0.1:47321/`. O token não aparece mais na barra do navegador, no histórico, em capturas nem na mensagem do `rbuddy ui`. Um endereço antigo com `?t=` ainda funciona uma vez e volta para o limpo. Fechar o navegador apaga o cookie; para voltar, use o atalho.
- **Cor do produto e do Buddy Fenix: verde-oliva** (opção B do Pai). A console trocou o verde-água pelo oliva, e o tema claro ganhou contraste: 6,17:1 contra 4,21:1.

- **Ordem dos marcos depois do M0** ([ADR 0018](./docs/60-decisoes/0018-ordem-c-depois-do-m0.md), decisão do Pai): M1 orquestrador e multimodal; M2 isolamento; M3 interface de produto; M4 memória; M5 canais. SPEC 0002 do M1 em rascunho, com protótipo visual em verde-oliva e vidro.

- Rumo do M0 (decisão do Pai, 2026-10-17; [ADR 0017](./docs/60-decisoes/0017-console-web-local-no-m0.md)): o Rabelus Buddy é um agente com UX/UI, e a CLI é do próprio agente. A superfície do M0 passa a ser uma console web local servida pelo núcleo, e a demonstração acontece nela (SPEC 0001 revisão 5; plano com M0.8 e M0.9).

### Corrigido

- **Correções do uso real do Pai** (2026-10-20):
  - a negação da primeira execução de um agente agora pode ser revista ("Rever decisão"), e a negação antiga fica no histórico;
  - um pedido do agente fora da pasta de trabalho chega ao Pai como cartão, com o caminho completo, em vez de ser negado em silêncio;
  - a tela diz se quem negou foi a política ou o Pai;
  - a fala de um agente aparece com o nome e o ícone dele, não mais como "BUDDY".
- **Resposta vazia do provedor não passa mais por "concluída"** (M1.1, achado no ensaio do M1.0). Quando o modelo devolve nada (nenhum texto, nenhuma ferramenta, 0 tokens), o Buddy tenta o próximo provedor da ordem ou para com um motivo claro na console.

- Retomada mais robusta (achados do ensaio): aprovação pendente reaproveitada depois de uma queda; o detector de laço conta só pedidos do modelo; esforço e rota da execução voltam na retomada; conta sem saldo (402) tira o provedor da frente por 1 h.

- **ChatGPT sem resposta na console** (achado do Pai no primeiro uso): o backend real do ChatGPT manda `response.completed` com `output` vazio e entrega texto e chamadas de ferramenta só em `response.output_item.done`; o núcleo agora lê esses itens (medido ao vivo; [registro](./docs/registros/2026-10-17T164021-0300-chatgpt-sem-resposta-na-console-hotfix-ensaiado/README.md)). Na mesma passada, a console mostra listas e blocos de código formatados, troca "Entrar com o ChatGPT" por "Trocar de conta" quando já conectado e traduz os rótulos acessíveis.

- Achados da auditoria real de 2026-10-17, pelo binário e contra os serviços reais: o login do ChatGPT era recusado pela OpenAI (`ext_agent_host_id` agora no formato `urn:uuid:`); resposta HTTP de recusa (como o 403 de chave sem assinatura) parava a tarefa como efeito desconhecido e cobrava estimativa — agora é recusa com motivo no log e o agente passa ao próximo provedor; modelo gratuito do OpenRouter era cobrado; a CLI mostrava stack trace quando o dono caía; o dono sob demanda nunca se desligava e guardava credenciais velhas; `providers` agora diz de onde vem cada credencial.
