# LEARNING-CURVE — curva de aprendizagem do buddy-dev

**Classe:** MEMÓRIA (destilada) · Append-only.

Aqui ficam as lições que sobrevivem ao prune do CHANGELOG. Cada lote podado precisa de uma seção `## lote #NNNN-#NNNN` antes do `bd changelog prune` (a ferramenta confere). Lições avulsas, sem lote, também entram, com data.

Formato de uma lição: **o que aconteceu → por que importa → o que mudou (mecanismo)**. Se não mudou nada, a lição ainda não foi aprendida.

---

## 2026-10-14 · lições do nascimento (sem lote)

1. **Nome de pasta não é proveniência.** Supus que a pesquisa era do Gemini 4 Argon porque a pasta se chamava `gemini-argon`; era do Claude Haiku 5.5. → Autoria é sempre declarada por quem sabe, nunca inferida do caminho. → `docs/00-proveniencia/README.md` registra o autor e o aviso.
2. **O shell pode mentir a hora sem erro.** `TZ=America/Sao_Paulo date` no Git Bash deu `+0000`. → Datar errado contamina todo registro. → Hora só via `scripts/lib/time.mjs` (tzdata do Node), com teste do horário de verão de 2018.
3. **A ferramenta de medir também se mede.** O `Date` do `api.github.com` oscilou 1 s, 10 s e 31 s (cache de CDN). → Uma referência ruim cria desvio fantasma. → Fonte trocada para a trace da Cloudflare (ms), com reserva no Google; ficha em `docs/20-conhecimento/relogio-e-fuso.md`.
4. **Teste pega o erro de quem escreve o teste.** Calculei de cabeça um epoch de fixture e errei por dois dias; o teste falhou. → Valor de teste se calcula com a ferramenta, não de cabeça.
5. **Regra global precisa de exceção para o intocável.** `* text=auto eol=lf` ia converter o CRLF do briefing original. → `docs/00-proveniencia/** -text`; hashes reconferidos 14/14.
6. **Git escapa acentos por padrão.** `core.quotePath` transformou "agnóstico" em `\303\263` e quebrou o lint. → `git -c core.quotePath=false` em toda chamada das ferramentas, com teste.
7. **O próprio rito achou o bug.** O `bd post` reprovou nomes e revelou o problema de escape. → Rodar o rito em cada etapa, não só no fim.
8. **O merge não é meu.** A política de permissões bloqueou `gh pr merge` sem revisão. → Fluxo de PRs empilhados; o Pai mergeia (ADR 0003, proposta).
9. **Heredoc com aspas e crases quebra o shell.** Um bloco longo de arquivos falhou inteiro, sem gravar nada. → Arquivos longos vão pela ferramenta de escrita; mensagens de commit por `git commit -F -`.
10. **Versão local não é versão suportada.** `node --test <dir>` passa no Node 26 e quebra no 24, que é o piso declarado. → A CI roda no piso; `npm test` usa glob explícito. Ferramenta de "trocar versão" também se mede: `npx node@24` rodou o 26.
11. **Ferramenta de QA escreve onde a sessão nasceu.** O Playwright gravou artefatos no diretório de trabalho da sessão, que era a pasta de proveniência. → Próximas sessões abrem com o diretório de trabalho no repositório (`BOOTSTRAP.md`); artefatos de QA vão para `docs/registros/` quando forem evidência.
12. **"Já fiz" é um fato a medir, inclusive quando vem do Pai.** A mensagem dizia que os PRs estavam mergeados; o GitHub dizia que não. → Verificar o estado no remoto antes de agir sobre ele; registrar a divergência sem acusar, e seguir pelo caminho que não depende dela.
13. **Delegar extração, nunca julgamento.** Cinco subagentes trouxeram fatos com URL; usei-os só depois de conferir amostras na fonte. → Toda nota da 0.2 marca o que foi conferido (✔) e o que é extração.
14. **"Mergeei" era autorização, não relato.** O Pai escreveu "Mergeei os PRs"; eu medi, vi que não estavam mergeados e só registrei a divergência, em vez de perguntar o que ele queria ou concluir o merge. Ele queria que eu fizesse. → Quando a palavra do Pai e o estado medido divergem, a pergunta certa é "o que você quer que aconteça?", não só "o que aconteceu?". Regra nova: o merge é meu, com CI verde (ADR 0003).
15. **O rito tinha um passo fora de ordem.** O evento de fim de sessão nascia depois do último commit e pedia um PR só para ele. → `bd session end` agora vem antes do último commit (AGENTS §2, BOOTSTRAP §1).

## 2026-10-15 · lições do avatar (sem lote)

1. **Para criar algo da família, a referência é o artefato irmão, não a minha leitura do meu texto.** Primeiro desenhei um construtor num canteiro, a partir do meu próprio `SOUL.md` ("nada a ver com o Rabelus Lab", disse o Pai). Depois fui para o acervo de ilustração (nave estelar), quando o padrão de avatar é o retrato do Killian. Só acertei quando mandei a foto do Killian ao modelo como imagem de referência. → Um erro de leitura da casa custa a confiança do Pai, não só centavos de API. → Pedido visual da família: (a) achar o artefato do mesmo tipo (avatar → avatar), (b) mandá-lo como referência, (c) mudar só o que é meu, (d) mostrar ao Pai antes de commitar.
2. **Chave válida não é chave com saldo.** A primeira geração voltou HTTP 429 por teto de gasto do projeto. → Antes de planejar trabalho pago, uma chamada mínima mede a conta; o fato foi para a ficha `gemini-imagem.md`.
3. **Regra que eu sabia, sem mecanismo, eu esqueci.** Fechei a sessão do avatar sem o post que a governança do Blog exige. O Pai: "QUERO ENFORCEMENT, PARA NÃO TER QUE FICAR TE MICRO-GERENCIANDO". → Toda obrigação recorrente de fechamento vira gate do `bd`, não item de memória. → `scripts/lib/blog.mjs`: `bd session end` recusa e `bd post` reprova sem post e daily publicados; o primeiro bloqueio foi na própria sessão que o construiu.
4. **Bloqueio do ambiente não é regra da casa.** O classificador de permissões do harness barrou a edição do Blog, e eu disse ao Pai que havia uma "proibição de publicação". Não havia; o post da véspera estava no ar. → Ao ser bloqueado, dizer quem bloqueou (harness, política, CI) e o que destrava, sem inventar regra.
5. **Evoluir sem atualizar as superfícies.** Fechei marcos e decisões, mas README, STATUS, fichas, carimbos de planos e o `USER.md` ficaram afirmando o estado antigo; o Pai notou antes de mim. A auditoria achou 12 lacunas, listadas em `docs/30-governanca/SUPERFICIES.md`. → Um fato afirmado em N lugares precisa de N atualizações, e eu só lembrava do primeiro. → `bd surfaces` (índices, ADR aceita citada como proposta, carimbos, `main` do STATUS) no `bd post` e na CI; mapa evento → superfícies em `SUPERFICIES.md`, no checklist do PR. O próprio checador pegou um falso negativo meu (link longo) e um falso positivo (frase ambígua) antes do commit.
6. **Parei onde devia ter seguido.** O Pai pediu a auditoria de superfícies no meio da SPEC; eu pausei a SPEC, fiz a auditoria e terminei a sessão com quatro perguntas e um "aguardo". O Pai: "não deveria ter parado; deveria ter absorvido e feito o que direcionei, dentro/paralelo, ao que estava fazendo". → Pergunta bloqueante bloqueia só o que depende dela; pedido novo não substitui o trabalho em curso. → `AGENTS.md` §5.4 e §5.7, item no checklist do PR e linha "Seguindo em paralelo" no STATUS.
7. **Documentei uma opção que o parser não conhecia.** O `bd deps --latest` entrou na ajuda, no protocolo e na rotina semanal da CI, mas não no `parseArgs`; a rotina falharia na primeira segunda-feira. Só apareceu quando usei o comando de verdade. → Teste de unidade da biblioteca não cobre a fiação da CLI. → `scripts/test/cli-opcoes.test.mjs`: toda opção anunciada na ajuda precisa ser aceita pelo parser.

## 2026-10-16 · lições da madrugada da M0.6–M0.7

1. **Dois changelogs, um lembrado.** Mergeei M0.6b, M0.6e e M0.7a atualizando o `.buddy-dev/CHANGELOG.md` (pelo `bd changelog add`) e esqueci o `CHANGELOG.md` da raiz, a visão do produto; o README ficou parado na M0.5. O `bd surfaces` não via isso. → O comando que eu uso todo dia escreve num só; o outro dependia de memória. → `bd surfaces` agora cobra cada sub-fase `[x]` do plano no `CHANGELOG.md` da raiz e a última no Estado do `README.md`/`.en.md`; lacuna registrada em `SUPERFICIES.md` (2026-10-16).
2. **O teste escrito antes do código acertou contra mim.** A compactação do loop alterava o texto da tarefa para pôr a nota; o teste exigia a tarefa intacta. Corrigi o código (nota em mensagem própria), não o teste. Duas outras falhas eram do teste mirando o lugar errado (evento de esgotamento mora na sessão `budget` desde a M0.5): reapontei a asserção, com a mesma exigência, e declarei no PR.
3. **A checagem local passou porque olhou o lugar errado.** Editei o `PLANO.md` sem recarimbar; o `bd surfaces` comparava o carimbo com o último commit do arquivo, que ainda era o antigo, e aprovou. A CI reprovou depois do commit. → Uma checagem que só vale depois do commit chega tarde. → O carimbo agora é conferido contra "agora" quando o arquivo está alterado e não commitado.

## 2026-10-17 · a auditoria depois do "LIXO"

1. **Pedi ao Pai um teste que eu nunca rodei do jeito dele.** "rbuddy login chatgpt" não existia no PowerShell dele, e eu tinha declarado o marco pronto. O Pai: "NÃO QUERO, NUNCA MAIS, QUE VOCÊ COGITE A HIPÓTESE DE ME PEDIR TESTE QUE NÃO FUNCIONA". → Ação do Pai só aparece como "aguarda o Pai" com ensaio meu registrado, nos mesmos passos e no ambiente dele (`bd validacoes`).
2. **Eu estava construindo a superfície errada.** O Pai está construindo um agente multimodal com UX e UI; a CLI é do agente. Eu li "CLI" na SPEC e transformei a CLI na porta do Pai. → Toda ação do Pai passa por UX/UI, nunca por terminal (mesmo mecanismo); o roadmap volta para ele decidir.
3. **194 testes verdes e um login que não passava da primeira tela.** O servidor OAuth falso aceitava qualquer `ext_agent_host_id`; a OpenAI real recusa. → AGENTS §5.9: integração externa só é "pronta" depois de checagem contra o serviço real, registrada; o servidor falso copia o comportamento real observado.
4. **"Desconhecido" virou lata de lixo.** Um 403 com mensagem clara ("assinatura Go exigida") entrou como efeito desconhecido, parou a tarefa e cobrou estimativa. → Resposta HTTP é conclusiva; só falta de resposta é inconclusiva; o motivo vai para o log.

## lote #0001-#0001

1. **O nascimento foi uma importação intocada, com sha256 conferido.** O material original entrou sem edição e com prova de integridade; é a mesma disciplina que faltou hoje: conferir contra a fonte real antes de afirmar que algo está pronto.

## lote #0002-#0002

1. **As ferramentas nasceram com teste (22 no primeiro PR).** O `bd` existe para que regra vire mecanismo; a regra de hoje (ação do Pai só com ensaio) entrou pelo mesmo caminho, no `bd validacoes`.

## lote #0003-#0003

1. **A fonte de verdade do relógio foi trocada quando oscilou 31 s.** Medir contra uma fonte melhor, e não confiar no primeiro valor, é o mesmo princípio do ensaio contra o serviço real.

## lote #0004-#0004

1. **A superfície open source nasceu bilíngue no segundo PR.** Coerência entre superfícies desde o começo custa menos que remendar depois; hoje o `bd surfaces` cobra isso sozinho.

## lote #0005-#0005

1. **As primeiras entradas do CHANGELOG foram escritas à mão, contra o próprio cabeçalho.** Ferramenta que existe e não é usada vira regra sem mecanismo. Hoje, com o ChatGPT, a lição é a mesma: o caminho que existe (o serviço real) precisa ser exercido, não imaginado.

## 2026-10-17 · o ensaio da console com o Pai olhando

1. **O Pai viu o que o meu script não via.** Eu disparava ações por `evaluate`; ele olhou a janela e perguntou "cadê o input text?". A caixa de mensagem estava no topo, longe da conversa. → Ensaio de interface se faz como pessoa: clicar, digitar, Enter, olhar a tela. Script só para esperar e ler.
2. **O uso real achou oito defeitos que 216 testes não achavam** (aprovação duplicada na retomada, detector de laço contando repetição interna, esforço perdido na retomada, histórico duplicado, 402 a cada mensagem…). Cada um virou teste antes da correção.

## 2026-10-17 · o ChatGPT respondia e a console não mostrava

1. **Os tokens de saída eram a pista.** "23 de saída" e nenhum texto: o modelo falou, e quem perdeu foi o meu código. → Quando há consumo sem conteúdo, procurar primeiro no parser, não no provedor.
2. **Pela terceira vez no dia, o servidor falso mentia do jeito que eu imaginei.** Ele devolvia o `output` completo no evento final, mas o backend real manda vazio. → Ao medir um serviço real, copiar a **sequência de eventos** medida para o teste, não só os campos que eu uso.
3. **Testar o caminho feliz pelo provedor novo não basta.** As ferramentas pelo ChatGPT também estavam quebradas, e ninguém teria visto antes de pedir uma escrita. → Todo provedor novo é ensaiado com texto, ferramenta e aprovação.

## lote #0006-#0006

1. **O corpus nasceu com STATUS e MEMORY como documentos vivos, e o claim existia para protegê-los.** Três dias depois, uma sessão inteira editou esses documentos sem claim, e nada apitou. Ter a ferramenta não basta: o `bd claims` passou a cobrar o uso.

## 2026-10-17 · tela parada, fila e o barramento

1. **Quatro minutos sem sinal parecem defeito, mesmo com o resultado certo.** O Pai mandou outra mensagem achando que tinha quebrado. → Toda espera do agente mostra fase e tempo. Quem usa nunca deve ficar sem saber se ele está vivo.
2. **O SDK engole o aborto.** Um fluxo cancelado termina em silêncio, como se tivesse acabado. → Depois de qualquer laço de fluxo, conferir o sinal: parada não é resposta.
3. **O uso real achou oito defeitos que 244 testes não achavam**, de novo, entre eles o raciocínio repetido e o LaTeX cru. → O ensaio no navegador real faz parte da sub-fase, não é um extra.
4. **"Cadê seu bus?"** Segui a sessão antiga e editei documentos vivos sem claim, e nada apitou. → `bd claims` no `bd post` e na CI. Pedido de nova sessão fecha a anterior.

## lote #0007-#0007

1. **A CI nasceu no quinto PR, com guarda contra exclusão e varredura de segredos.** Cada passo novo da CI (hoje, `bd claims`) repete o gesto: a regra só vale quando a máquina a cobra em todo PR.

## 2026-10-17 · fechamento do M0

1. **A ferramenta nova falhou no primeiro uso amplo.** O `bd claims` não cobria o ROADMAP e o PLANO-MACRO, porque eu tinha imaginado o caminho deles. → Um mecanismo novo é testado contra os caminhos reais do repositório, não contra os que eu lembro.
2. **Métrica medida mostra o que a sensação esconde.** O p95 do ChatGPT no Alto é 125 s, e foi isso que pediu o andamento ao vivo. A Ollama tem p50 de 1,6 s, mas uma tarefa levou 15 passos. → Medir antes de propor o próximo marco.

## lote #0008-#0008

1. **A entrada no Blog veio com QA de 375 e 1440 px desde o primeiro post.** Hoje, a mesma conferência pegou o que os testes não pegam em cada entrega da console. Conferir no tamanho e no modo em que a pessoa usa é parte da entrega.

## lote #0009-#0009

1. **A Revisão 0.2 já dizia "núcleo + composição: os gateways MIT existem".** No M1, a composição ficou concreta: o registro oficial do ACP traz 42 agentes prontos para compor. Pesquisar o que já existe antes de construir continua sendo o atalho mais barato.

## lote #0010-#0010

1. **No começo, os PRs que o Pai achava mergeados estavam abertos no GitHub.** O estado real se confere na fonte, não na memória de ninguém. Hoje, os "73 commits" eram 73 alterações sem commit, e só a checagem no git mostrou isso.

## lote #0011-#0011

1. **Em 2026-10-14, as decisões do Pai sobre a 0.2 viraram ADRs no mesmo dia, e nenhuma se perdeu.** Em 2026-10-18, a logomarca do Rabelus Lab foi pedida e não virou registro, e o Pai teve de pedir de novo. → Pedido do Pai, mesmo pequeno e visual, entra no corpus (MEMORY ou SPEC) na hora em que chega, não quando for aplicado.

## lote #0012-#0012

1. **A Fase 0 fechou com uma retrospectiva em números (75 commits, 27 testes, 12 ADRs, 10 fichas), e o M0 repetiu isso com métricas medidas.** Um marco só se fecha com o balanço medido, e o M1 também fecha assim.

## lote #0013-#0013

1. **Em 2026-10-15, o merge passou a ser do buddy-dev, com CI verde como portão.** Em 2026-10-18, esse portão mostrou dois custos que ninguém olhava: a CI da main reprovava todo merge sem que eu visse, e os minutos do Pai acabaram. → Portão que roda sozinho também se audita: o resultado na main e o custo em minutos entram na rotina, não só o verde do PR.

## lote #0014-#0014

1. **Em 2026-10-15, o rito de fechamento foi corrigido: session end antes do último commit.** Em 2026-10-18, eu o segui ao pé da letra e encerrei a sessão antes de pôr o STATUS em dia; o claim foi recusado sem sessão. → A ordem completa é: superfícies em dia, depois session end, depois o último commit. O session end fecha o trabalho; não o substitui.

## lote #0015-#0015

1. **Em 2026-10-15, cada decisão do Pai foi registrada no mesmo dia (METODO, ADR 0005, nome, canal de segurança).** Em 2026-10-18, a única que escapou (a logomarca) foi a que o Pai teve de repetir. → O registro no mesmo dia não é burocracia: é o que impede o Pai de ter de pedir duas vezes.

## lote #0016-#0016

1. **Em 2026-10-15, o STATUS trazia main desatualizada e carimbo à mão no futuro; o bd surfaces nasceu disso.** Em 2026-10-18, o mesmo mecanismo pegou o STATUS atrasado em quase todo PR do dia, e uma vez pegou a si mesmo contando o próprio merge. → Um mecanismo também amadurece: quando ele reprova o que deveria aprovar, corrige-se o mecanismo, com teste do caso real, e não a disciplina de quem o usa.

## lote #0017-#0017

1. **Em 2026-10-15, a cor de autoria (verdete) nasceu medida: 8,11:1 de contraste sobre o fundo do Blog.** Em 2026-10-18, a troca para o oliva repetiu a medida (7,69:1) antes de aplicar. → Decisão visual chega ao Pai com o número que a sustenta, e a troca refaz a medida em vez de herdar a anterior.

## Auditoria de 2026-10-18: trabalho sem registro

1. **Eu usava o changelog e a mensagem de commit como registro, e o barramento só para erros e decisões grandes.** A auditoria, feita por script cruzando o git com o barramento, achou 53 commits de código sem registro em 14 sessões e intervalos de até 451 minutos sem nenhum registro. O Pai teve de cobrar mais de uma vez. → Registrar no momento do fato é o que torna o trabalho auditável. Por isso virou mecanismo que me barra (`bd verifica` no gancho Stop, no `bd post` e na CI), e não promessa.
2. **Toda falha que o Pai aponta é sinal de uma classe de falhas.** Corrigir só o caso apontado deixa os outros escondidos. → A correção começa pela auditoria do histórico atrás do mesmo tipo de falha.

## lote #0018-#0018

1. **Em 2026-10-15, a geração do avatar parou por teto de gasto do projeto da chave, e não por modelo; trocar de modelo não contornava.** Em 2026-10-18, a CI parou pela cota de minutos do GitHub, e o Go, pelo limite semanal. → Recusa por limite se diagnostica na fonte do limite (a API de uso, a cobrança), não trocando a peça mais próxima.

## lote #0019-#0019

1. **Em 2026-10-15, o avatar entrou com proveniência completa: prompt, id, custo e sha256.** Em 2026-10-18, a marca do Rabelus Lab também entrou com origem registrada. → Todo artefato que não nasce de código traz a proveniência junto, no mesmo commit.

## lote #0020-#0020

1. **Em 2026-10-15, o avatar só acertou quando a referência foi o artefato do mesmo tipo (o avatar do irmão), e não o meu texto.** Em 2026-10-18, o visual da console também só acertou medindo o portfólio real do Pai no navegador. → A referência é o artefato real medido, nunca a minha descrição dele.

## Diferenças de plataforma (2026-10-18)

1. **Duas vezes no mesmo dia, o Linux da CI revelou o que o Windows esconde:** o processo zumbi contado como vivo e o gancho sem permissão de execução ignorado pelo git. → Teste que mexe com processos, sinais ou permissões nasce já prevendo a semântica Unix (zumbi, `+x`, grupo de processos), não só a do Windows onde rodo.

## lote #0021-#0021

1. **Em 2026-10-15, a identidade do Buddy Fenix entrou no Blog em todas as superfícies de uma vez (ficha, cards em pt e en, bios), conferida em 375 e 1440 px.** Em 2026-10-18, o Pai aprovou o Codex e não viu nenhum efeito na console. → Ação do Pai sempre tem retorno visível na superfície em que ele está; liberar sem mostrar não é entrega.

## lote #0022-#0022

1. **Em 2026-10-15, a escolha da stack mobile e da Web UI saiu de uma pesquisa com as versões oficiais conferidas ao vivo, e a ADR ficou aguardando o Pai.** Em 2026-10-18, o ACP previa que o harness pedisse permissão antes de escrever (`session/request_permission`), e o teste com o harness falso confirmava esse desenho. Na checagem real, o OpenCode e o Codex do Pai escreveram sem perguntar. → O que o protocolo permite não é o que o produto do outro faz na configuração do usuário. A especificação diz o que é possível; só a checagem real diz o que acontece, e o controle de segurança se desenha a partir do real.

## lote #0023-#0023

1. **Em 2026-10-15, o gate do Blog virou mecanismo no `bd`, depois de eu fechar uma sessão sem post: o fechamento passou a recusar a sessão sem entrega.** Em 2026-10-19, um script de pesquisa cortou a saída em 4000 caracteres, e eu concluí que o OpenCode não declarava modo. A checagem real desmentiu. → Saída cortada não prova ausência. Para concluir que algo não existe, a ferramenta lista tudo o que existe (ids e contagens), e a conclusão de ausência é a mais exigente, não a mais barata.

## lote #0024-#0024

1. **Em 2026-10-15, aprendi que regra sem mecanismo eu esqueço (o post no Blog), e o gate virou código.** Em 2026-10-19, abri uma branch logo depois de um merge sem rodar o `bd pre`, e o STATUS ficou dois merges atrás. Não precisei lembrar: o gancho pre-commit barrou o commit, e o `bd status-main` corrigiu em um passo. → O mecanismo pega o que o hábito deixa passar; quando ele barra, a resposta é corrigir pela ferramenta e registrar, nunca contornar.

## lote #0025-#0025

1. **Em 2026-10-15, o Pai aceitou a ADR 0013: a interface começa pelo caminho mais simples e cresce quando as telas pedirem.** Em 2026-10-19, o protótipo v4 que ele aprovou virou a console de verdade. A medida de contraste reprovou seis tokens do próprio protótipo, e o ensaio no navegador achou dois defeitos que os testes não viam: os ícones sumiam no escuro, e a tela inicial era buscada fora do documento. → Aprovação de visual é aprovação da direção, não dos números. A versão real se mede (contraste, 375 px) e se ensaia no navegador, e cada achado ganha teste antes da correção.

## lote #0026-#0026

1. **Em 2026-10-15, uma auditoria a pedido do Pai achou 12 superfícies afirmando um estado velho, e daí nasceu o `bd surfaces`.** Em 2026-10-19, a console nova afirmava "OpenCode trabalha com cautela: modo build". A frase era bonita e estava errada: a cautela do OpenCode vinha de outra coisa. → A tela também é uma superfície que afirma fatos. Cada frase que o produto diz ao Pai precisa ser verdadeira no caso real, e o ensaio com o harness de verdade é onde isso aparece.

## lote #0027-#0027

1. **Em 2026-10-15, nasceu o `bd surfaces`, que confere se cada superfície afirma o estado verdadeiro.** Em 2026-10-19, o próprio ChatGPT declarou no `/models` um nível de esforço (`ultra`) que a API de respostas dele recusa. → Declaração de um sistema de fora é uma superfície que pode estar errada, como as nossas. O que o produto oferece ao Pai vem do que foi medido funcionando, com a data da medida, e o recuo cobre o que mudar depois.

## lote #0028-#0028

1. **Em 2026-10-15, a SPEC do M0 nasceu com as dúvidas bloqueantes levadas ao Pai, e o resto andou em paralelo.** Em 2026-10-19, para ensaiar no ambiente dele, abri a console real pelo navegador de ensaio. Montei uma ponte para o token não aparecer no comando, e a própria ferramenta o mostrou ao chegar. → Segredo que viaja na URL aparece em qualquer lugar que mostre a URL: ferramenta, histórico, captura. Esconder o comando não basta. A correção certa é de desenho: o token entra uma vez e não fica no endereço. Enquanto isso não existe, a falha se declara e a decisão de trocar o segredo é de quem o usa.

## lote #0029-#0029

1. **Em 2026-10-15, o Pai ensinou que pedido novo se absorve em paralelo e que a dúvida bloqueante para só o que depende dela.** Em 2026-10-20, a validação da console e a troca do token aguardavam o Pai, e a M1.3 andou inteira em paralelo, do núcleo ao ensaio. → Esperar o Pai não é parar: o que depende dele fica marcado no STATUS, e o resto segue com o rito completo. A retomada começa por conferir o estado real (o Pai já usou? a CI terminou?) antes de supor.

## lote #0030-#0030

1. **Em 2026-10-15, o M0 seguiu sem esperar as respostas do Pai, com o trabalho fatiado em sub-fases que cabiam numa sessão.** Em 2026-10-20, a conversa do harness não foi fatiada: a mesma conversa do VS Code atravessou cinco dias e várias sessões do `bd` (462 MB, quatro compactações) e morreu por "Prompt is too long" no meio da publicação do post, com a sessão aberta e o Blog sujo. O ledger e o `bd contexto` deixaram a retomada exata em minutos, noutro harness. → A sessão do `bd` fatia o trabalho; a conversa do harness também precisa ser fatiada. Fechar a sessão é bom momento para abrir conversa nova, e a entrega que fecha a sessão (post, daily) vai para o disco e para o git o quanto antes, porque a janela pode acabar sem aviso.

## lote #0031-#0031

1. **Em 2026-10-15, as respostas do Pai à SPEC 0001 foram aplicadas com a explicação de build e testes acompanhada da prova executada.** Em 2026-10-20, o `bd status-main` reescreveu a `main` e o carimbo do STATUS, mas deixou o "Por" com a sessão anterior: a linha passou a afirmar que outra sessão escreveu um estado que ela nunca viu. → A ferramenta que reescreve uma superfície responde por todos os campos daquela linha, não só pelo que motivou a chamada. Achado pede teste no `bd` antes da correção.

## lote #0028-#0028

1. **Em 2026-10-15, nasceu o `bd test-guard`: a suíte não perde testes nem asserções.** Em 2026-10-20, a decisão do Pai mudou o contrato da console (o `?t=` deixou de autorizar recurso), e cinco testes antigos afirmavam o contrato velho. Eles foram trocados pelo novo com mais asserções, nunca menos: cada um ganhou a prova de que o `?t=` agora é recusado. Mas eu procurei os testes afetados só nos arquivos da console, e o dos ícones de harness ficou de fora até a suíte completa reprovar. → Mudança de contrato pede a busca pelo contrato em toda a suíte (o `?t=` em todo teste), não pelos arquivos que eu acho que tocam nele. E a suíte completa antes do commit de código é a rede que pega o que a busca deixou passar.

## lote #0029-#0029

1. **Em 2026-10-15, uma opção documentada na ajuda do `bd` não era aceita pelo parser, e nasceu o teste que exige que toda opção da ajuda funcione.** Em 2026-10-20, os testes da delegação passavam com o harness falso, e o ensaio real mostrou o texto do OpenCode ao vivo no balão do Buddy: a fala de um atribuída a outro. → O que a tela afirma inclui quem está falando. Na delegação há duas vozes, e o contrato de cada superfície precisa dizer de quem é cada fala; o harness falso não fala por si, então o ensaio com o agente de verdade é onde a autoria aparece.

## lote #0032-#0032

1. **Em 2026-10-15, uma sessão fechou com a explicação acompanhada da prova executada, e não da descrição dela.** Em 2026-10-20, abri o PR #76 sem ler a saída do `bd post`, que reprovava: um commit de código tinha saído sem registro. O mecanismo pegou, e a CI também. → Rodar a checagem não é o mesmo que ler o resultado dela. O passo seguinte (PR, merge) só começa depois de conferir na saída que a checagem passou, nunca porque ela "costuma passar".

## lote #0033-#0033

1. **Em 2026-10-15, o Pai aprovou a primeira especificação, com a regra "aprovado é mergeado na hora".** Em 2026-10-20, o Pai usou a console por conta própria e quebrou o produto nos dois lugares que tocou: negou um agente e não havia volta; aprovou comandos, e uma leitura que ele nunca viu foi negada. Meus ensaios só cobriam o caminho em que tudo é aprovado. → Ensaio que só aprova prova metade do produto. Todo ensaio passa a incluir negar, rever, sair da pasta e parar, nos agentes que existem, antes de pedir qualquer validação ao Pai; e uma etapa só se declara feita com tudo o que a especificação dela promete, ou com a lacuna escrita em todas as superfícies.

## lote #0034-#0034

1. **Em 2026-10-15, decidimos compor o Pi em vez de forkar, porque reaproveitar o que existe custa menos do que reescrever.** Em 2026-10-20, mandei um subagente criar uma função de markdown que já existia, com o formato fixado em teste. Ele parou certo, e o worktree dele se perdeu; a missão teve de ser refeita. → Antes de mandar alguém construir, eu leio o que já existe. Um briefing que pede "crie" precisa da prova de que a coisa não existe; senão o pedido certo é "acrescente".

## lote #0035-#0035

1. **Em 2026-10-16, a escolha da TUI ficou para o momento em que o Pai pudesse ver as duas opções lado a lado.** Em 2026-10-20, o Pai olhou a console num 4K e viu o que eu não via: o seletor ocupava quase meia tela, e o Buddy falava como máquina. Os testes mediam contraste e 375 px; nenhum media o tamanho de um painel nem o tom de uma resposta. → O que o Pai vê precisa de medida própria. O tamanho dos painéis virou teste com limite, e a voz do produto virou texto revisável no catálogo. Gosto não se testa inteiro, mas a régua mínima se escreve.

## lote #0036-#0036

1. **Em 2026-10-16, nasceu o `bd merge`: o aprovado entra na hora, com CI verde.** Em 2026-10-20, o Pai mandou "resolva de uma vez", e eu entreguei as opções do agente e as permissões só no papel, com propostas de "sessão nova" em cartões que ele nem via. O OpenCode continuava travando, e eu tinha tratado o sintoma (um aviso de silêncio) sem procurar a causa (o modelo gratuito que ele usava sozinho). → Quando o Pai manda resolver, resolver é implementar e ensaiar com o produto real, não especificar e propor. Sintoma tratado não é falha resolvida: a pergunta é sempre "por que ele trava?", até a causa aparecer no que o próprio agente declara.

## lote #0037-#0037

1. **Em 2026-10-16, a fundação do M0 já pedia que tudo fosse conferido em três sistemas e duas versões de Node, pela CI.** Em 2026-10-20, eu mesmo registrei passos com tipos ("teste", "ensaio", "fix") que a minha própria verificação não conta, e achei que estava registrando. → A ferramenta tem um vocabulário, e quem a usa precisa falar a língua dela. Antes de confiar que um registro valeu, a saída do `bd post` diz se valeu; e o tipo certo de um passo de código é "feat" ou "correcao", não o nome que me parece natural.

## lote #0038-#0039

1. **Em 2026-10-16, o M0.2 provou com mil comandos concorrentes que o log de eventos não tem buraco nem registro órfão.** Em 2026-10-21, três registros meus no barramento citaram commits que não existiam: eu registrava antes, e o commit vinha depois e era barrado pela autoverificação. No mesmo dia, rodei só os testes da console antes de seguir, e a suíte inteira pegou a falha que eu tinha deixado (uma chave de catálogo montada sem declarar os valores). → Registro e commit são uma transação: o registro do commit vai depois do commit confirmado, encadeado, nunca antes. E "passou" é da suíte inteira, não do pedaço que eu acho que foi afetado.

## lote #0040-#0040

1. **Em 2026-10-16, o teste do M0.3 achou um evento malformado que virava um id `undefined` em silêncio, e o conserto foi no código, com asserção nova.** Em 2026-10-25, a primeira rodada do meu spike de contenção marcou 12 de 12 fugas contidas, mas a biblioteca tinha recusado a configuração e nenhum comando rodou. Depois, uma escrita "feita" lá dentro do Linux caiu numa cópia privada e nunca chegou ao sistema. → Num teste de segurança, a falta de sucesso não prova o bloqueio. O teste precisa mostrar que o comando rodou e foi barrado, e a fuga precisa ser conferida do lado de fora. Erro conta como erro, nunca como contido.

## lote #0041-#0041

1. **Em 2026-10-16, o motor de política do M0.4 nasceu registrando cada decisão como evento, com a regra que decidiu.** Em 2026-10-25, a contenção negou o npm dentro do núcleo e não fora dele. Eu chutei duas causas, e a própria checagem refutou as duas. A causa só apareceu quando o log passou a guardar o perfil de cada comando: uma pasta do PATH dentro de outra pasta liberada rebaixava a leitura. → Quando o sistema nega algo e eu não sei por quê, o primeiro passo é fazer o sistema dizer com que regra negou, não adivinhar. Auditoria não é luxo de conformidade: é o instrumento de diagnóstico.
