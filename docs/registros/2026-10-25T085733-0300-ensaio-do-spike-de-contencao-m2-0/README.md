# Ensaio: spike de contenção do M2 (`sandbox-runtime` × `mxc-sdk`)

**Classe:** REGISTRO · **Data:** 2026-10-25T08:57:33-03:00 · **Por:** buddy-dev (sessão `claude-code-desktop-694e2a`) · **Para:** [SPEC 0003](../../40-specs/0003-execucao-isolada/SPEC.md), critérios 1, 2 e 8; [plano do M2](../../50-planos/m2/PLANO.md), M2.0

## Por quê

A SPEC 0003, aprovada pelo Pai em 2026-10-25, manda escolher a biblioteca de contenção pela medição: a mesma bateria nas duas candidatas, no Windows do Pai e na CI (Linux e macOS).

## Como

- **Bateria:** [`scripts/spike-m2/`](../../../archive/2026-10-25T165301-0300-spike-de-contencao-m2/scripts/spike-m2/rodar.mjs) (arquivada em 2026-10-25, depois da ADR 0019).
  - **12 tentativas de fuga:**
    - E1: ler fora da pasta;
    - E2: ler o `.env`;
    - E3: listar a pasta do usuário;
    - E4: escrever fora da pasta;
    - E5: escrever no `.git`;
    - E6: renomear o `.env`;
    - E7: conexão direta sem proxy;
    - E8: domínio não liberado pelo proxy;
    - E9: resolver DNS de domínio não liberado;
    - E10: processo solto que escreve fora depois que o pai sai;
    - E11: escrever na pasta temporária do sistema;
    - E12: ver uma variável de ambiente secreta do processo pai.
  - **10 comandos legítimos:**
    - L1: `node -v`;
    - L2 e L3: escrever e ler na pasta;
    - L4: `git --version`;
    - L5: `git status`;
    - L6: `npm -v`;
    - L7: `node --test`;
    - L8: criar e apagar uma pasta;
    - L9: HTTPS para o domínio liberado, pelo proxy;
    - L10: listar a pasta.
- **Base:** a bateria roda primeiro sem contenção, para provar que cada fuga funciona de verdade. Nos três sistemas, as 12 escaparam e os 10 legítimos passaram.
- **Perfil igual nas duas:**
  - leitura e escrita só na pasta de trabalho;
  - leitura no runtime, no git, no npm e na própria bateria;
  - `.env` negado e `.git` só leitura;
  - rede só por um proxy, com `registry.npmjs.org` liberado. O MXC usa um proxy do rodador; o `sandbox-runtime` usa o dele.
- **Onde:**
  - **Windows 11 Pro 26H2**, build 26300.9711 (o computador do Pai), Node 26.11.1;
  - **CI do GitHub** (`ubuntu-latest` e `macos-latest`, Node 26.12.1), workflow `spike-m2`.
- **Isolamento das bibliotecas:** elas ficam fora da árvore do repositório, porque o `sandbox-runtime` 0.0.81 traz `node-forge` e `zod` 3 com alertas altos sem correção (`npm audit`).

## Resultado

| | Windows (Pai) | macOS (CI) | Linux (CI) |
|---|---|---|---|
| **Base** (sem contenção) | 0/12 contidas · 10/10 · 180 ms | 0/12 · 10/10 · 127 ms | 0/12 · 10/10 · 80 ms |
| **MXC 1.0.1** | **10/12** (E3, E9) · **10/10** · 515 ms | **12/12** · **10/10** · 230 ms | **11/12** (E3) · **10/10** · 192 ms |
| **sandbox-runtime 0.0.81** | não roda sem o preparo de administrador | **11/12** (E12) · **10/10** · 126 ms | **10/12** (E3, E12) · **10/10** · 97 ms |

Os tempos são a média por comando legítimo, com a partida do node incluída. "E3" e "E12" são as fugas que passaram.

**As fugas que passaram:**
- **E3, listar a pasta do usuário:** aparecem os nomes, mas não o conteúdo. A pasta de trabalho fica dentro da pasta do usuário, e as duas bibliotecas precisam deixar listar o caminho até ela.
- **E9, DNS no Windows:** o nome resolve, mas a conexão para ele é barrada no proxy (E8 contida).
- **E12, variável de ambiente do pai, no `sandbox-runtime`:** a variável passa para dentro. No Buddy, isso se corrige do nosso lado, rodando o comando com um ambiente limpo. Mesmo assim, é a única fuga de conteúdo.

## Achados (todos CONFIRMADOS no ensaio)

**MXC:**
- **Sem administrador no Windows do Pai.** O nível é o base-container (Tier 1), e o preparo com administrador só existe no Tier 3.
- **O `node.exe` precisa de `ui.disable: false`.** Com a interface desligada, ele não inicializa (`0xC0000142`). A área de transferência e a injeção de teclado continuam negadas.
- **O node consulta as pastas acima do script.** Sem `enumeratePaths` nelas, ele cai com `EPERM`. Pôr a própria pasta de trabalho em `enumeratePaths` rebaixa a escrita.
- **A rede é configurada por backend:**
  - no Windows e no macOS, o proxy exige a entrada liberada com o loopback do host;
  - o bubblewrap recusa regras de entrada, porque o loopback dele é de outro namespace.
- **A rede é filtrada por IP, não por domínio.** A lista de domínios e o cartão "rede" ficam com um proxy do núcleo, que este ensaio já demonstrou (E8 403, L9 200).
- **No Linux, a temporária é uma cópia privada.** A escrita "funciona" lá dentro, mas nada chega ao sistema. O rodador passou a conferir do lado de fora.
- **Pacote de 108 MB**, com binários nativos dos três sistemas.

**`sandbox-runtime`:**
- **O Windows exige um preparo único com administrador** ("Sandbox user is not provisioned"). Ele cria uma conta local e filtros de rede para a máquina inteira e dá leitura da pasta do usuário à conta. O auxiliar `srt-win.exe` precisa ser apontado (`windows.srtWin.path`).
- **O proxy próprio já tem lista de domínios e um "ask callback"** para o domínio novo, que é o cartão "rede" pronto. A credencial vai no endereço do proxy (sem ela, 407).
- **É mais leve no macOS e no Linux:** cerca de 0 a 17 ms a mais que a base, contra 100 a 115 ms do MXC.
- **Traz alertas de segurança altos sem correção** nas dependências.

**Erros meus, achados pela própria bateria e corrigidos:**
- erro de configuração contado como fuga contida (agora é "erro");
- credencial do proxy ignorada;
- comando partindo de pasta negada;
- leituras de que o git, o npm e o auxiliar de seccomp precisam.

## Limites declarados

- **O `sandbox-runtime` não foi medido no Windows.** O preparo dele muda a configuração de segurança da máquina inteira: cria uma conta de usuário e filtros de rede. O buddy-dev não dispara esse tipo de mudança, nem com autorização. Quem faz é o Pai.
- **Memória por comando não foi medida.** Só o tempo.
- **O agente real (OpenCode) dentro da contenção** fica para depois da escolha (critério 3).
