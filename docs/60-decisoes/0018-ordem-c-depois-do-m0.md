---
status: aceita (2026-10-17)
date: 2026-10-17
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Ordem dos marcos depois do M0: console como produto, multimodal cedo (opção C)

## Contexto e problema

O M0 fechou em 2026-10-17, validado pelo Pai pela console ([retrospectiva](../registros/2026-10-17T193756-0300-retrospectiva-do-m0-e-proposta-de-roadmap/README.md)). O adendo do ROADMAP de 2026-10-17 prometia propor, no fechamento, o novo lugar da interface de produto. Para o Pai, o produto é "um agente multimodal com UX e UI". O M0 mostrou que a superfície é onde aparecem os defeitos que importam: cada ensaio no navegador real achou o que a suíte deixava passar.

## Opções consideradas

* **A.** Manter a ordem (M1 ACP → M2 isolamento → M3 memória → M4 canais → M5 superfícies)
* **B.** Interface de produto primeiro (ADR 0013) e multimodal no M1; ACP no M2
* **C.** A console continua sendo o produto: M1 ACP + multimodal de entrada na console; M2 isolamento; M3 interface de produto nascida da console, com voz; M4 memória e identidade; M5 canais; M6+ o resto

## Decisão

Opção escolhida: **C**, por decisão do Pai ("Vamos prosseguir, com a ordem recomendada 'C'"), com estas referências e direções dele:

1. **Orquestração e integração "seamless", sem configuração, como o AionUi** ([ficha](../20-conhecimento/acp-registro-e-orquestradores.md)). O Rabelus Buddy é, por padrão, o **orquestrador**:
   - identifica sozinho os outros harnesses instalados e os mostra com ícone e nome;
   - fala com eles por ACP;
   - a autenticação de cada um é do próprio agente.

   A fonte do catálogo é o **registro oficial do ACP**, não uma lista mantida à mão.
2. **Arquitetura e escolhas do T3** ([ficha](../20-conhecimento/t3-referencias.md)): os três axiomas (resolver problemas, sangrar com responsabilidade, tipagem não é opcional) valem desde o M1, com contrato tipado entre a console e o núcleo. **A pilha do T3** (Next.js, tRPC, Tailwind) é candidata para a interface de produto do M3. A ADR 0013 (Expo universal) é reavaliada lá, com as duas lado a lado, porque o create-t3-app está parado desde dezembro de 2025.
3. **Direção visual do t3.chat**, com a paleta **rosa e roxo trocada por verde-oliva e derivados**, **glassmorphism**, e ergonomia relida e perseguida ao máximo: layout, hierarquia, pílulas, caixa de mensagem ancorada e painel flutuante.
4. **TUI:** uma sessão com o Pai, no fim do M1, para explorar as diferenças visuais (`ink` × `pi-tui`, ADR 0016) e decidir.

### Consequências

* Bom, porque a direção do Pai (multimodal, com UI) chega já no próximo marco, sem trocar de pilha, e cada marco continua se provando na console.
* Bom, porque o catálogo oficial do ACP dá ícone, nome, licença e jeito de iniciar de dezenas de agentes, sem lista nossa para manter.
* Ruim, porque memória e canais ficam um marco mais longe.
* Ruim, porque o ACP traz uma dependência nova (`@agentclientprotocol/sdk`, com `zod` como par), que segue o protocolo de dependências e a aprovação do Pai.

## Mais informações

ROADMAP e PLANO-MACRO reorganizados no mesmo PR. A validação `roadmap-pos-m0` foi encerrada com esta decisão.
