---
status: aceita (2026-10-17)
date: 2026-10-17
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Console web local, servida pelo núcleo, como superfície do Pai no M0

## Contexto e problema

Em 2026-10-17 o buddy-dev fechou a M0.7 e pediu ao Pai que testasse por CLI (`rbuddy login chatgpt`). No PowerShell dele o comando nem existia, e a auditoria que veio depois achou o login do ChatGPT quebrado na OpenAI real ([registro](../registros/2026-10-17T083800-0300-auditoria-real-depois-da-falha-no-shell-do-pai/README.md)). O Pai deixou o rumo explícito:

> "EU NÃO ESTOU CONSTRUINDO UM CLI.. ESTOU CONSTRUINDO UM AGENTE MULTIMODAL.. COM UX E UI, DIVERSOS, PARA NÃO PRECISAR DE CLI.. ISSO, FICA PARA O PROPRIO AGENTE"

A SPEC 0001 previa a demonstração do M0 pela CLI (critério 26), e o ROADMAP punha Web UI, desktop e mobile no M5+ ([ADR 0013](./0013-stack-mobile-e-web.md) para a stack). Não havia superfície onde o Pai pudesse testar sem terminal.

## Opções consideradas

* **A.** Console web simples, servida localmente pelo próprio núcleo, antes de fechar o M0; a demonstração acontece nela; depois, revisão do roadmap para trazer as interfaces para antes
* **B.** Reorganizar o roadmap inteiro primeiro, sem superfície até o plano novo ser aprovado
* **C.** O buddy-dev conduz a demonstração e o Pai só acompanha por um relatório; interface depois

## Decisão

Opção escolhida: **A**, por decisão do Pai ("Aprovo a solução proposta em 'A'"; "Gostei da sua solução paliativa").

1. **O núcleo serve a console** em `127.0.0.1`, sem dependência nova (HTML, CSS e JavaScript simples, `node:http`). Ela é paliativa: **não substitui** a ADR 0013 (Expo universal, depois Web React DOM), que continua sendo a stack das interfaces de produto.
2. **Pela console o Pai faz tudo o que antes pedia terminal:**
   - escrever a tarefa e escolher o esforço de raciocínio e a rota;
   - acompanhar os passos ao vivo e continuar a conversa;
   - aprovar ou negar ações;
   - ver o consumo por janela;
   - guardar chaves de API (que nunca voltam ao navegador);
   - entrar e sair do ChatGPT;
   - retomar uma execução interrompida.
3. **Segurança local:** só `127.0.0.1`; toda requisição exige o token da console e o cabeçalho `Host` exato (contra DNS rebinding e contra páginas de terceiros); o token fica num arquivo só do dono.
4. **Abrir sem terminal:** um atalho de duplo clique sobe o núcleo, se preciso, e abre a console no navegador.
5. **A CLI continua** como interface do próprio agente e das ferramentas de desenvolvimento, nunca como superfície de teste do Pai (regra de 2026-10-17, conferida pelo `bd validacoes`).
6. **O plano do M0 é revisado** ([plano](../50-planos/m0/PLANO.md)): a M0.8 constrói a console e o que ela exige do núcleo; a M0.9 faz a demonstração e aglutina os testes reais que só a console viabiliza.

## Consequências

* Bom: o Pai testa o agente sem terminal, e o M0 termina com uma superfície de verdade.
* Bom: interação, esforço, aprovações, troca de provedor, login do ChatGPT e retomada viram testes reais do Pai, não só testes com servidor falso.
* Ruim: a console é código a manter até as interfaces da ADR 0013 a substituírem. Mitigação: sem dependência e sem build, e a mesma API do núcleo servirá às interfaces definitivas.
* O ROADMAP ganha um adendo: a primeira interface de produto vem antes do M5.

## Confirmação

Critérios 26–30 da [SPEC 0001](../40-specs/0001-nucleo-governado/SPEC.md) (rev. 5); ensaio registrado de cada ação do Pai antes de ela aparecer como "aguarda o Pai".
