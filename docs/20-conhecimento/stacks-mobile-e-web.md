# Stacks para mobile (iOS, Android) e Web UI

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-15T03:55:01-03:00 · **Estado:** vigente (reverificar antes do spike do M5; as versões mudam a cada trimestre)

## O que importa para o buddy

- O núcleo do Rabelus Buddy é TypeScript/Node, e o mobile é um **cliente fino** do núcleo (ROADMAP, M5). Uma stack em TypeScript permite compartilhar com ele os tipos do protocolo, o cliente, o estado e o catálogo de i18n.
- **Expo (React Native)** é o único caminho maduro que dá UI nativa em iOS e Android **e** Web com a mesma linguagem do núcleo.
- **Flutter** e **Compose Multiplatform** são nativos e maduros no mobile, mas fora do TypeScript. Na web, um não serve para conteúdo de texto e o outro está em Beta.
- **Capacitor** e **Tauri** embrulham uma Web UI em WebView: são baratos, mas não são nativos.

## Fatos verificados

| Fato | Fonte | Verificado em |
|---|---|---|
| Expo SDK mais recente: **57.0.0**, com React Native 0.86, React 19.2.3, React Native Web 0.21.0, Node mínimo 22.13.x | https://docs.expo.dev/versions/latest/ (tier 0) | 2026-10-15 |
| Saem três SDKs do Expo por ano; cada um mira uma versão do React Native | https://docs.expo.dev/versions/latest/ (tier 0) | 2026-10-15 |
| React Native estável mais recente: **0.87** | https://reactnative.dev/versions (tier 0) | 2026-10-15 |
| Expo na web: sites React com renderização estática (SEO) ou no cliente; React Native for Web traduz `<View>`/`<Text>` para o DOM; dá para usar React DOM direto; roteamento por arquivo com Expo Router; `npx expo export --platform web` | https://docs.expo.dev/workflow/web/ (tier 0) | 2026-10-15 |
| Flutter: a documentação reflete o **3.47** (rodapé de 2026-05-20). A tabela de versões carrega por JavaScript e não foi lida; versão do Dart não verificada | https://docs.flutter.dev/release/archive (tier 0) | 2026-10-15 |
| Flutter web: "not suitable for static websites with text-rich flow-based content"; a saída "doesn't align with what search engines need"; serve para PWA, SPA e apps móveis existentes | https://docs.flutter.dev/platform-integration/web/faq (tier 0) | 2026-10-15 |
| Kotlin/Compose Multiplatform: Android, iOS e desktop **Stable**; web em Kotlin/Wasm **Beta** (página atualizada em 2025-09-10) | https://kotlinlang.org/docs/multiplatform/supported-platforms.html (tier 0) | 2026-10-15 |
| Compose Multiplatform mais recente: **1.12.1** (22 de setembro); 1.13 em alpha | https://github.com/JetBrains/compose-multiplatform/releases (tier 1) | 2026-10-15 |
| Capacitor: **8.5.3** estável (2026-10-07); 9.0.0-alpha.8 (2026-10-07) | https://github.com/ionic-team/capacitor/releases (tier 1) | 2026-10-15 |
| Tauri: **2.12.4** estável e 3.0.0-alpha.5, ambos de 14 de outubro; a 2.12.4 corrige pânico de plugin mobile que derrubava o processo no iOS e no Android | https://github.com/tauri-apps/tauri/releases (tier 1) | 2026-10-15 |
| Web Push no iOS: só para web apps na Tela de Início, desde o iOS 16.4 | https://webkit.org/?p=13878 (tier 0) | 2026-10-15 |
| No iOS 26, um site adicionado à Tela de Início abre como web app por padrão, mesmo sem manifest | heise.de/-10749652 (tier 3) | 2026-10-15 |

**Não verificado (pista, tier 4):** a situação dos PWAs instalados na União Europeia (as fontes se contradizem); o Declarative Web Push como requisito do iOS 18.4+; o Capacitor 9 previsto para o fim de novembro de 2026; o CocoaPods trunk somente leitura em 2026-12-02.

## Explicação

São três famílias de stack:

1. **UI nativa a partir de uma linguagem compartilhada.** React Native (com Expo) desenha componentes nativos do iOS e do Android a partir de TypeScript/React. Compose Multiplatform faz o mesmo a partir de Kotlin. É a família que entrega "seamless e nativo".
2. **Motor de desenho próprio.** O Flutter pinta cada pixel com o próprio motor. Dá aparência idêntica em todo lugar e é excelente no mobile; na web, o produto é um canvas, ruim para texto, busca e acessibilidade de documento.
3. **WebView embrulhada.** Capacitor e Tauri pegam uma Web UI e a colocam num app nativo, com plugins para câmera, push e outras APIs. Um código só, mas o toque e a rolagem são da web.

Escrever em Swift (SwiftUI) e Kotlin (Jetpack Compose) separadamente, mais uma Web UI, é o melhor nativo possível. São três bases de código.

## Implicações

- Com o núcleo em TypeScript, a família 1 em **React Native/Expo** tem custo de integração menor: um pacote de cliente compartilhado (tipos do protocolo, estado, i18n) serve à CLI, à Web UI e ao app.
- Push no iOS sem app nativo exige que o usuário instale o PWA na Tela de Início. Isso é atrito para um produto que vai notificar aprovações (ADR 0009). App nativo resolve.
- Decisão: [ADR 0013](../60-decisoes/0013-stack-mobile-e-web.md), aceita pelo Pai em 2026-10-15 (começar por A, chegar em B).

## Histórico de verificações

- 2026-10-15T03:55:01-03:00 · buddy-dev (claude-code-vs-code-14f5bb) · criação da ficha
