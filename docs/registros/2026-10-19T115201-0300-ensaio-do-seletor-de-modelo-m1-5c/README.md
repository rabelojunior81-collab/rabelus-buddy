# Ensaio e checagem real: seletor de modelo e níveis de esforço (M1.5c)

**Classe:** REGISTRO · **Data:** 2026-10-19T11:52:01-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-51d166`) · **Para:** SPEC 0002, critérios 11, 13 e 29 (AGENTS §5.9)

## Níveis de esforço no mundo real

**Catálogo** (`models.list` no núcleo do Pai, só leitura, às 11:27): os provedores declaram oito níveis, conforme o modelo.

| Provedor | Modelos | Níveis declarados |
|---|---|---|
| ChatGPT | 8 | 6 de `low` a `ultra`; 2 (luna) até `max` |
| OpenCode Go | 37 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, conforme o modelo |
| Ollama Cloud | 22 | idem, conforme o modelo |
| OpenRouter | 469 | só `low`/`medium`/`high` |

**Chamada mínima ao ChatGPT** (`gpt-6.1-sol`, o provedor do núcleo com o login do Pai, fora do núcleo):

| Nível | Resultado |
|---|---|
| `xhigh` | aceito, 3,7 s |
| `max` | aceito, 3,7 s |
| `ultra` | **recusado**: 400 `invalid_value`, "Supported values are: none, minimal, low, medium, high, xhigh, max" |
| `none`, `minimal` | **recusados** com este modelo: 400 `unsupported_value` |

O `/models` do ChatGPT declara `ultra`, mas a API de respostas, que o Buddy usa, recusa.

## O que mudou por causa disso, cada coisa com teste antes

1. **O núcleo aceita os oito níveis.** O contrato e o dono aceitam todos. As APIs que recebem o esforço como texto o recebem como veio. As que recebem orçamento de pensamento seguem esta regra:
   - `none` desliga o pensamento, e `minimal` usa o menor orçamento;
   - acima de `high` o orçamento cresce;
   - no Messages, o teto é de 20.000, porque o SDK da Anthropic recusa, sem streaming, `max_tokens` acima de ~21.333.

   Os valores acima de `high` são HIPÓTESE nossa, com recuo garantido.
2. **Recusa do esforço reconhecida pelos códigos do ChatGPT real.** Com `invalid_value` e `unsupported_value`, a chamada agora se repete sem esforço. Antes, esses códigos não entravam no recuo, e a rota inteira seria recusada.
3. **Catálogo do ChatGPT só com o que a API de respostas aceita** (sem `ultra`). O catálogo ganhou versão: a cópia guardada de outra versão é montada de novo na hora, e a do Pai, de hoje, ainda tinha `ultra`.

## Ensaio do seletor no navegador real

- **Núcleo temporário:** pelo `bd serve`, com estado próprio, porta 47399 e as chaves do meu ambiente. O OpenCode Go respondeu 401 a essa chave; o núcleo do Pai usa as chaves dele, e trouxe 37 modelos às 11:27.
- **O que funcionou:**
  - Ctrl+K e o clique abrem o painel com o foco na busca;
  - as abas trazem a contagem;
  - a lista vem agrupada por lab, com as capacidades em ícones e o contexto;
  - a busca e os filtros somam;
  - ↑↓ e Enter escolhem, e a escolha vira a rota lembrada;
  - o esforço oferece só o que o modelo declara (os grátis testados não declaram, e a pílula some);
  - a tarefa foi para a rota escolhida (`openrouter/nvidia/nemotron-3.5-super-vl:free`).
- **Capturas:** [seletor, 1440 px](./m15c-1440-seletor.png), [filtros](./m15c-1440-filtros.png), [celular, 375 px](./m15c-375-seletor.png).

## Achados do ensaio, cada um com teste antes

1. **Provedor fora do catálogo sumia sem explicação.** Agora o seletor diz quem ficou de fora e por quê. Por exemplo: "ChatGPT: sem login · Ollama Cloud: sem chave · OpenCode Go: … 401".
2. **Limite de um modelo grátis bloqueava o OpenRouter inteiro.** O 429 de um modelo esgotava o provedor, e outro modelo grátis parou na hora. Agora, no OpenRouter como no Go, o limite comum é do modelo. "Sem saldo" (402) passou a valer para a conta toda, em todos os provedores.
3. **"Buddy null" nas pílulas.** O `replaceChildren` escreve `null` como texto.
4. **Abas do painel sumiam.** A faixa com rolagem própria encolhia a zero; agora só a lista rola.

## Limites

- **Execução com esforço extra pelo seletor:** não foi feita aqui. Os modelos grátis do OpenRouter não declaram esforço, e o ChatGPT não tem login neste núcleo temporário. O caminho do esforço está coberto pelos testes do núcleo e pela chamada direta ao ChatGPT acima.
- **Logotipo de lab:** o lab aparece por iniciais; o logotipo exigiria outra rota de arquivos.
- **Catálogo guardado por um dia:** depois de entrar num provedor, a lista dele aparece na próxima montagem.
