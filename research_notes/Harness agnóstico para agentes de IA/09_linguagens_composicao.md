# 09 — Linguagens, frameworks, UI desktop/mobile e composição

**Data de referência:** 13/10/2026. **Acesso às fontes:** 13/10/2026, salvo indicação. Fontes marcadas "(busca)" foram lidas só pelo trecho devolvido pela busca; as demais foram lidas por fetch da página.
**Premissas usadas:** núcleo local com gateway em servidor; desenvolvedor individual; ambiente Windows; orçamento de US$ 50/mês; sem multiusuário nem tenants; 4 GB de RAM; sem GPU. O Buzz entra só como dado comparativo.

## Resumo

- **SDKs oficiais.** Anthropic, OpenAI e Google oferecem SDKs oficiais em Python, TypeScript/JavaScript, Go e Java [1][2][3]. Anthropic também tem C#, PHP e Ruby; OpenAI tem .NET e Ruby [1][2]. Rust não aparece entre os SDKs de provedores, mas aparece nos SDKs oficiais de MCP (Tier 1), ACP e A2A [4][5][7].
- **Canais.** Slack tem Bolt oficial em JavaScript e Python [12][13]. O Bot Framework SDK, do Microsoft Teams, teve o suporte encerrado em dezembro de 2025; o substituto é o Microsoft 365 Agents SDK (C#, JavaScript, Python) [20]. Não encontrei SDK oficial para WhatsApp, Telegram ou Discord [11][14][15][16].
- **Recomendação preliminar.** TypeScript em Node.js LTS para núcleo, UI e adaptadores de canal. Rust apenas no processo Core do Tauri. Plugins podem ser escritos em qualquer linguagem, em processo separado, falando protocolo (MCP, ACP, A2A). Composição híbrida.
- **Desktop.** Tauri 2 e Electron reaproveitam componentes React da Web UI; Flutter não. Não encontrei benchmark primário reprodutível de memória: as fontes secundárias divergem muito [63]–[68].
- **Assinatura Windows é bloqueio a decidir.** Pela documentação oficial, o Artifact Signing (antigo Trusted Signing) não cobre o Brasil, nem para organizações nem para pessoas físicas [60].
- **Lojas.** Apple: US$ 99/ano [54]; desde 28/04/2026, uploads exigem Xcode 26 e SDK do iOS 26 [56]; a diretriz 2.5.2 proíbe baixar ou executar código que altere funcionalidades [55]. Google Play: taxa única de US$ 25 [57]; contas pessoais criadas após 13/11/2023 precisam de teste fechado com 12 testers por 14 dias [58]; a partir de 31/08/2026, novos apps e atualizações devem mirar Android 16 (API 36) ou superior [59].
- **Composição.** Híbrida: monólito modular em TypeScript no núcleo local; processos separados para o shell desktop, os runners de plugins e o gateway de canais no servidor; contratos em OpenAPI 3.2.1 e JSON Schema 2020-12 [34][35].

## Fatos verificados

### 1. SDKs oficiais de provedores e de agentes
- Anthropic: SDKs oficiais de cliente para Python, TypeScript, C#, Go, Java, PHP e Ruby, além da CLI `ant` [1]. O Claude Agent SDK é "programável em Python e TypeScript" [37].
- OpenAI: SDKs oficiais para JavaScript/TypeScript, Python, .NET, Java, Go e Ruby, além de CLI e Agents SDK [2]. O Agents SDK em Python é descrito como "lightweight" e "production-ready upgrade" de versão experimental anterior [38]. O repositório `openai-agents-js` tem licença MIT [39].
- Google: Gen AI SDK oficial para Python, JavaScript/TypeScript, Go e Java; as bibliotecas legadas foram descontinuadas em 30/11/2025 [3]. O menu da documentação lista "Interactions breaking changes (May 2026)" [3].
- Google ADK: linguagens Python, JavaScript/TypeScript (ADK TypeScript 2.0 GA), Go, Java e Kotlin [40].

### 2. Protocolos de agentes (MCP, ACP, A2A)
- MCP: SDKs oficiais por tier. Tier 1: TypeScript, Python, C#, Go, Rust e Ruby. Tier 2: Java. Tier 3: Swift, PHP e Kotlin [4]. A documentação indica a versão 2026-07-28 como latest [4]. Transportes padronizados: stdio (mensagens delimitadas por nova linha, trocadas com um subprocesso iniciado pelo cliente) e Streamable HTTP [78].
- ACP: bibliotecas oficiais para Kotlin, Java, Python, Rust e TypeScript [5]. O menu marca o protocolo v1 como "Latest" e a v2 como "Draft" [5]. As mensagens seguem JSON-RPC 2.0, com métodos (request-response) e notificações [6].
- A2A: especificação "Latest Released Version 1.0.0"; anteriores 0.3.0, 0.2.6 e 0.1.0 [8]. SDKs em Python, Go, Java, JavaScript, .NET e Rust [7]. Bindings: JSON-RPC (§9), gRPC (§10) e HTTP (§11) [8]. O cabeçalho `A2A-Version` identifica a versão; versão não suportada gera `VersionNotSupportedError` [8]. Licença Apache-2.0; originado no Google e doado à Linux Foundation [7].

### 3. SDKs de canais
- Slack: Bolt for JavaScript [12] e Bolt for Python [13] têm documentação oficial. Bolt for Java: a URL testada retornou 404 (não confirmado).
- Microsoft Teams: o Bot Framework SDK está arquivado, com suporte LTS encerrado em dezembro de 2025; o Microsoft 365 Agents SDK está GA em C#, JavaScript e Python [20]. O Teams SDK é o sucessor do Bot Framework para agentes específicos do Teams [21] (busca).
- Microsoft 365 Agents SDK, versões mínimas: C# com .NET 8.0 SDK, JavaScript com Node.js 18+, Python de 3.9 a 3.11 [17]. O guia de migração diz Node.js 20+ [19] (busca) e Python 3.10+, com 3.11+ recomendado [18] (busca). Conflito, ver Lacunas.
- WhatsApp: a Meta informa que SDKs de terceiros, como o PyWa (Python), "não são mantidos ou endossados pela Meta" [11].
- Telegram: Bot API 10.1 (11/06/2026), 10.2 (14/07/2026) e 10.3 (24/08/2026) [15]. Bot API e FAQ não citam bibliotecas oficiais; a busca por "librar", "SDK" e "third-party" não retornou menções [15][16].
- Discord: a página oficial "Community Resources" lista bibliotecas de terceiros, como nextcord e pycord (Python), discordrb (Ruby) e Serenity (Rust) [14].
- E-mail: protocolos padrão SMTP (RFC 5321) [41] e IMAP4rev2 (RFC 9051) [42]. Não exigem SDK de fornecedor.

### 4. Bibliotecas de CLI e TUI (licença verificada; maturidade não medida)
- Python: Typer (MIT) [71]; Textual (MIT) [70].
- Node.js: Commander (MIT) [72]; Ink (MIT) [73].
- Go: Cobra (Apache-2.0) [74]; Bubble Tea (MIT) [75].
- Rust: clap (MIT, arquivo LICENSE-MIT) [76]; Ratatui (MIT) [77].

### 5. Runtime, isolamento, memória e distribuição
- Node.js SEA (binário único): "Stability: 1.1 - Active development" [22].
- Node.js Permission Model: "Stability: 2 - Stable", desde v23.5.0 e v22.13.0. Quando iniciado com `--permission`, restringe acesso ao sistema de arquivos, à rede, à criação de processos, a worker_threads, addons, WASI, FFI e ao inspector [23].
- Node.js `vm`: "is not a security mechanism. Do not use it to run untrusted code." [24].
- Node.js releases: v26 aparece como Current e v24 como LTS na tabela oficial; a partir do Node.js 27, o ciclo passa a ser anual [25].
- Node.js CLI: existem `--max-old-space-size` e `--max-old-space-size-percentage` [26]. O valor padrão não foi confirmado nesta página.
- Go: limite de memória flexível via GOMEMLIMIT ou `SetMemoryLimit`, desde Go 1.19 [27]. Instalação oficial documentada para Windows [28].
- Rust: target `x86_64-pc-windows-msvc` (Windows 10+) aparece entre os targets Tier 1, descritos como "guaranteed to work" [29]. O mapeamento linha a linha foi inferido do layout do extrato.
- Python: documentação oficial para Windows inclui o "embeddable package", pensado para embedding, e pacotes NuGet [30]. PyInstaller gera executável único com `--onefile` [31].
- OpenTelemetry: documentação de SDKs por linguagem (Go, Java, JavaScript, Python, Ruby, Rust, Swift e outras) [33]. A página de status mostra estágios diferentes por linguagem e sinal (Stable, Beta, Development, Release candidate) [32]; extração parcial.

### 6. UI desktop
- Tauri 2: há um processo Core (entry point) e processos WebView. "It also routes all Inter-Process Communication through the Core process" [43].
- Tauri, pré-requisitos: no Windows, "Desktop development with C++" e WebView2, já instalado no Windows 10 a partir da versão 1803 [44]. Para iOS é preciso Xcode no macOS; frameworks JavaScript exigem Node.js; a documentação inclui alvos Android e iOS [44].
- Tauri sidecar: permite empacotar binários de qualquer linguagem, como CLI Python, servidores de API ou Node [47].
- Tauri updater: atualizações precisam de assinatura, com chave privada configurada no ambiente de build; suporta JSON estático e servidor dinâmico [48].
- Tauri Windows: a assinatura é necessária para a Microsoft Store e para evitar o aviso do SmartScreen em downloads pelo navegador [45].
- Tauri macOS: a assinatura exige conta Apple Developer, paga (US$ 99/ano) ou gratuita (só para teste e desenvolvimento) [46]. A notarização aparece como requisito, em trecho truncado [46].
- Tauri App Size: lista otimizações de build (perfil de release, strip, panic) e não traz números de tamanho nem de memória [49].
- Electron: processo main (entry point, que controla o ciclo de vida e as janelas) e processos renderer, análogos aos do Chrome [50]. Suporte oficial às três últimas versões estáveis [52]. O guia de code signing cobre Windows e macOS e afirma que ambos impedem a execução de apps não assinados, com ressalvas em trecho truncado [51].
- Flutter: guias oficiais de build para Windows, macOS e Linux [53]; a navegação oficial também tem seções de Android e iOS [79].
- Memória (detalhes em Lacunas e conflitos):
  - O benchmark antigo da Tauri usa `time -v` (max RSS) [63]. A issue #5889 cita esse benchmark, que mostrava Electron com ~500 MB no Linux, cerca de 2x o Tauri [64].
  - A mesma issue: USS/PSS no Ubuntu, Electron 118/207 MB e Tauri 125/185 MB; Tauri com WebView2 ficou perto do Electron, ambos baseados em Chromium [64].
  - Zenn, 15/08/2026 (secundária, código gerado com IA): pico de memória Electron 543,4 MB, Tauri 336,0 MB, Slint 124,4 MB [65].
  - johal.in, 30/04/2026 (secundária): ocioso, Tauri 42 MB e Electron 187 MB; bundle, ~5 MB e ~150 MB [66].
  - Journal KDI, 10/04/2026 (secundária): instalador cerca de 99% menor e até 10x menos RAM ociosa, em um app Next.js [67].

### 7. Mobile e lojas
- Apple Developer Program: US$ 99 por ano [54].
- Apple App Review 2.5.2: apps devem ser autocontidos e não podem "download, install, or execute code which introduces or changes features or functionality" (trecho truncado) [55].
- Apple: desde 28/04/2026, apps enviados ao App Store Connect devem ser feitos com Xcode 26 ou superior e SDK do iOS 26 (ou equivalentes para tvOS, visionOS e watchOS 26) [56]. Desde 09/09/2026, o alvo mínimo é iOS 13 [56].
- Google Play: taxa de registro de US$ 25, paga uma vez [57].
- Google Play, contas pessoais criadas após 13/11/2023: teste fechado com ao menos 12 testers em opt-in contínuo por 14 dias antes de pedir acesso à produção [58]. A redução de 20 para 12 tem data divergente entre fontes (ver Lacunas).
- Google Play: a partir de 31/08/2026, novos apps e atualizações devem mirar Android 16 (API level 36) ou superior, exceto Wear OS e Android Automotive OS [59].
- Google (busca): contas de "limited distribution" não têm taxa e permitem distribuição a até 20 dispositivos; "full distribution" tem taxa única de US$ 25; estudantes e hobbyistas podem criar conta limitada [62]. Não li a página inteira.

### 8. Assinatura
- Artifact Signing (antigo Trusted Signing), certificados Public Trust: organizações nos EUA, Canadá, UE, Reino Unido, Austrália, Nova Zelândia, Japão, Coreia do Sul, Singapura, Suíça, Noruega e Israel; pessoas físicas precisam estar nos EUA ou no Canadá [60]. O Brasil não consta da lista [60].
- Artifact Signing não aceita assinatura gratuita, de teste ou patrocinada; exige assinatura Azure paga (pay-as-you-go ou enterprise) [61] (busca).
- Relato de usuário em issue do GitHub (secundária): a renovação da validação de identidade pode ser negada a quem não atende aos requisitos atuais [80] (busca).

### 9. Contratos e geração de clientes
- OpenAPI: versão 3.2.1, datada de 10/09/2026 [34]. A especificação tem seção de versões e deprecação [34].
- JSON Schema: versão atual 2020-12; anterior 2019-09 [35].
- Protobuf: documentação de Editions e guias de código gerado para C++, C#, Dart, Go, Java, Objective-C, PHP, Python e Ruby (lista parcial do menu) [36].
- A2A oferece gRPC como um de seus bindings oficiais [8].

### 10. Buzz (dado comparativo, não avaliado aqui)
- Licença Apache-2.0; workspace Rust. O Quick start pede Docker e Hermit, ou Rust 1.88+, Node 24+, pnpm 10+ e just [9]. A arquitetura usa Postgres, Redis e S3/MinIO [9].
- O README descreve o Buzz como relay Nostr e traz tabela de status com "Mobile clients (iOS + Android, Flutter)" e "Desktop app (Tauri + …)" [10]. A coluna de status de cada item não foi confirmada pela extração.

### 11. Windows como ambiente de desenvolvimento
- Rust [29], Go [28] e Python [30] têm suporte oficial a Windows documentado.
- Tauri exige WebView2 e Visual Studio C++ no Windows [44].
- Node.js: suporte oficial a Windows não confirmado por fonte primária nesta rodada; a página de download não devolveu texto [26] (ver H-2).

## Interpretações

- **I-1. Cobertura de SDK oficial.** TypeScript e Python têm a maior cobertura: provedores, MCP, ACP, A2A, Slack e Microsoft [1][2][3][4][5][7][12][13][17]. Go cobre provedores, MCP e A2A. Rust cobre MCP, ACP e A2A, mas não tem SDK oficial de Anthropic, OpenAI ou Google [1][2][3]. Um núcleo em Rust exigiria clientes HTTP próprios para os provedores.
- **I-2. Por que TypeScript e não Python no núcleo.** (a) A Web UI já é TypeScript; UI, tipos e contratos ficam em uma linguagem. (b) O Permission Model do Node é estável [23]. (c) Python tem cobertura equivalente de SDKs, mas exigiria outra toolchain para a UI e empacotamento mais pesado [30][31]. Python fica para runners de plugins e adaptadores específicos.
- **I-3. Go.** Só vale se o gateway precisar de binário único e de controle fino de memória [27][28]. Acrescentar Go ao núcleo cria uma terceira toolchain sem ganho para a UI.
- **I-4. Rust.** Uso restrito ao processo Core do Tauri [43]. Compilar no Windows exige Visual Studio C++ e WebView2 [44]: é custo de manutenção real para um desenvolvedor só.
- **I-5. Tauri ou Electron.** Tauri reaproveita React e tem footprint de instalador menor, segundo fontes secundárias [66][67], mas exige Rust no build [44]. Electron evita Rust e tem política de versões e de signing documentada [51][52], com footprint maior segundo as mesmas fontes [65][66]. Recomendação: Tauri, condicionada a medição própria de memória no hardware de 4 GB.
- **I-6. Flutter.** Reaproveita pouco da Web UI em React: seria uma segunda base de UI, em Dart. Interpretação sem fonte primária sobre Flutter Web nesta rodada. O Buzz usa Flutter no mobile [10], como dado comparativo.
- **I-7. Assinatura no Windows.** Sem Artifact Signing [60], a assinatura depende de certificado comercial (custo não confirmado) ou de aceitar o aviso do SmartScreen [45]. É decisão do usuário.
- **I-8. iOS.** A diretriz 2.5.2 [55] tende a impedir a instalação de skills ou plugins que alterem funcionalidades no app iOS. Logo, o cliente iOS deve ser fino, com a execução de scripts no host. Confirmar com a revisão da Apple.
- **I-9. Android.** Contas pessoais precisam de 12 testers por 14 dias para cada app [58]. Conta de organização evita a exigência, mas exige entidade legal [81] (busca).
- **I-10. Custo de publicação.** Apple US$ 99/ano (≈ US$ 8,25/mês, cálculo próprio) e Google US$ 25 única [54][57]. Cabe no orçamento de US$ 50/mês, mas não inclui Mac (ou CI com macOS) para iOS, certificado de Windows nem servidor do gateway, cujos custos não foram confirmados.
- **I-11. Composição.** Monólito modular puro reduz a manutenção, mas plugins de terceiros e webhooks de canais exigem fronteiras de processo ou de serviço. Serviços separados em várias linguagens excedem a capacidade de manutenção de um desenvolvedor. A forma híbrida atende ao requisito "multi-tudo" sem multiplicar o núcleo.
- **I-12. Contratos.** OpenAPI 3.2.1 para HTTP interno (núcleo, gateway e clientes) [34]. JSON Schema 2020-12 para tools, skills, memória e eventos [35]. MCP, ACP e A2A para protocolos externos [4][5][8]. Protobuf/gRPC só se houver necessidade de streaming tipado ou do binding gRPC do A2A [8][36].
- **I-13. Churn de APIs.** A Bot API teve três versões entre 11/06 e 24/08/2026 [15]; o Gemini publicou "Interactions breaking changes (May 2026)" [3]. Isso justifica adaptadores isolados por canal e por provedor, com versão explícita.
- **I-14. Isolamento de plugins.** O Permission Model estável [23] serve como controle para runners em TypeScript, mas `vm` não é sandbox [24]. A fronteira mais forte é processo separado com protocolo stdio [6][78], reforçada por controles do sistema operacional (containers, WASM), que não foram pesquisados.

## Hipóteses e pontos não confirmados

- **H-1.** Node SEA não é estável [22]. A distribuição do núcleo TypeScript deve depender de runtime empacotado (sidecar do Tauri [47]) ou de instalador próprio. Não confirmei quando SEA chega a Stable.
- **H-2.** Suporte oficial do Node.js ao Windows não confirmado por fonte primária nesta rodada.
- **H-3.** Consumo de memória em 4 GB: não há medição reprodutível. As fontes divergem (ver Lacunas). É preciso medir com RSS, PSS e USS.
- **H-4.** Tamanho de binário de Go, Rust e Python: não medido.
- **H-5.** Slack Bolt for Java: não confirmado (URL retornou 404).
- **H-6.** Discord: não identifiquei SDK oficial. Se existir, não confirmado.
- **H-7.** Telegram: a ausência de SDK oficial é sinal negativo (busca em Bot API e FAQ), não prova.
- **H-8.** WhatsApp: a página da Meta não cita SDK oficial; o uso direto da API HTTP é a referência. Não confirmado de forma absoluta.
- **H-9.** Maturidade e manutenção das bibliotecas de CLI/TUI (releases, comunidade): não medidas, só a licença.
- **H-10.** Mobile: React Native/Expo, Kotlin Multiplatform e Capacitor não foram pesquisados. Tauri mobile tem pré-requisitos documentados, mas maturidade não verificada. Flutter mobile: sem avaliação de maturidade.
- **H-11.** Custos não confirmados: certificado de code signing Windows para quem está fora de EUA/Canadá; Mac ou CI macOS; servidor do gateway; taxas de serviço da Google Play.
- **H-12.** Políticas da Google Play sobre código baixado ou dinâmico e verificação de desenvolvedor para distribuição de APK fora da Play [62] não foram lidas integralmente.
- **H-13.** Linux: requisitos de assinatura e canais de distribuição não pesquisados (além da navegação de documentação do Tauri).
- **H-14.** Atualização no Electron (electron-updater) e comportamento do Tauri no Linux (WebKitGTK) não verificados.
- **H-15.** Transportes do ACP além de JSON-RPC: aparece só como item de menu.
- **H-16.** OpenTelemetry: estágio de Rust, Python e JavaScript por sinal não confirmado.
- **H-17.** Isolamento por WASM/WASI, containers e microVMs: não pesquisado nesta rodada.
- **H-18.** Preços de APIs de modelos e limites dos provedores: fora desta frente, não pesquisados.

## Lacunas e conflitos

- **C-1. Versões mínimas do Microsoft 365 Agents SDK.** Node.js 18+ [17] versus 20+ [19]; Python 3.9–3.11 [17] versus 3.10+ [18]. Premissa conservadora até confirmação: Node.js 20+ e Python 3.11+.
- **C-2. Google Play, de 20 para 12 testers.** Doply cita o Android Developers Blog com data de 11/12/2024 [69]; onTest diz que a redução ocorreu "em 2025" [81]. A página oficial [58] confirma 12, sem data. O valor atual está confirmado; a data, não.
- **C-3. Memória de Electron e Tauri.** Não há fonte primária reprodutível. Os números divergem: 118/207 MB versus 125/185 MB em USS/PSS no Ubuntu [64]; pico de 543,4 MB versus 336,0 MB [65]; ocioso de 187 MB versus 42 MB [66]; e RAM ociosa até 10x menor [67]. A diferença depende da métrica (RSS, PSS ou USS), da carga e do WebView do sistema. Não usar como premissa.
- **C-4. Artifact Signing.** A documentação oficial [60] exclui o Brasil. Não encontrei fonte que contradiga isso. O relato sobre renovação [80] aumenta o risco.
- **C-5. Trechos truncados.** Apple 2.5.2 [55], notarização do Tauri [46] e signing do Electron [51] foram lidos em trecho. O sentido geral é claro, mas o texto completo não foi citado.
- **C-6. Página de notarização da Apple.** Renderizada por JavaScript, sem texto extraível. Usei a documentação do Tauri [46] como referência indireta.
- **C-7. Página de download do Node.js.** Renderizada por JavaScript, sem texto extraível. Por isso o suporte a Windows não foi confirmado (H-2).
- **C-8. Buzz.** Não confirmei em qual coluna de status estão Flutter e Tauri. "React" não aparece no trecho extraído do README.
- **C-9. A2A.** O blog informa que o A2A "joins the Agentic AI Foundation" [7]. Não li os detalhes de governança.
- **C-10. Sinais negativos de SDK oficial.** Telegram, Discord e WhatsApp não foram confirmados de forma absoluta (H-6 a H-8).
- **C-11. Mudança rápida de versões.** MCP (versão 2026-07-28 como latest) [4], Bot API (10.x) [15] e Gemini (breaking changes em maio de 2026) [3]. Exige acompanhar changelog.

## Recomendação preliminar

### Linguagens e runtime
- **Núcleo, UI e adaptadores de canal: TypeScript em Node.js LTS** (v24 aparece como LTS na tabela oficial em 13/10/2026 [25]). Motivos: SDKs oficiais de Anthropic, OpenAI, Google, MCP (Tier 1), ACP e A2A [1][2][3][4][5][7]; Slack Bolt JS [12]; Microsoft Agents SDK JS [17][19]; mesma linguagem da Web UI; Permission Model estável [23].
- **Desktop: Tauri 2 com React.** Rust só no processo Core (IPC, sistema de arquivos e processos) [43]. Se o custo de Rust no build pesar mais do que a economia de memória, a alternativa é Electron; decidir após medir.
- **Mobile: decisão pendente entre duas rotas.** (a) Tauri 2 mobile, que reaproveita o React (Android e iOS nos pré-requisitos [44]; maturidade não verificada). (b) Flutter, usado pelo Buzz [10], que introduz Dart. Nas duas, o cliente é fino e fala com o gateway por OpenAPI.
- **Python:** runners de plugins e adaptadores que exijam o SDK Python, como o Slack Bolt Python [13]. Não é núcleo.
- **Go:** não adotar por ora; reavaliar se o gateway precisar de binário estático único e controle fino de memória [27][28].
- **Rust:** só o Tauri Core e módulos nativos específicos.

### Composição híbrida: fronteiras, IPC, contratos, deploy e observabilidade
1. **Fronteiras.** (a) UI ↔ Core, via IPC do Tauri [43]. (b) Core ↔ runners de plugins/scripts, em processo filho com JSON-RPC por stdio, padrão de MCP e ACP [78][6]. (c) Núcleo local ↔ gateway, via HTTP com API versionada. (d) Gateway ↔ canais (webhooks e APIs). (e) Núcleo e gateway ↔ protocolos externos (MCP, ACP, A2A).
2. **Monólito modular TypeScript no núcleo local**, com módulos de provedores, canais (clientes), memória em cinco níveis, aprovações, skills e protocolos MCP/ACP/A2A.
3. **Gateway de canais no servidor** (TypeScript, mesmo monorepo) para webhooks de WhatsApp, Telegram, Slack, Teams e Discord. Hipótese de desenho: o núcleo local, atrás de NAT, não recebe webhooks.
4. **Contratos versionados.** Cada contrato carrega versão explícita. Exemplos: `A2A-Version` e `VersionNotSupportedError` [8]; ACP v1 com v2 em rascunho [5]; MCP com versões por data [4][78]; OpenAPI com seção de versões e deprecação [34]; JSON Schema 2020-12 [35]. Mudança de contrato gera nova versão, sem alterar a anterior.
5. **Geração de clientes.** OpenAPI 3.2.1 gera clientes TypeScript para UI e mobile (geradores não pesquisados). JSON Schema 2020-12 define e valida tools, skills, memória e eventos. Protobuf só se houver gRPC, com geração de código em várias linguagens [36].
6. **Deploy.** Instaladores Tauri por SO [44][45][46]. Gateway em contêiner no servidor (não pesquisado). Plugins instalados somente com aprovação humana, conforme o requisito do projeto. Windows depende da decisão de assinatura (I-7); macOS exige conta paga [46].
7. **Observabilidade.** OpenTelemetry com SDK JavaScript no núcleo e no gateway; runners em outras linguagens enviam telemetria ao mesmo coletor. Validar o estágio de cada sinal antes de depender dele [32][33].
8. **Custo de manter várias linguagens.** Cada linguagem soma toolchain, gerenciador de pacotes, CI e atualizações de segurança. Tauri exige Node, Rust e C++ no Windows [44]; o Buzz exige Rust 1.88+, Node 24+, pnpm 10+ e Docker [9]. Por isso o núcleo fica em duas linguagens (TypeScript e, no shell, Rust), e as demais entram só como plugins que falam protocolo.

### Pontuação preliminar

Escala: 1 = fraco, 5 = forte. Interpretação das evidências acima, não benchmark. Custos de licença de OSS assumidos como zero, sem verificação por projeto. n/v = não verificado; n/p = não pesquisado.

**Tabela A: linguagem do núcleo**

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | Esforço O&M | Base principal |
|---|---|---|---|---|---|---|---|---|
| TypeScript / Node.js | 5 | 4 | 4 | 4 | 3 | 5 | 4 | SDKs [1][2][3][4][5][7]; Permission Model [23]; SEA em desenvolvimento [22]; Node no Windows não confirmado (H-2) |
| Python | 4 | 4 | 4 | 4 | 2 | 4 | 3 | SDKs [1][2][3][4][13]; embeddable e PyInstaller [30][31]; sem UI compartilhável; isolamento não pesquisado |
| Go | 3 | 4 | 3 | 4 | 3 | 5 | 3 | SDKs de provedores e MCP Tier 1 [1][2][3][4]; GOMEMLIMIT [27]; Windows [28]; terceira toolchain |
| Rust | 2 | 5 | 3 | 5 | 4 | 5 | 2 | Tier 1 no Windows [29]; sem SDK oficial de provedores [1][2][3]; build exige Visual Studio C++ e WebView2 [44] |

A segurança de Python e Rust é preliminar: não há fonte primária sobre isolamento nesta rodada.

**Tabela B: UI desktop**

| Opção | Reuso da Web UI (React) | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | Esforço O&M | Base principal |
|---|---|---|---|---|---|---|---|---|
| Tauri 2 + React | 5 | 4 | 4 | 4 | 4 | 4 | 3 | Core e IPC [43]; sidecar [47]; updater assinado [48]; memória com conflito [63]–[68]; Rust no build [44]. Maturidade: documentação v2 completa, estabilidade do release não verificada |
| Electron + React | 5 | 5 | 4 | 5 | 3 | 4 | 4 | Suporte às três últimas versões [52]; signing para Windows e macOS [51]; footprint maior [65][66] |
| Flutter desktop | 2 | 4 | 3 | 4 | 3 | 4 | 2 | Docs de desktop [53]; sem reuso de React (I-6); memória não coletada |

**Tabela C: mobile**

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | Esforço O&M | Base principal |
|---|---|---|---|---|---|---|---|---|
| Flutter | 4 | n/v | 3 | 5 | 3 | 3 | 2 | Buzz [10]; docs de Android e iOS na navegação oficial [79]; segunda base de UI |
| Tauri 2 mobile (React) | 3 | n/v | 3 | 4 | 3 | 3 | 3 | Pré-requisitos de Android e iOS [44]; maturidade não verificada |
| React Native, Kotlin Multiplatform, nativo | n/p | n/p | n/p | n/p | n/p | n/p | n/p | Não pesquisado (H-10) |

Custos de loja são iguais para qualquer stack: US$ 99/ano na Apple e US$ 25 única no Google [54][57]. O custo de 3 nas duas primeiras linhas reflete o esforço de build para iOS.

**Tabela D: composição**

| Opção | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | Esforço O&M |
|---|---|---|---|---|---|---|---|
| Monólito modular (TypeScript) | 3 | 5 | 2 | 4 | 2 | 5 | 5 |
| Serviços separados (várias linguagens) | 4 | 3 | 5 | 3 | 4 | 2 | 2 |
| Híbrida (recomendada) | 5 | 4 | 4 | 4 | 4 | 4 | 3 |

Justificativa: a forma híbrida mantém um núcleo TypeScript, isola plugins e canais e exige três processos ou serviços (shell, runners e gateway). Custa mais em O&M que o monólito, mas bem menos que serviços em várias linguagens.

### Decisões que dependem do usuário
1. **Assinatura Windows:** certificado comercial (custo não confirmado) ou publicar sem assinatura, com aviso do SmartScreen [45][60].
2. **Cliente iOS fino,** sem instalação de plugins ou skills, por causa da diretriz 2.5.2 [55].
3. **Conta Google Play:** pessoal (teste de 12 testers por 14 dias para cada app [58]) ou organização (exige entidade legal).
4. **Desktop:** Tauri (aceita Rust no build) ou Electron (mais footprint, toolchain mais simples).
5. **Mobile:** Tauri mobile (reuso de React) ou Flutter (segunda base de UI).
6. **Premissas de versão:** Node.js 20+ e Python 3.11+ até confirmação (C-1).

### Próximas pesquisas (fora desta rodada)
- Isolamento de plugins: WASM/WASI, containers e microVMs.
- Maturidade de Tauri mobile, Flutter e React Native.
- Medição própria de memória de Tauri e Electron no hardware de 4 GB.
- Custo de certificado Windows e de CI com macOS.
- Políticas da Google Play sobre código baixado e verificação de desenvolvedor Android.

## Fontes

| # | URL | Título | Organização | Data (publicação/atualização) ou acesso |
|---|---|---|---|---|
| 1 | https://platform.claude.com/docs/en/cli-sdks-libraries/overview | SDKs, CLI, and libraries | Anthropic (Claude Platform Docs) | Acesso 13/10/2026 |
| 2 | https://developers.openai.com/api/docs/libraries | SDKs and CLI | OpenAI | Acesso 13/10/2026 |
| 3 | https://ai.google.dev/gemini-api/docs/libraries | Gemini API libraries | Google (AI for Developers) | Atualizado em 22/06/2026 (indicado na página); acesso 13/10/2026 |
| 4 | https://modelcontextprotocol.io/docs/2026-07-28/sdk | SDKs (Develop with MCP) | Model Context Protocol | Versão 2026-07-28 (latest, indicada na página); acesso 13/10/2026 |
| 5 | https://agentclientprotocol.com/get-started/introduction | Introduction (ACP) | Agent Client Protocol | Acesso 13/10/2026 |
| 6 | https://agentclientprotocol.com/protocol/v1/overview | Overview (protocolo v1) | Agent Client Protocol | Acesso 13/10/2026 |
| 7 | https://a2a-protocol.org/latest/ | A2A Protocol | A2A Project / Linux Foundation | Copyright 2026 (indicado na página); acesso 13/10/2026 |
| 8 | https://a2a-protocol.org/latest/specification/ | Agent2Agent (A2A) Protocol Specification | A2A Project | Versão 1.0.0 (indicada na página); acesso 13/10/2026 |
| 9 | https://github.com/block/buzz | block/buzz | Block | Acesso 13/10/2026 |
| 10 | https://raw.githubusercontent.com/block/buzz/main/README.md | README do Buzz | Block | Acesso 13/10/2026 |
| 11 | https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform | Sobre a plataforma (WhatsApp Business Platform) | Meta for Developers | Acesso 13/10/2026 (pt-BR) |
| 12 | https://docs.slack.dev/tools/bolt-js/ | Bolt for JavaScript | Slack | Acesso 13/10/2026 |
| 13 | https://docs.slack.dev/tools/bolt-python/ | Bolt for Python | Slack | Acesso 13/10/2026 |
| 14 | https://docs.discord.com/developers/developer-tools/community-resources | Community Resources | Discord | Acesso 13/10/2026 |
| 15 | https://core.telegram.org/bots/api | Bot API | Telegram | Bot API 10.3 em 24/08/2026 (histórico na página); acesso 13/10/2026 |
| 16 | https://core.telegram.org/bots/faq | Bot FAQ | Telegram | Acesso 13/10/2026 |
| 17 | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/agents-sdk-overview | Microsoft 365 Agents SDK overview | Microsoft Learn | Acesso 13/10/2026 |
| 18 | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/bf-migration-python | Migration guidance (Python) | Microsoft Learn | Acesso 13/10/2026 (busca) |
| 19 | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/bf-migration-nodejs | Migration guidance (Node.js) | Microsoft Learn | Acesso 13/10/2026 (busca) |
| 20 | https://github.com/microsoft/botframework-sdk | Bot Framework SDK (archive notice) | Microsoft | Acesso 13/10/2026 |
| 21 | https://learn.microsoft.com/et-ee/microsoftteams/platform/legacy-tools-sdks | Legacy Tools and SDKs for Teams app development | Microsoft Learn | Acesso 13/10/2026 (busca) |
| 22 | https://nodejs.org/api/single-executable-applications.html | Single executable applications | Node.js | Acesso 13/10/2026 |
| 23 | https://nodejs.org/api/permissions.html | Permission Model | Node.js | Estável desde v23.5.0 / v22.13.0 (indicado na página); acesso 13/10/2026 |
| 24 | https://nodejs.org/api/vm.html | VM (executing JavaScript) | Node.js | Acesso 13/10/2026 |
| 25 | https://nodejs.org/en/about/previous-releases | Node.js Releases | Node.js | Acesso 13/10/2026 |
| 26 | https://nodejs.org/api/cli.html | Command-line API | Node.js | Acesso 13/10/2026 |
| 27 | https://go.dev/doc/gc-guide | A Guide to the Go Garbage Collector | Go team | Acesso 13/10/2026 |
| 28 | https://go.dev/doc/install | Download and install | Go | Acesso 13/10/2026 |
| 29 | https://doc.rust-lang.org/rustc/platform-support.html | Rust platform support | Rust Project | Acesso 13/10/2026 |
| 30 | https://docs.python.org/3/using/windows.html | Using Python on Windows | Python Software Foundation | Acesso 13/10/2026 |
| 31 | https://pyinstaller.org/en/stable/usage.html | Usage | PyInstaller | Acesso 13/10/2026 |
| 32 | https://opentelemetry.io/status/ | Status | OpenTelemetry | Acesso 13/10/2026 |
| 33 | https://opentelemetry.io/docs/languages/ | Languages | OpenTelemetry | Acesso 13/10/2026 |
| 34 | https://spec.openapis.org/oas/latest.html | OpenAPI Specification v3.2.1 | OpenAPI Initiative | 10/09/2026 (indicado na página); acesso 13/10/2026 |
| 35 | https://json-schema.org/specification | Specification | JSON Schema | Acesso 13/10/2026 |
| 36 | https://protobuf.dev/overview/ | Protocol Buffers Overview | Google | Acesso 13/10/2026 |
| 37 | https://code.claude.com/docs/en/agent-sdk/overview | Agent SDK overview | Anthropic | Acesso 13/10/2026 |
| 38 | https://openai.github.io/openai-agents-python/ | OpenAI Agents SDK (Python) | OpenAI | Acesso 13/10/2026 |
| 39 | https://github.com/openai/openai-agents-js | openai-agents-js | OpenAI | Acesso 13/10/2026 |
| 40 | https://adk.dev/ | Agent Development Kit (ADK) | Google | Acesso 13/10/2026 |
| 41 | https://www.rfc-editor.org/info/rfc5321/ | RFC 5321: Simple Mail Transfer Protocol | IETF / RFC Editor | Acesso 13/10/2026 |
| 42 | https://www.rfc-editor.org/info/rfc9051/ | RFC 9051: IMAP Version 4rev2 | IETF / RFC Editor | Acesso 13/10/2026 |
| 43 | https://v2.tauri.app/concept/process-model/ | Process Model | Tauri | Acesso 13/10/2026 |
| 44 | https://v2.tauri.app/start/prerequisites/ | Prerequisites | Tauri | Acesso 13/10/2026 |
| 45 | https://v2.tauri.app/distribute/sign/windows/ | Windows Code Signing | Tauri | Acesso 13/10/2026 |
| 46 | https://v2.tauri.app/distribute/sign/macos/ | macOS Code Signing | Tauri | Acesso 13/10/2026 |
| 47 | https://v2.tauri.app/develop/sidecar/ | Embedding External Binaries (sidecar) | Tauri | Acesso 13/10/2026 |
| 48 | https://v2.tauri.app/plugin/updater/ | Updater | Tauri | Acesso 13/10/2026 |
| 49 | https://v2.tauri.app/concept/size/ | App Size | Tauri | Acesso 13/10/2026 |
| 50 | https://www.electronjs.org/docs/latest/tutorial/process-model | Process Model | Electron | Acesso 13/10/2026 |
| 51 | https://www.electronjs.org/docs/latest/tutorial/code-signing | Code Signing | Electron | Acesso 13/10/2026 |
| 52 | https://www.electronjs.org/docs/latest/tutorial/electron-timelines | Electron Releases | Electron | Acesso 13/10/2026 |
| 53 | https://docs.flutter.dev/platform-integration/desktop | Desktop | Flutter (Google) | Acesso 13/10/2026 |
| 54 | https://developer.apple.com/programs/ | Apple Developer Program | Apple | Acesso 13/10/2026 |
| 55 | https://developer.apple.com/app-store/review/guidelines/ | App Review Guidelines | Apple | Acesso 13/10/2026 |
| 56 | https://developer.apple.com/news/upcoming-requirements/ | Upcoming Requirements | Apple | Acesso 13/10/2026 |
| 57 | https://support.google.com/googleplay/android-developer/answer/6112435 | Get started with Play Console | Google Play Help | Acesso 13/10/2026 |
| 58 | https://support.google.com/googleplay/android-developer/answer/14151465 | App testing requirements for new personal developer accounts | Google Play Help | Acesso 13/10/2026 |
| 59 | https://developer.android.com/google/play/requirements/target-sdk | Meet Google Play's target API level requirement | Android Developers (Google) | Acesso 13/10/2026 |
| 60 | https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart | Quickstart: Set up Artifact Signing | Microsoft Learn | Acesso 13/10/2026 (fetch parcial e busca) |
| 61 | https://learn.microsoft.com/en-us/azure/artifact-signing/faq | Artifact Signing FAQ | Microsoft Learn | Acesso 13/10/2026 (busca) |
| 62 | https://support.google.com/android-developer-console/answer/16604405 | Get started with an Android Developer Console account | Google | Acesso 13/10/2026 (busca) |
| 63 | https://github.com/tauri-apps/benchmark_results | tauri-apps/benchmark_results | Tauri (GitHub) | Acesso 13/10/2026 (busca) |
| 64 | https://github.com/tauri-apps/tauri/issues/5889 | Memory benchmark might be incorrect: Tauri might consume more RAM than Electron | Comunidade (GitHub issue) | Data não indicada no trecho; acesso 13/10/2026 (busca) |
| 65 | https://zenn.dev/mizugeeks/articles/1019cf2353d343?locale=en | Memory Usage Benchmark of 15 Desktop UI Frameworks | Zenn (autor individual) | 15/08/2026 (metadado da busca); fonte secundária |
| 66 | https://johal.in/benchmarks-performance-tauri-20-vs-electron-30-markdown | Benchmarks: Performance of Tauri 2.0 vs. Electron 30 | johal.in (blog) | 30/04/2026 (metadado da busca); fonte secundária |
| 67 | https://jurnal.kdi.or.id/index.php/bt/article/view/3733 | Performance Comparison of Tauri and Electron Frameworks in Multiplatform Desktop Application Development | Jurnal KDI | 10/04/2026 (metadado da busca); fonte secundária |
| 68 | https://www.itechguides.com/electron-vs-tauri-which-cross-platform-framework-is-for-you/ | Electron vs. Tauri: Which Cross-Platform Framework Is for You? | iTechGuides | 18/08/2026 (metadado da busca); fonte secundária |
| 69 | https://www.doply.io/en/blog/google-play-12-testers-14-days-rule | Google Play 12 Testers, 14 Days Rule (2026) | Doply (blog) | 11/10/2026 (metadado da busca); fonte secundária |
| 70 | https://raw.githubusercontent.com/Textualize/textual/main/LICENSE | LICENSE (Textual) | Textualize | Acesso 13/10/2026 |
| 71 | https://raw.githubusercontent.com/fastapi/typer/master/LICENSE | LICENSE (Typer) | FastAPI / Typer | Acesso 13/10/2026 |
| 72 | https://raw.githubusercontent.com/tj/commander.js/master/LICENSE | LICENSE (Commander) | tj/commander.js | Acesso 13/10/2026 |
| 73 | https://raw.githubusercontent.com/vadimdemedes/ink/master/license | license (Ink) | vadimdemedes/ink | Acesso 13/10/2026 |
| 74 | https://raw.githubusercontent.com/spf13/cobra/main/LICENSE.txt | LICENSE (Cobra) | spf13/cobra | Acesso 13/10/2026 |
| 75 | https://raw.githubusercontent.com/charmbracelet/bubbletea/main/LICENSE | LICENSE (Bubble Tea) | Charmbracelet | Acesso 13/10/2026 |
| 76 | https://raw.githubusercontent.com/clap-rs/clap/master/LICENSE-MIT | LICENSE-MIT (clap) | clap-rs | Acesso 13/10/2026 |
| 77 | https://raw.githubusercontent.com/ratatui/ratatui/main/LICENSE | LICENSE (Ratatui) | Ratatui | Acesso 13/10/2026 |
| 78 | https://modelcontextprotocol.io/specification/2026-07-28/basic/transports | Transports | Model Context Protocol | Versão 2026-07-28 (indicada na página); acesso 13/10/2026 |
| 79 | https://docs.flutter.dev/reference/supported-platforms | Supported platforms | Flutter (Google) | Acesso 13/10/2026 |
| 80 | https://github.com/Azure/artifact-signing-action/issues/42 | Feature: Support for Individual Developer signing (issue #42) | Comunidade (GitHub issue) | 20/07/2024 (metadado da busca); fonte secundária |
| 81 | https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained | Google Play 12 Testers, 14 Days Rule Explained | onTest (blog) | 04/07/2026 (metadado da busca); fonte secundária |
