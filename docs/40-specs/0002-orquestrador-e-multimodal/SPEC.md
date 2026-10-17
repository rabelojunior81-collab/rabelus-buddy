# SPEC — M1: Orquestrador e multimodal

**ID:** 0002-orquestrador-e-multimodal · **Tamanho:** fase · **Revisão:** 1 · **Estado:** rascunho (aguarda a aprovação do Pai)
**Autor:** buddy-dev (Buddy Fenix), sessão `claude-code-vs-code-569aca` · **Criada em:** 2026-10-17 · **Decisão de origem:** [ADR 0018](../../60-decisoes/0018-ordem-c-depois-do-m0.md) (ordem C, aprovada pelo Pai)

## Problema e resultado

O M0 entregou um núcleo governado com uma console, mas o agente só conversa com os próprios provedores e só entende texto. O Pai quer um **agente multimodal, com UI**, que seja o **orquestrador** dos outros harnesses que ele já usa, sem configurar nada: o Rabelus Buddy reconhece o que está instalado, mostra cada um com ícone e nome, conversa com eles e decide as permissões. Tudo isso com a ergonomia do t3.chat, em verde-oliva e vidro.

**Resultado do M1:**
- **Detecção sozinha:** na console, os harnesses do Pai aparecem sem configuração. Hoje são Claude Code, Codex, OpenCode, Copilot, Pi e Hermes.
- **Tarefa por um harness:** uma tarefa vai a um deles, ou o Buddy a delega, e cada permissão pedida passa pela política do núcleo e aparece para o Pai.
- **Imagem e arquivo:** podem ser anexados na conversa e chegam ao modelo que os entende.
- **Console nova:** o visual do [protótipo](./prototipo-visual.html), que o Pai aprova com esta SPEC.

## Escopo

1. **Catálogo de harnesses pelo registro oficial do ACP** ([ficha](../../20-conhecimento/acp-registro-e-orquestradores.md)).
   - O núcleo baixa o `registry.json` da CDN oficial (HTTPS, sem desligar a verificação de TLS) no máximo uma vez por dia e guarda uma cópia local com data. Sem rede, usa a última cópia.
   - Os ícones são baixados e servidos **pela própria console**: a página continua sem carregar nada de fora (critério 28 do M0). Os SVGs são servidos como imagem, nunca como documento.
   - Harnesses fora do registro (hoje, o Hermes) entram por uma tabela curta nossa, marcada "fora do registro", com ícone genérico.
2. **Detecção sem configuração.**
   - Cada entrada tem **sinais de instalação**, o binário que denuncia o harness no PATH (`claude`, `codex`, `opencode`, `copilot`, `pi`, `gemini` etc.). A tabela de sinais é nossa e pequena, porque o registro não a traz.
   - Uma **sonda de disponibilidade** (`initialize` do ACP, com tempo-limite) diz se o harness está pronto, precisa de login ou falhou, e por quê.
   - A console mostra os encontrados com ícone, nome e estado. Os não instalados aparecem esmaecidos, com o link do site.
3. **Cliente ACP** (`@agentclientprotocol/sdk`, proposta de dependência).
   - O núcleo inicia o harness como o registro manda (binário local, `npx` ou `uvx`, com a versão fixada pelo registro) e conversa por `session/new`, `session/prompt` e `session/update`.
   - O andamento (raciocínio, texto, ferramentas) entra no `run.live` da M0.8d.
   - **Primeira execução de cada harness é ação aprovada pelo Pai**, porque `npx` e `uvx` baixam código. A aprovação mostra o pacote e a versão exata, e fica valendo para essa versão.
4. **Permissões pelo núcleo.**
   - Todo `session/request_permission` vira uma decisão do motor de política (ADR 0009) e, se for `ask`, uma aprovação na console com o ícone do harness, a ação e o alvo.
   - Concessões com escopo (uma vez, sessão, projeto) valem para os harnesses como para o agente próprio.
   - Tudo vai para o log como efeito com identidade.
5. **Autenticação do próprio agente.** Quando o harness responde `AUTH_REQUIRED`, a console mostra "Entrar" com os métodos que ele declara. O núcleo chama `authenticate` e o harness abre o navegador (Agent Auth). O núcleo nunca vê nem guarda a credencial do harness.
6. **Orquestração.**
   - O agente do Rabelus Buddy é o padrão na caixa de mensagem, e o Pai pode escolher um harness na mesma caixa.
   - O Buddy ganha a ferramenta `delegar(harness, tarefa)`, de um nível só: abre uma sessão no harness, acompanha o andamento e traz a resposta.
   - As permissões do harness delegado chegam ao Pai como as do Buddy, com o ícone de quem pede.
7. **Multimodal de entrada.**
   - Na caixa de mensagem, o Pai anexa, arrasta ou cola imagens (PNG, JPEG, WebP, GIF) e arquivos de texto (`.md`, `.txt`, código).
   - Os anexos ficam guardados na pasta de trabalho com hash, e o log registra o hash, nunca o conteúdo.
   - A **capacidade de visão** de cada rota vem de uma tabela medida: ChatGPT e Nemotron-VL aceitam; `gpt-oss` recusa.
   - Uma mensagem com imagem pula as rotas sem visão, com o motivo à vista.
   - Para um harness ACP, a imagem vai como bloco `image` se ele declarar suporte em `promptCapabilities`.
8. **Console redesenhada** (ADR 0018), pelo protótipo:
   - **Estrutura do t3.chat:** barra lateral com "Nova conversa", busca, conversas por dia e agentes encontrados; folha de conversa flutuante; tela inicial com saudação, pílulas de agente e sugestões; caixa de mensagem ancorada com pílulas (agente, esforço, anexar, imagem) e enviar.
   - **Visual:** verde-oliva em OKLCH (matiz 118–125) no claro e no escuro, vidro (`backdrop-filter` 12–24 px) e borda com reflexo.
   - **Continuidade:** tudo o que o M0 já faz (andamento ao vivo, fila, direcionar, parar, aprovações, consumo, provedores, chaves, login do ChatGPT, tema, idioma) continua, rearranjado.
   - **Acessibilidade e responsividade:** contraste AA nos dois temas, foco visível, `prefers-reduced-motion` respeitado e celular a 375 px.
9. **Contrato tipado console ↔ núcleo** (axioma T3). Cada método liberado na console tem um esquema `zod` (proposta de dependência) validado no núcleo. Entrada fora do esquema volta como erro claro, sem efeito.
10. **Sessão de TUI com o Pai**, no fim do M1: `ink` × `pi-tui` lado a lado, com as mesmas telas (conversa, aprovação, andamento), para ele decidir (ADR 0016).

**Fora** (com o marco que entrega):
- Execução isolada; harness rodando sem pedir permissão a cada passo: **M2**.
- Instalar harness que o Pai não tem (baixar binário do registro): fora do M1. A console mostra o link; instalar é decisão do Pai.
- Interface de produto, voz e mobile: **M3**.
- Times de agentes (líder, colegas, quadro de tarefas, como o AionUi): depois do M1, quando a delegação de um nível estiver provada.

## Decisões técnicas (cada uma com fonte)

| Decisão | Por quê | Fonte |
|---|---|---|
| Catálogo = registro oficial do ACP | 42 agentes com ícone, licença e como iniciar; mantido pela comunidade do protocolo; atualizado toda semana | `registry.json`, `FORMAT.md` (2026-10-17) |
| Sinais de instalação em tabela nossa | o registro não diz qual binário denuncia a instalação; o AionCore faz o mesmo (`binary_name`) | AionCore, migrações 001 e 025 |
| `@agentclientprotocol/sdk` 1.9.0 (Apache-2.0) | SDK oficial; sem dependências; o AionUi e os adaptadores oficiais falam o mesmo protocolo | npm e repositório (2026-10-17) |
| `zod` 4.6.7 (MIT) | par obrigatório do SDK, que também resolve o contrato tipado (axioma T3) com a mesma dependência | npm (2026-10-17) |
| Console sem framework nem build | a console continua servida pelo núcleo sem dependência de interface (ADR 0017); a pilha de produto se decide no M3 | ADR 0017, ADR 0018 |
| Primeira execução de harness aprovada | `npx`/`uvx` baixam código: é instalar, e instalar exige aprovação | AGENTS §5.3; DEPENDENCIAS.md |
| Ícones servidos pelo núcleo | a página não carrega nada de fora; SVG como imagem não executa script | critério 28 do M0 |

## Critérios de aceitação (observáveis; cada um vira teste, e nenhum teste se afrouxa)

1. **Catálogo:** com um servidor falso que imita a CDN e um `registry.json` na forma medida, o núcleo monta o catálogo (id, nome, versão, licença, ícone local, como iniciar por plataforma). Sem rede, usa a última cópia e diz a data dela. Um `registry.json` malformado não derruba nada e mantém a cópia anterior.
2. **Detecção:** com um PATH falso contendo `claude` e `opencode`, só esses aparecem como encontrados. O Hermes (fora do registro) aparece pela tabela própria. Os outros aparecem como não instalados.
3. **Sonda:** um harness falso por ACP (stdio) responde `initialize`. A sonda devolve pronto, precisa de login (`AUTH_REQUIRED`) ou falhou (tempo-limite, saída inesperada), com o motivo.
4. **Primeira execução aprovada:** iniciar um harness por `npx` pela primeira vez gera uma aprovação com pacote e versão. Negada, nada roda. Aprovada, a mesma versão não pergunta de novo, mas uma versão nova pergunta.
5. **Conversa por ACP:** com um harness falso, `session/prompt` produz andamento ao vivo no `run.live` (texto, raciocínio, ferramenta) e a resposta final na conversa, com efeito com identidade no log.
6. **Permissão pelo núcleo:** um `session/request_permission` do harness falso vira uma decisão da política. Se for `ask`, aparece como aprovação com o nome do harness. Negar devolve a recusa ao harness, aprovar devolve a escolha, e a concessão de sessão vale para os pedidos seguintes iguais.
7. **Autenticação do agente:** com `AUTH_REQUIRED` do harness falso, a console oferece "Entrar". O núcleo chama `authenticate` com o método escolhido, e nenhuma credencial do harness passa pelo núcleo nem pelo log.
8. **Delegação:** a ferramenta `delegar` do Buddy abre uma sessão no harness falso e traz a resposta. As permissões do harness chegam ao Pai com o ícone de quem pede. A parada da execução do Buddy encerra a sessão delegada.
9. **Anexos:** imagem e texto anexados ficam na pasta de trabalho com hash. O log tem o hash, não o conteúdo. A imagem vai à rota com visão no formato dela (`input_image` no SIWC, `image_url` no Chat). A rota sem visão é pulada com o motivo. A imagem vai ao harness ACP só se ele declarar suporte.
10. **Contrato tipado:** todo método de `CONSOLE_METHODS` tem esquema. Entrada inválida volta como erro 400 claro, sem evento no log, e uma varredura garante que nenhum método fica sem esquema.
11. **Console nova:**
    - a estrutura e os tokens do protótipo existem: paleta oliva nos dois temas, vidro, pílulas de agente com ícone, caixa ancorada;
    - os critérios 27–35 do M0 continuam passando;
    - a página não carrega nada de fora;
    - o contraste AA dos pares texto e fundo principais é medido e passa;
    - não há rolagem horizontal a 375 px.
12. **Ensaio real (com o Pai, pela console):** os harnesses do Pai aparecem sozinhos. Uma tarefa vai a um deles, com permissão aprovada pela console. Uma imagem anexada é entendida. O Pai entra num harness que pede login.
13. **Sessão de TUI:** os protótipos `ink` e `pi-tui` das mesmas telas rodam lado a lado num terminal do Pai, preparados e ensaiados pelo buddy-dev, e a decisão dele fica registrada. Esta é a única exceção ao "nada por terminal", porque a TUI é exatamente o que se avalia.

## Métricas (registradas)

Percentual de permissões resolvidas por política e por humano; tempo até o primeiro sinal por harness; uso de janela por tarefa; harnesses encontrados e prontos; anexos por conversa.

## Fontes de verdade

- [Registro oficial do ACP](https://github.com/agentclientprotocol/registry), [formato](https://github.com/agentclientprotocol/registry/blob/main/FORMAT.md), [autenticação](https://github.com/agentclientprotocol/registry/blob/main/AUTHENTICATION.md) e [`registry.json`](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json)
- [`@agentclientprotocol/sdk`](https://github.com/agentclientprotocol/typescript-sdk) e [especificação do ACP](https://agentclientprotocol.com)
- [AionUi](https://github.com/iOfficeAI/AionUi) e [AionCore](https://github.com/iOfficeAI/AionCore) (referência de desenho; nada copiado)
- [create-t3-app](https://github.com/t3-oss/create-t3-app) (axiomas) e [t3.chat](https://t3.chat/) (ergonomia e tokens; paleta trocada por oliva)

## Riscos e rollback

- **O registro muda de formato.** Mitigação: cópia local, validação por esquema e a cópia anterior se a nova não passar.
- **Um harness muda o comportamento de ACP.** Mitigação: a versão vem fixada pelo registro; versão nova pede aprovação e é sondada antes.
- **Código baixado por `npx` e `uvx`.** Mitigação: aprovação por versão, versão exata, nunca `latest`, e o pacote e a versão no log.
- **O vidro pesa em máquina fraca.** Mitigação: desfoque menor com `prefers-reduced-transparency` e uma opção de desligar.
- **Rollback:** o catálogo e o cliente ACP são aditivos, e a console antiga continua no histórico do git.

## Dúvidas para o Pai (não bloqueiam a pesquisa nem os testes)

1. **Aprovar esta SPEC e o protótipo visual** (paleta oliva, vidro, layout).
2. **Aprovar as dependências** `@agentclientprotocol/sdk@1.9.0` e `zod@4.6.7` (protocolo de dependências).
3. **Cor do Buddy:** o teal `#3fb8a8` é a cor de identidade do Buddy Fenix no Blog. A console do produto passa a ser verde-oliva. Recomendação: separar os dois, com o teal só para a identidade do buddy-dev e o oliva para o produto.
