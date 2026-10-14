# 05 — Gateway multicanal, interfaces e canais

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. A avaliação do Hermes como produto está na nota 11; a integração com o Buzz está na nota 12.

## Resumo

- **Só o WhatsApp exige endpoint público.** A Cloud API entrega eventos por webhook; os demais canais têm caminho sem endpoint público: Telegram tem longo polling, Slack tem Socket Mode e Discord tem Gateway (websocket). Para arquitetura híbrida com núcleo local, isso significa: WhatsApp força um pequeno gateway em servidor; os outros canais podem operar com conexões de saída [1][2][3][4].
- **WhatsApp cobra por mensagem de template.** Desde 01/07/2025 o modelo é por mensagem: não-template são grátis dentro de janela de atendimento de 24 h; utility templates grátis dentro dessa janela; marketing sempre cobrado; preços variam por mercado e categoria; mudanças de preço só em 1º de janeiro, abril, julho e outubro [1].
- **Meta tem política de preços específica para "AI Providers"** na plataforma, vigente desde 16/02/2026 e atualizada em 12/05/2026. Um harness que usa a API do WhatsApp pode se enquadrar nessa política — a ser lida antes de integrar [1].
- **Telegram é o canal mais rico para agentes:** respostas em streaming (rascunhos que o usuário pode parar), tópicos em chats privados, mensagens efêmeras, bots de negócio (Secretary Mode) e comunicação entre bots. Sem SDK oficial [3].
- **Slack:** Events API com Socket Mode ou endpoint HTTP; até 30.000 eventos por workspace a cada 60 minutos; resposta 200 em até 3 segundos, com 3 retries; Bolt oficial em JavaScript e Python [2].
- **Discord:** interações por Gateway ou por Interactions Endpoint URL (campos mutuamente exclusivos); resposta inicial em 3 segundos; token válido por 15 minutos [4].
- **Recomendação preliminar.** Um gateway enxuto em servidor (webhooks de WhatsApp e Slack, se HTTP) mais clientes de saída no núcleo local (Telegram por polling, Discord por Gateway, Slack por Socket Mode). Protocolo de eventos único, com sessão compartilhada; aprovação humana dentro do evento, não do canal.

## Fatos verificados

### 1. WhatsApp Business Platform [1]

- Desde 01/07/2025, cobrança por mensagem: só mensagens template entregues são cobradas; taxa varia pela categoria do template (marketing, utility, authentication) e pelo código de país do destinatário.
- Mensagens não-template (texto, imagem etc.) são grátis, mas apenas dentro de janela de atendimento ao cliente de 24 horas aberta pela última mensagem do usuário.
- Templates utility dentro de janela aberta são grátis; marketing é sempre cobrado.
- Janela de Free Entry Point: resposta via Click-to-WhatsApp Ad ou botão de CTA da Página abre janela de 72 h com qualquer mensagem grátis (app móvel Android ou iOS).
- Preços mudam só no 1º dia de cada trimestre (jan, abr, jul, out). Atualização de tabela de taxas exige 1 mês de aviso; mudança de modelo de preço, 6 meses.
- Brasil: clientes elegíveis podem faturar em BRL desde 01/07/2026; migração obrigatória até 30/06/2027.
- Existe política de preços específica para "AI Providers" que usam a plataforma, vigente desde 16/02/2026, atualizada em 12/05/2026.
- Webhooks: mensagens cobráveis chegam com `pricing.billable: true` e `pricing_model: PMP`; há webhook de atualização de tier de volume (`VOLUME_BASED_PRICING_TIER_UPDATE`) e endpoint de analytics de preços.
- A entrega de eventos usa webhooks (Cloud API); a página de preços não é a de webhooks, mas o modelo de integração é o de webhook.

### 2. Slack [2]

- Events API: duas opções de entrega — Socket Mode (websocket, sem endpoint público) ou endpoint HTTP público; são alternativas, não combináveis para o mesmo evento.
- Eventos vêm em JSON com envelope (`event_callback`), `team_id`, `event_id`, `event_time` e `authorizations`.
- Limite: até 30.000 eventos por workspace a cada 60 minutos; excedente gera eventos `app_rate_limited`.
- Resposta HTTP 2xx em até 3 segundos; falha gera 3 retentativas (imediata, 1 minuto, 5 minutos); manter taxa de sucesso de pelo menos 5% por 60 minutos ou as assinaturas são desativadas.
- Recomendação oficial: responder 200 rápido e processar em fila, não no mesmo processo.
- Permissões por escopos OAuth; eventos de bot e de workspace; Bolt for JavaScript e Bolt for Python são as bibliotecas oficiais (nota 09).

### 3. Telegram [3]

- Bot API com comandos, teclados, inline keyboards, menu button; deep linking com até 64 caracteres de parâmetro.
- Streaming replies: o bot pode mostrar rascunho da resposta enquanto gera (`sendMessageDraft`), com conteúdo rico; o usuário pode interromper, e o bot recebe atualização (`MessageGenerationStopped`) — permite cancelar o trabalho do modelo.
- Tópicos em chats privados (`createForumTopic`), mensagens efímeras em grupos (respostas privadas a botões inline).
- Business Bots (Secretary Mode): o dono da conta conecta o bot, que processa mensagens de entrada e responde dentro de direitos explícitos (`can_reply`, `can_read_messages`), com `business_connection_id`.
- Bots conversam com bots; há bots convidados (Guest Bots) e comunidades.
- Mini Apps (JavaScript dentro do Telegram), pagamentos via Telegram Stars, monetização com 50% de receita de anúncios no chat do bot.
- Sem menção a SDK oficial na documentação de features; a página incentiva que ferramentas de IA leiam a documentação.

### 4. Discord [4]

- Interações chegam por Gateway (evento `INTERACTION_CREATE`, websocket) ou por Interactions Endpoint URL público; as duas formas são mutuamente exclusivas.
- Resposta inicial obrigatória em 3 segundos; token de interação válido por 15 minutos; follow-ups por webhook (`/webhooks/<app_id>/<token>`), limitados a 5 por interação em apps instalados por usuário.
- Componentes, modais, autocomplete; `allowed_mentions` para controlar menções.

### 5. E-mail

- Protocolos padrão SMTP (RFC 5321) e IMAP4rev2 (RFC 9051), sem SDK de fornecedor — nota 09.

### 6. Microsoft Teams

- Bot Framework SDK arquivado, com suporte encerrado em dezembro de 2025; o sucessor é o Microsoft 365 Agents SDK (C#, JavaScript, Python) — nota 09.

## Interpretações

- **I1. Arquitetura de gateway mínima.** O que precisa de endpoint público: WhatsApp (webhook). O que funciona com conexão de saída: Telegram (polling), Discord (Gateway), Slack (Socket Mode). Consequência: o gateway em servidor pode ser mínimo — um endpoint HTTPS para o WhatsApp, mais retransmissão para o núcleo local. Se o usuário abrir mão do WhatsApp por um tempo, o sistema inteiro funciona atrás de NAT.
- **I2. Custo de canal é o custo do WhatsApp.** O Telegram, o Slack, o Discord e o e-mail não cobram por mensagem. O WhatsApp cobra template fora da janela de 24 h. Regra de desenho: só enviar WhatsApp quando há conversa aberta (grátis) ou com aprovação explícita de custo.
- **I3. Aprovação vive no núcleo, não no canal.** Todo canal entrega uma mensagem; o núcleo converte em evento de sessão, aplica política de aprovação e devolve a resposta pelo mesmo canal. Aprovar no WhatsApp (botão inline) e no Discord (componente) é possível, mas o registro de aprovação é do núcleo.
- **I4. Streaming por canal.** Telegram tem rascunho nativo; Slack e Discord têm edição de mensagem; WhatsApp não tem streaming — a resposta chega inteira. O protocolo de eventos deve expor "delta" e "final", e cada adaptador escolhe como apresentar.
- **I5. Eventos com ida e volta.** Slack e Discord exigem resposta rápida (3 segundos) e retentativas; o núcleo local pode estar offline. O gateway deve confirmar recebimento (200/202), enfileirar e entregar ao núcleo com idempotência por `event_id`/`interaction_id`, tratando duplicatas.
- **I6. Threading e identidade.** Cada canal tem identidade própria (usuário do Slack, usuário do Discord, chat do Telegram, número do WhatsApp). O modelo de sessão precisa de um identificador de canal + identificador externo + pessoa, com memória em cinco níveis resolvida no núcleo — não no canal.
- **I7. Escopo sem multiusuário, canais multiusuário.** O usuário é um só, mas os canais são ambientes de terceiros: outras pessoas podem falar no mesmo canal. Regra necessária: só processar mensagens endereçadas ao bot (comando, menção, DM), ignorar as demais. Isso é controv.
- **I8. Política de AI Providers do WhatsApp.** Antes de publicar, ler a política de 16/02/2026: ela pode restringir ou precificar o uso por provedores de IA — risco de conformidade para o próprio produto.

## Hipóteses e pontos não confirmados

- H1. Detalhes da política de "AI Providers" do WhatsApp: não lidos; apenas identificados.
- H2. Preços atuais de template por mercado (Brasil): as tabelas são links de CSV/PDF, não lidos.
- H3. Limites de taxa do Telegram e do Discord: não confirmados nesta rodada.
- H4. Se o Slack cobra por plano que restrinja Socket Mode: não confirmado.
- H5. Retenção e privacidade de mensagens por canal (quanto cada plataforma guarda e por quanto tempo): não pesquisada.
- H6. Suporte do WhatsApp a anexos e áudio no escopo do harness: não detalhado.
- H7. Viabilidade de Numerar/SO de clientes móveis como superfícies próprias de conversa: pendente da nota 09.

## Lacunas e conflitos

- A página do WhatsApp entrega taxas em arquivos externos; os valores concretos ficaram como lacuna.
- Discord: as duas formas de receber interações são mutuamente exclusivas — escolher Gateway evita endpoint público, mas exige processo com websocket ativo.
- Slack: Socket Mode evita endpoint público, mas a documentação recomenda não processar no mesmo request; exige fila.
- O e-mail como canal tem o problema de autenticação (DKIM, SPF) e reputação de domínio, não pesquisado.

## Recomendação preliminar

### Desenho do gateway

1. **Núcleo local** (TypeScript, nota 09) com clientes de saída: Telegram (polling), Discord (Gateway), Slack (Socket Mode), e-mail (SMTP/IMAP). Sem abrir portas.
2. **Gateway mínimo em servidor** para o que exige endpoint público: WhatsApp Cloud API (webhook) e, se escolhido, Slack por HTTP. Função única: receber, validar assinatura, enfileirar e encaminhar ao núcleo por conexão de saída do núcleo (polling ou websocket).
3. **Protocolo de eventos comum**: `{canal, externo_id, sessão_id, tipo, conteúdo, anexos, ts, idempotência}`. Tipos: mensagem, delta, final, aprovação_solicitada, aprovação_respondida, erro.
4. **Aprovação no núcleo**: qualquer canal pode pedir aprovação; a resposta volta pelo mesmo canal; o registro fica no núcleo, com auditoria (nota 08).
5. **Filtro de endereçamento**: só processa DM, comando, menção ou resposta direta; ignora o resto.
6. **Orçamento por canal**: mensagens enviadas contam no orçamento mensal; WhatsApp template exige aprovação de custo (regra do usuário).

### Interface CLI/TUI e Web UI (resumo; stack na nota 09)

- CLI/TUI: streaming, sessões, seleção de agente e modelo, aprovações e anexos. Comandos e teclas seguem o modelo do OpenCode (permissões por ferramenta, Plan/Build) — nota 01.
- Web UI: sessões, aprovações, upload e download; autenticação local (uso individual, sem multiusuário).
- Protocolo de eventos único alimentando as três superfícies, com aprovação renderizada conforme o canal.

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo)

| Canal | Custo de mensagem | Endpoint público necessário | Streaming nativo | Riqueza para agentes | SDK oficial |
|---|---|---|---|---|---|
| Telegram | Grátis | Não (polling) | Sim (rascunho) | Alta (tópicos, efêmeras, bots de negócio) | Não confirmado |
| Slack | Grátis (plano à parte) | Não (Socket Mode) | Por edição | Média | Sim (Bolt JS/Python) |
| Discord | Grátis | Não (Gateway) | Por edição | Média (componentes, modais) | Não confirmado |
| WhatsApp | Por mensagem de template | **Sim** | Não | Baixa | Não (API HTTP) |
| E-mail | Grátis | Não (SMTP/IMAP) | Não | Baixa | Protocolo padrão |
| Teams | Grátis (plano à parte) | Depende do SDK | Por edição | Média | Sim (M365 Agents SDK) |

Justificativas: Telegram oferece o conjunto mais completo para agentes sem custo por mensagem e sem endpoint público; WhatsApp é o único com custo por mensagem e obrigação de endpoint público, além da política de AI Providers; e-mail é universal, mas sem interação rica.

### Próximos passos (não executados)

1. Ler a política de AI Providers do WhatsApp e as tabelas de preço do Brasil.
2. Medir limites de taxa de Telegram e Discord.
3. Especificar o protocolo de eventos com idempotência e enfileiramento.
4. Decidir a aposta inicial de canais: começar por Telegram e CLI, deixar WhatsApp para quando houver gateway.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | Pricing on the WhatsApp Business Platform | Meta for Developers | https://developers.facebook.com/docs/whatsapp/pricing/ | 14/10/2026 |
| 2 | The Events API | Slack | https://docs.slack.dev/apis/events-api/ | 14/10/2026 |
| 3 | Telegram Bot Features | Telegram | https://core.telegram.org/bots/features | 14/10/2026 |
| 4 | Receiving and Responding to Interactions | Discord | https://docs.discord.com/developers/interactions/receiving-and-responding | 14/10/2026 |
| 5 | Bolt for JavaScript / Bolt for Python | Slack | https://docs.slack.dev/tools/bolt-js/ e /bolt-python/ | via nota 09 (13/10/2026) |
| 6 | Bot Framework SDK (archive notice) | Microsoft | https://github.com/microsoft/botframework-sdk | via nota 09 (13/10/2026) |
| 7 | Bot API | Telegram | https://core.telegram.org/bots/api | via nota 09 (13/10/2026) |
