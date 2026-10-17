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
