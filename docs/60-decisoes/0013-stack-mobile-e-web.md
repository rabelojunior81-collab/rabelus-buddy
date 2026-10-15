---
status: aceita (2026-10-15)
date: 2026-10-15
decision-makers: Pai (Adilson Rabelo Junior)
consulted: buddy-dev (Buddy Fenix)
---

# Stack do app mobile (iOS e Android nativos) e da Web UI responsiva

## Contexto e problema

O Pai pediu (2026-10-15) que eu extrapolasse os cenários para um porte **seamless e nativo** em iOS e Android, mais uma **Web UI responsiva** para layouts móveis. Pelo ROADMAP, o mobile é um cliente fino do núcleo no M5+, e o núcleo é TypeScript/Node com um processo dono do banco (M0). Os clientes (CLI, Web, mobile, desktop) falam com ele pelo mesmo protocolo. As plataformas pedidas no BRAINSTORM são Windows, macOS, Linux, navegador, Android e iOS, com componentes compartilhados entre a Web UI e o desktop.

Os fatos estão em [`stacks-mobile-e-web.md`](../20-conhecimento/stacks-mobile-e-web.md), verificados em 2026-10-15.

## Critérios

1. UI nativa de verdade em iOS e Android (gestos, rolagem, teclado, acessibilidade do sistema).
2. Web UI responsiva, boa no celular e no desktop.
3. Compartilhar com o núcleo TypeScript os tipos do protocolo, o cliente, o estado e o i18n (ADR 0002).
4. Push nativo para pedir aprovação (ADR 0009) sem exigir instalação de PWA.
5. Custo de manutenção para um time de um humano e agentes, com orçamento de US$ 50 por mês (ADR 0008).
6. Licença aberta compatível com Apache-2.0 (ADR 0001).

## Opções consideradas

* **A. Expo (React Native) universal**: um app TypeScript para iOS, Android e Web (Expo Router; React Native Web ou React DOM na web)
* **B. Monorepo TypeScript**: Expo para iOS e Android, mais uma Web UI separada em React DOM, compartilhando um pacote de cliente
* **C. Web UI + Capacitor**: uma Web UI responsiva embrulhada em WebView para iOS e Android
* **D. Flutter**: Dart, um código para mobile e web
* **E. Kotlin/Compose Multiplatform**: Kotlin, um código para mobile, desktop e web
* **F. Nativo puro**: SwiftUI + Jetpack Compose + Web UI separada

## Matriz

| Critério | A. Expo universal | B. Expo + Web React | C. Capacitor | D. Flutter | E. Compose MP | F. Nativo puro |
|---|---|---|---|---|---|---|
| 1. Nativo iOS/Android | sim | sim | não (WebView) | quase (motor próprio) | sim | o melhor |
| 2. Web responsiva | boa para app; limitada para telas densas | a melhor | a melhor | fraca para texto e SEO | Beta (Wasm) | a melhor |
| 3. TypeScript com o núcleo | total | total | total | não (Dart) | não (Kotlin) | só na web |
| 4. Push nativo | sim | sim | sim (plugin) | sim | sim | sim |
| 5. Custo de manter | 1 código | 1 código + 1 web, com pacote comum | 1 código | 1 código, outra linguagem | 1 código, outra linguagem | 3 códigos |
| 6. Licença | MIT | MIT | MIT | BSD-3 | Apache-2.0 | proprietária (SDKs) + aberta |

As licenças da linha 6 vêm do meu conhecimento, não da verificação de hoje: **a verificar** no spike, antes de virar premissa.

## Decisão

**Aceita pelo Pai em 2026-10-15:** "Seguimos com sua sugestão, começando por A e depois, chegando em B."

### A recomendação aceita

Recomendo **B, começando por A**:

1. **Começar com um app Expo universal (A)** sobre um pacote compartilhado `@rabelus-buddy/client`: tipos do protocolo, cliente do núcleo, estado e catálogo de i18n. Ele já entrega iOS e Android nativos e uma Web responsiva para o celular.
2. **Separar a Web UI em React DOM (B)** só quando as telas densas de desktop pedirem: observabilidade, edição de memória, revisão de diffs. Ela reaproveita o mesmo pacote de cliente, e o desktop (Tauri ou Electron, a decidir no M5) a embrulha.

Por quê: é a única família que é nativa no mobile e TypeScript de ponta a ponta. Encaixa no núcleo sem uma segunda linguagem e mantém um código só até haver motivo medido para dois. Flutter e Compose são ótimos, mas pedem uma segunda linguagem e uma segunda implementação do protocolo. Capacitor seria o mais barato, mas não é "nativo", e esse foi o pedido.

**Antes de virar código:** um spike no início do M5, com SPEC própria, reverifica as versões e mede os critérios 1, 2 e 4 num protótipo (tela de aprovação com push em iPhone e Android reais, mais a mesma tela na web em 375 e 1440 px).

### Consequências

* Bom, porque um só TypeScript cobre núcleo, CLI, Web e mobile
* Bom, porque o push nativo resolve aprovações sem depender de PWA instalado
* Ruim, porque o React Native Web tem limites em telas densas; mitigado pela saída B
* Ruim, porque publicar nas lojas exige conta Apple Developer e Google Play (custo e processo; a medir antes do M5)
* Neutro, porque o mobile continua no M5+: nada disso adianta o M0
