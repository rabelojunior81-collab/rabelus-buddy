# Ensaio do M1.0: contrato tipado da console

**Classe:** REGISTRO · **Data:** 2026-10-18T12:34:49-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-d6ff5c`) · **Para:** SPEC 0002, critério 10

## O que mudou

Cada método que a console pode chamar ganhou um esquema estrito (zod). O núcleo confere a entrada antes de executar e recusa com HTTP 400 (código -32602) em três casos:
- **campo desconhecido**;
- **tipo errado**;
- **valor fora da lista**.

A recusa vem com uma mensagem em português ("parâmetros de agent.run: task: obrigatório"), que nunca ecoa o valor recebido, e nada entra no log. Uma varredura garante que nenhum método da lista fica sem esquema e que cada chamada literal da página cabe no esquema do seu método.

## Testes (antes do código)

`packages/core/test/contrato.test.ts`: 4 testes. Suíte completa: 254/254 em 2026-10-18.

## Ensaio no navegador, como pessoa (1707×769)

O ensaio usou um núcleo temporário, numa pasta própria, com um provedor falso que pede para gravar um arquivo e depois responde. O núcleo real do Pai, ativo desde 01:35, não foi tocado.

| Fluxo | Parâmetros que passam pelo contrato | Resultado |
|---|---|---|
| Tarefa com esforço Alto e provedor ollama-cloud/glm-5.3 | `agent.run` com `session`, `task`, `workspace`, `interactive`, `effort`, `route` | o núcleo gravou `effort: high` e a rota escolhida |
| Segunda mensagem durante a execução | `agent.run` → fila | "Na fila", com Direcionar e Cancelar ([m10-02](./m10-02-fila.png)) |
| Direcionar agora | `agent.steer` com `session` e `queue` | a fila saiu e o pedido de gravação apareceu ([m10-03](./m10-03-aprovacao-depois-de-direcionar.png)) |
| Aprovar | `approval.resolve` com `id` e `decision` | resposta "Pronto, resposta 2." na conversa ([m10-04](./m10-04-resposta-e-chave.png)) |
| Guardar e remover a chave | `keys.set` e `keys.remove` | "Chave removida."; a chave não voltou à página |
| Parar e retomar pela lista | `agent.stop` e `agent.resume` com `run`, `workspace` e `interactive` | parada; retomada voltou a rodar |

Em todo o ensaio, nenhuma mensagem de parâmetro inválido apareceu e o console do navegador não registrou erros.

## O que o ensaio achou

- **No meu ensaio (corrigido):** a primeira versão do provedor falso respondia de forma assíncrona. O servidor falso dos testes não espera respostas assíncronas, então devolveu JSON comum a um pedido em fluxo ([m10-01](./m10-01-provedor-falso-sem-fluxo.png)). Usei o espaçamento entre pedaços que ele oferece.
- **Observação real, em aberto:** naquele caso, o adaptador não achou nenhum pedaço e a execução terminou como **"concluída", com resposta vazia e 0 tokens**, sem aviso na tela. Um provedor real que responda assim deixaria o Pai sem resposta e sem explicação. A pendência está no plano do M1 (M1.1), com teste antes da correção.
