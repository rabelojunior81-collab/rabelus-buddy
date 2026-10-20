# Plano — Piloto de paralelismo com subagentes

**Estado:** em execução (pedido do Pai em 2026-10-20) · **Dono:** buddy-dev, que corta as missões, revisa, integra e responde por elas · **Atualizado em:** 2026-10-20

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

### Onda 2 (2026-10-20, em execução): correções, 4 worktrees em paralelo

| Missão | O que resolve |
|---|---|
| A1 | Rever a negação da primeira execução de um harness (hoje é definitiva) |
| A2 | O balão da conversa mostra quem falou (hoje a fala do harness aparece como "BUDDY") |
| A3 | Fora da pasta de trabalho, o harness pergunta ao Pai em vez de ser negado em silêncio; a tela diz quem negou e por quê |
| A4 | A regra "explicar em texto" ganha mecanismo: pendência do Pai sem explicação em linguagem comum reprova |

### Próximas (depois da decisão do Pai sobre a especificação)

- Sistema de permissões com modos e escopos (uma vez, sessão, projeto, sempre; modo sem perguntas).
- Opções do harness na tela (modelo, modo, esforço), a partir das opções de sessão do ACP.
- Landing page e publicação.

## Métricas do piloto

Por missão: tokens, ferramentas, duração, achados conferidos e achados falsos, retrabalho na integração. No fim, a retrospectiva compara com o mesmo trabalho em sequência.
