# Ensaio: console sem token na URL (M1.5e)

**Classe:** REGISTRO · **Data:** 2026-10-20T02:05:09-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-d0610a`) · **Para:** SPEC 0002, critério 16 (AGENTS §5.9)

## Por quê

No ensaio de 2026-10-19, o token da console do Pai apareceu na saída da ferramenta de navegador, porque ia na URL (`?t=`). O Pai decidiu em 2026-10-20: o token entra uma vez e vira cookie, com teste antes.

## Como

- **Núcleo temporário:** iniciado pelo `bd serve` com o código da branch `feat/m1-console-sem-token-na-url`, com estado próprio e porta 47399; encerrado no fim. O núcleo do Pai não foi tocado.
- **Navegador:** o navegador in-app do Claude Code Desktop (regra do Pai de 2026-10-20), a 1440 e a 375 px.
- **Entrada:** um bilhete de uso único pedido ao núcleo pelo IPC (`console.ticket`), como faz o `rbuddy ui`.

## O que aconteceu

1. **Entrar:** o bilhete abriu a console e a resposta 303 voltou para `http://127.0.0.1:47399/`, sem nada no endereço. A própria ferramenta de navegador mascarou o bilhete na saída ([captura](./m15e-desktop-url-limpa.jpg)).
2. **Cookie:** `document.cookie` vazio na página (o cookie é `HttpOnly`); a marca carregou e a API respondeu 200 pelo cookie, com a conexão marcada como ativa.
3. **Recarregar:** a console continuou autenticada.
4. **Reusar o bilhete:** 401.
5. **Celular:** a 375 px, sem rolagem para os lados ([captura](./m15e-375.jpg)).

## O que os testes cobrem e o ensaio não

- POST de outra porta do 127.0.0.1 com o cookie (sem `Origin` exato ou sem JSON): 403, e nada chega ao núcleo. Coberto em `packages/core/test/console-cookie.test.ts`; um ataque real de outra origem não foi encenado no navegador.
- Bilhete vencido (60 s): coberto pelo relógio injetado no teste.

## Limites declarados

- **Cookie de sessão:** fechar o navegador apaga o cookie; para voltar, o atalho "Rabelus Buddy" (ou o `rbuddy ui`) abre um bilhete novo. Um endereço salvo sem credencial mostra o erro 401 em JSON, sem página de ajuda.
- **Mesmo site em todas as portas do 127.0.0.1:** o navegador manda o cookie para qualquer porta local. Por isso o POST pelo cookie exige a origem exata, e o cookie é derivado do token, não o próprio.
- **Endereço antigo com `?t=`:** continua funcionando uma vez: vira o cookie e volta para a URL limpa.
