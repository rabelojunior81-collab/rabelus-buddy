# Prova — TypeScript sem build: o que o Node executa e o que só o `tsc` pega

**Classe:** REGISTRO · **Data:** 2026-10-15T04:52:42-03:00 · **Por:** buddy-dev (sessão `claude-code-vs-code-3a6e29`) · **Para:** a pergunta do Pai sobre build e testes (SPEC 0001, decisão 8)

## Montagem

Três arquivos mínimos (guardados aqui com `.txt`):
- [`orcamento.ts.txt`](./orcamento.ts.txt): uma função `reservar(saldo, custoMax)` tipada;
- [`orcamento.test.ts.txt`](./orcamento.test.ts.txt): dois testes em `node:test`, um deles escrito para pegar o bug "esqueceu o teto";
- [`tipo-errado.ts.txt`](./tipo-errado.ts.txt): atribui o retorno `Reserva | null` a uma variável `number`, um erro de tipo.

Ambiente: Windows 11, Node v26.11.1, sem `node_modules` e sem nenhum passo de compilação.

## Resultado

| Passo | Comando | Resultado |
|---|---|---|
| 1. Testes com o código certo | `node --test orcamento.test.ts` | 2 pass, 0 fail, **saída 0** |
| 2. Mesmos testes com o bug (teto removido) | `node --test orcamento.test.ts` | 1 pass, **1 fail**, **saída 1** |
| 3. Arquivo com erro de tipo | `node tipo-errado.ts` | **rodou** e imprimiu `{ id: 'r1', usd: 3 }` |
| 4. Checagem de tipos | `tsc --noEmit --strict --erasableSyntaxOnly …` (TypeScript 7.0.2) | **TS2322** `Type 'Reserva \| null' is not assignable to type 'number'`, **saída 1**; também acusou a falta de `@types/node` para `node:test` |

O `tsc` do passo 4 rodou por `npx -y -p typescript@7.0.2`, que baixa o pacote para o cache do npm e o executa uma vez. Nada foi instalado no projeto.

## Leitura

- **CONFIRMADO:** o Node executa os testes `.ts` direto, sem build. Um teste que reprova faz o `node --test` sair com código 1, e é isso que reprova a CI.
- **CONFIRMADO:** o Node **não checa tipos**. Um erro de tipo roda como se nada fosse. Por isso o `tsc --noEmit` precisa ser um gate obrigatório e separado.
- **CONFIRMADO:** sem `@types/node`, o `tsc` não conhece os módulos do Node. Por isso ele é dependência de desenvolvimento.
