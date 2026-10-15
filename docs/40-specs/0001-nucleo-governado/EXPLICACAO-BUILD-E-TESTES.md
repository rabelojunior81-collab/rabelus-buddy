# Build, testes e TypeScript — a explicação que o Pai pediu

**Classe:** CONTRATO (anexo da [SPEC 0001](./SPEC.md), decisão 8) · **Data:** 2026-10-15 · **Prova executada:** [registro](../../registros/2026-10-15T045242-0300-prova-typescript-sem-build/README.md)

## A pergunta

> "Até onde me consta, para executar os testes (que devem ser elaborados sem margem nem flexibilidade: se o teste reprovar, arruma o código, não afrouxa o teste), teria que ter o build, não?"

## A resposta curta

**Até pouco tempo, sim. Hoje, no Node 24.12+ e no 26, não.** O Node passou a executar arquivos `.ts` direto, de forma estável. Os testes rodam sem build.

Mas existe uma pegadinha: rodar sem build não é o mesmo que checar os tipos. Por isso a proposta tem **dois gates obrigatórios, não um**.

## O que o "build" fazia, e em que partes ele se divide

Num projeto TypeScript tradicional, o build (`tsc`) faz duas coisas de uma vez:

1. **Checa os tipos**, para pegar erros como passar texto onde se espera número.
2. **Gera JavaScript**, apagando os tipos para o Node conseguir executar.

Como o Node antigo não sabia ler `.ts`, sem o passo 2 não havia como rodar nada, nem os testes.

## O que mudou

Desde o Node 24.12 (e no 26), o Node faz o passo 2 sozinho, na hora de carregar o arquivo: troca as anotações de tipo por espaços em branco e executa. A documentação oficial marca isso como **estável** ([ficha](../../20-conhecimento/node-runtime.md)). Vale só para TypeScript "apagável", sem os recursos que exigem gerar código novo, como `enum`. O `tsconfig` proíbe esses recursos (`erasableSyntaxOnly`).

O passo 1 o Node **não faz**. A prova mostrou isso: um arquivo com erro de tipo rodou normalmente.

## Como fica, então, sem margem e sem flexibilidade

| Gate | Comando | Reprova quando | Onde roda |
|---|---|---|---|
| **Testes** | `node --test` nos arquivos `.ts`, sem build | qualquer teste falha (saída 1) | `npm test`, `bd post`, CI em 3 SOs × Node 24/26 |
| **Tipos** | `tsc --noEmit` em modo estrito | qualquer erro de tipo (saída 1) | `npm run typecheck`, `bd post`, CI |
| **Teste não se afrouxa** | `bd test-guard` | um PR remove asserção, apaga teste, reduz testes de um arquivo ou adiciona `skip`/`todo`/`only` | `bd post`, CI |

Os três são obrigatórios. Um PR só é mergeado com os três verdes. O terceiro é o que garante a sua regra "se o teste reprovar, arruma o código, não afrouxa o teste": não depende de eu me lembrar dela, porque a máquina reprova a tentativa.

## O que a prova mostrou ([registro](../../registros/2026-10-15T045242-0300-prova-typescript-sem-build/README.md))

1. Testes `.ts` rodaram direto no Node 26, **sem build**: 2 passaram.
2. Coloquei um bug no código: **1 teste reprovou** e o comando saiu com código 1, que é o que reprova a CI.
3. Um arquivo com erro de tipo **rodou mesmo assim**: o Node não checa tipos.
4. O `tsc --noEmit` **pegou o erro de tipo** e saiu com código 1. Ele também mostrou que precisa do `@types/node` para conhecer os módulos do Node.

## Por que não manter um build de qualquer forma

- **Menos uma etapa que pode divergir:** o que roda nos testes é exatamente o arquivo que está no repositório, não uma cópia gerada.
- **Erro aponta para a linha certa:** sem mapa de fonte para depurar.
- **Mais rápido:** cada `npm test` não precisa compilar antes.

## Onde ainda haverá build (e não é agora)

- **Publicação no npm (M5+):** quem instalar o pacote pode ter outro Node. Lá, o pacote publicado é JavaScript gerado. Isso é empacotamento, não condição para testar.
- **App Expo e Web (M5+):** o React Native e o navegador têm o próprio empacotador (Metro, Vite). Também é empacotamento.

## O que o Pai decide

- **A (recomendado):** TypeScript apagável executado direto pelo Node, com os três gates acima obrigatórios.
- **B:** TypeScript com build (`tsc` gerando JavaScript antes dos testes), com os mesmos três gates. Custa uma etapa a mais e duas cópias do código; não ganha nenhuma garantia a mais.
- **C:** JavaScript puro com tipos em comentários JSDoc, checados pelo mesmo `tsc --noEmit`. É o que as ferramentas `bd` usam hoje, sem tipos. Menos legível para o protocolo compartilhado com a Web e o app.
