# Plano — Piloto de paralelismo com subagentes

**Estado:** concluído em 2026-10-20 (pedido do Pai em 2026-10-20; todas as sub-fases marcadas; encerrado no registro em 2026-10-25, quando o M2 virou o plano ativo) · **Dono:** buddy-dev, que corta as missões, revisa, integra e responde por elas · **Atualizado em:** 2026-10-20

## Objetivo

Trabalhar em paralelo com subagentes pequenos (Claude Haiku 5.5) sem perder a precisão nem a governança. Cada missão:
- tem escopo, custo e saída previsíveis;
- é fácil de desfazer;
- passa pela minha conferência antes de virar fato no repositório.

O piloto mede se isso entrega mais, e mais barato, do que eu fazendo tudo em sequência.

## Como uma missão é cortada

Uma missão boa cabe numa frase de objetivo e tem:
1. **Escopo fechado:** a lista de arquivos que pode tocar; todo o resto é proibido.
2. **Entrada pronta:** onde está o código e o que procurar (âncoras de texto), para o subagente não gastar tempo descobrindo.
3. **Teste antes:** o teste reprova, entra num commit, e só então vem o código, como no resto do projeto.
4. **Saída verificável:** commits locais e um resumo curto (hashes, arquivos, testes rodados). Pesquisa sai como relatório fora do repositório.
5. **Limite de esforço:** número de buscas ou comandos.
6. **Proibições explícitas:** sem push, sem `--no-verify`, sem afrouxar teste, sem mexer em documento vivo (STATUS, plano, MEMORY, validações). Documento vivo é meu, na integração.

## Como as threads se organizam

- **Pesquisa e varredura** rodam no próprio checkout, só leitura, com a saída na pasta de rascunho da sessão. Não mexem no git.
- **Código** roda num worktree isolado por missão, criado a partir da branch da sessão. A missão faz commits locais e nunca dá push.
- **Integração (eu):**
  1. leio o diff;
  2. rodo os testes da missão e a suíte inteira;
  3. resolvo conflitos entre missões (os catálogos de texto e a página da console são o ponto comum);
  4. trago os commits para uma branch de entrega;
  5. abro o PR e faço o merge pelo rito.

  Missão ruim se descarta inteira: o worktree some, e nada entrou no repositório.
- **Registro de integração gerado do git** (depois de errar duas vezes): para cada missão integrada, um registro com todos os commits dela, tirados de `git log --format=%h <base>..<branch da missão>`, e nunca de memória.
- **Barramento:** os subagentes trabalham dentro da minha sessão. A decisão, o disparo, o resultado e a conferência de cada missão entram no ledger por mim, no momento do fato.

## Ondas

### Onda 1 (2026-10-20, concluída): pesquisa e varredura, 4 em paralelo

| Missão | Saída | Medida | Conferência |
|---|---|---|---|
| W1 Varredura antes de tornar o repositório público | relatório | 116 mil tokens, 29 ferramentas, 2,5 min | **um achado falso:** "8 linhas de código com o e-mail pessoal" não existem; todo e-mail rastreado é o canal público de segurança. O resto conferiu |
| W2 Modos de permissão (Claude Code, Codex, OpenCode) | [ficha](../../20-conhecimento/modos-de-permissao-dos-agentes.md) | 109 mil tokens, 18 ferramentas, 2 min | fontes oficiais citadas; lacunas declaradas |
| W3 Opções dos harnesses no ACP | [ficha](../../20-conhecimento/acp-opcoes-de-sessao.md) | 111 mil tokens, 25 ferramentas, 2,4 min | achou uma falha real no nosso cliente (opções agrupadas ignoradas), conferida no código |
| W4 GitHub público e Pages | [ficha](../../20-conhecimento/github-repositorio-publico-e-pages.md) | 86 mil tokens, 21 ferramentas, 2 min | lacunas declaradas, para medir ao vivo |

**Lição da onda 1:** relatório de subagente é pista, não fato. Todo achado que vira decisão ou texto público é conferido por mim antes.

### Onda 2 (2026-10-20, concluída): correções, 4 worktrees em paralelo

| Missão | O que resolve | Medida | Conferência |
|---|---|---|---|
| A1 | Rever a negação da primeira execução de um harness (era definitiva) | 118 mil tokens, 44 ferramentas, 4,2 min | diff limpo; a negação antiga fica no histórico |
| A2 | O balão mostra quem falou (a fala do harness aparecia como "BUDDY") | 95 mil tokens, 26 ferramentas, 2,4 min | conferido no navegador |
| A3 | Fora da pasta, o harness pergunta ao Pai em vez de ser negado em silêncio; a tela diz quem negou | 118 mil tokens, 60 ferramentas, 5,5 min | conferido no navegador com o OpenCode real |
| A4 | A regra "explicar em texto" ganha mecanismo no `bd validacoes` | 106 mil tokens, 16 ferramentas, 2 min | **parou certo**: três testes antigos montavam pendências sem o campo novo; completei os dados de teste sem tocar asserção |

Integração: as quatro branches entraram sem conflito; 396 testes verdes; [ensaio no navegador](../../registros/2026-10-20T102150-0300-ensaio-das-correcoes-do-uso-real-do-pai-onda-2/README.md).

**Lições da onda 2:**
- **Os pacotes internos resolvem para o checkout principal.** Num worktree, eles apontam para o código antigo, e o teste roda o núcleo errado. A1 e A3 descobriram isso e montaram ligações por pacote. A receita da missão passa a trazer isso pronto.
- **Worktrees dentro do repositório.** O `git add -A` os pegou como repositórios embutidos, e o `bd surfaces` lia as cópias. O gancho barrou o commit; a pasta saiu do git e da varredura, com teste.
- **Missão que para diante de uma decisão é missão bem cortada.** A A4 parou em vez de afrouxar teste.

### Onda 3 (2026-10-20, à noite, concluída): 5 missões em paralelo

| Missão | O que resolve | Conferência |
|---|---|---|
| B1 | Tabelas, citação, linha e link seguro na conversa | **refeita**: o primeiro briefing mandava criar uma função que já existia; a missão parou antes de commitar, e o worktree dela foi removido pelo sistema; a segunda rodou com o briefing corrigido |
| B2 | Motivos em linguagem comum, sem o id da execução | reaproveitou o mapa de motivos que já existia |
| B3 | Aviso de silêncio do agente, com Parar | um desvio declarado: rodou `git push --dry-run` (sem envio), contra o briefing |
| B4 | Pílula atualiza depois da decisão no cartão | só por teste de texto; o comportamento entra no próximo ensaio com primeira execução |
| B5 | Página pública diário de bordo, pt e en | descartou uma captura com o caminho pessoal; QA a 375 px pelo buddy-dev |

Integração sem conflito; 419 testes verdes; [ensaio](../../registros/2026-10-20T212757-0300-ensaio-da-onda-3-voz-tabela-densidade-e-pagina/README.md). **Lição:** o briefing confere o código existente antes de mandar criar; e missão que para sem alterar perde o worktree (relançar, não retomar).

### Próximas (depois da decisão do Pai sobre a especificação)

- Sistema de permissões com modos e escopos (uma vez, sessão, projeto, sempre; modo sem perguntas).
- Opções do harness na tela (modelo, modo, esforço), a partir das opções de sessão do ACP.
- Landing page e publicação.

## Métricas do piloto

Por missão: tokens, ferramentas, duração, achados conferidos e achados falsos, retrabalho na integração. No fim, a retrospectiva compara com o mesmo trabalho em sequência.
