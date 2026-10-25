# Plano — M2: Execução isolada

**SPEC:** [0003-execucao-isolada](../../40-specs/0003-execucao-isolada/SPEC.md) · **Estado:** em execução (aprovado pelo Pai em 2026-10-25, com a SPEC, as duas bibliotecas do spike e o pedido de administrador durante ele)
**Branch(es):** uma por sub-fase, `feat/m2-N-<slug>` · **Atualizado em:** 2026-10-25T17:42:59-03:00

## Objetivo

Um comando, do Buddy ou de um agente de fora, roda contido pelo sistema operacional:
- lê e escreve só a pasta de trabalho e o que a política liberar;
- alcança a rede só pelos domínios liberados, com cartão para o domínio novo;
- dentro da pasta, com a contenção confirmada, roda sem perguntar.

A biblioteca vem do spike, medido no Windows do Pai e na CI.

## TODO

- [x] **M2.0 Spike `sandbox-runtime` × `mxc-sdk`** (critérios 1, 2 e 8). A bateria fica em [`scripts/spike-m2/`](../../../archive/2026-10-25T165301-0300-spike-de-contencao-m2/scripts/spike-m2/rodar.mjs) (arquivada em 2026-10-25, depois da ADR 0019): 12 fugas, 10 legítimos, sem contenção e dentro de cada biblioteca. As bibliotecas ficam fora da árvore do repositório, porque o `sandbox-runtime` traz alertas altos sem correção.
  - [x] Base e MXC no Windows do Pai (2026-10-25). Base: 0 de 12 fugas contidas, 10 de 10 legítimos, 183 ms por comando. MXC no nível base-container, sem administrador: 10 de 12 contidas, 10 de 10 legítimos, 505 ms por comando.
  - [x] Linux e macOS pela CI (workflow `spike-m2`), as duas bibliotecas (2026-10-25, [registro](../../registros/2026-10-25T085733-0300-ensaio-do-spike-de-contencao-m2-0/README.md)). MXC: macOS 12 de 12, Linux 11 de 12. sandbox-runtime: macOS 11 de 12, Linux 10 de 12. 10 de 10 legítimos em todos.
  - [>] `sandbox-runtime` no Windows do Pai: dispensado pelo Pai ao aceitar a ADR 0019.
  - [>] Agente real (OpenCode) dentro da biblioteca vencedora (critério 3): vai para a M2.2, que é onde o agente de fora é contido.
  - [x] ADR com a escolha: [ADR 0019](../../60-decisoes/0019-contencao-pelo-mxc.md), **aceita pelo Pai em 2026-10-25**: MXC. O `sandbox-runtime` saiu do registro de dependências.
- [x] **M2.1 Camada de execução no núcleo** (`packages/core/src/sandbox/`; **feita em 2026-10-25**, [checagem real](../../../docs/registros/2026-10-25T092213-0300-checagem-real-da-contencao-m2-1/README.md)): perfil por pasta (leitura e escrita na pasta; `.git`, `.buddy-dev` e `archive` só leitura; segredos negados; pastas acima só para listar; rede negada), contenção confirmada por uma execução real, o `run_command` do Buddy por ela, a chave `RBUDDY_CONTAINMENT=off`, e o resultado diz ao modelo que rodou contido (critérios 1, 2 e 5 com teste).
- [~] **M2.2 Agente de fora contido** (**Codex feito em 2026-10-25**, [checagem real](../../../docs/registros/2026-10-25T163610-0300-checagem-real-do-codex-contido-m2-2/README.md): o processo inteiro do codex-acp roda pela MXC, com ~/.codex e o cache do npm, e a rede só para o provedor dele; dentro da pasta sem cartão, fora negado. **Falta o OpenCode.** O caminho que o Pai escolheu (servidor privado dentro da contenção) foi testado em 2026-10-25 e esbarra num limite da MXC 1.0.1 (achados abaixo); a decisão voltou ao Pai. Na postura "do agente", nada de contenção, também por escolha do Pai.) o processo do harness inteiro roda dentro da contenção, com o domínio do provedor liberado (critério 3). **Depois da M2.3** (decisão de ordem de 2026-10-25, dentro da SPEC aprovada): o agente precisa da rede por proxy com lista de domínios, e o OpenCode 2 tem um serviço de fundo que precisa ser entendido antes (achados abaixo).
- [x] **M2.3 Rede por cartão** (**feita em 2026-10-25**, [checagem real](../../../docs/registros/2026-10-25T100502-0300-checagem-real-da-rede-por-cartao-m2-3/README.md)): a rede do comando contido só sai pelo proxy do núcleo; cada destino passa pela política (ferramenta `network`: pergunta por padrão, quatro escopos, curinga de host, negação vence, Plano nega, Sem perguntas libera); o destino novo vira o cartão "rede", e o log guarda cada destino e o perfil de cada comando (critério 4).
- [x] **M2.4 Sem prompt dentro da pasta** com a contenção confirmada (critério 6; **feita em 2026-10-25**, junto da rotina rápida pedida pelo Pai, [checagem real](../../../docs/registros/2026-10-25T161548-0300-checagem-real-da-rotina-rapida-m2-4/README.md)): contido, o comando roda sem cartão, e o Plano continua negando; comando só de leitura e local roda sem ligar a rede (cerca de 270 ms a menos). Medido: contido 185 ms, com rede 454 ms, sem contenção 39 ms.
- [~] **M2.8 Spike do Cua como computador dos agentes** (proposta de 2026-10-25, a pedido do Pai; [ficha](../../20-conhecimento/cua-computador-para-agentes.md)): o nível S2 adiantado para os agentes. Cada agente (OpenCode, Codex, Claude Code...) roda dentro de um contêiner com a configuração dele, pelo SDK do Cua, por ACP; a rede passa pelo proxy do Buddy, e os arquivos entram e saem por cópia, com diff (casa com a M2.6). **Aprovado pelo Pai em 2026-10-25** e feito no mesmo dia ([registro](../../../docs/registros/2026-10-25T174214-0300-spike-do-cua-no-windows-m2-8/README.md)). No Windows do Pai, entrega processos e arquivos (o OpenCode rodou lá dentro, sem ver as pastas do Pai, e o arquivo foi e voltou com a lista do que mudou), mas **não a rede**: a política de saída do Cua é recusada no Docker Desktop, e o proxy do Buddy não chega ao contêiner sem mudar o Windows. **Aguarda o Pai** (`cua-depois-do-spike`).
- [ ] **M2.5 Preparo pela console:** "Preparar a contenção" e "Desfazer", com explicação, quando a biblioteca escolhida pedir administrador (critério 7).
- [ ] **M2.6 Worktree por sessão:** integração com diff, aprovação e desfazer (critério 9).
- [ ] **M2.7 Ensaio e métricas** registrados (critério 8); retrospectiva.

## Achados do spike até aqui

- **MXC no Windows (CONFIRMADO no ensaio):**
  - o proxy exige a entrada da rede local liberada (`ingress.default: allow`);
  - o `node.exe` não inicializa com a interface desligada (`0xC0000142`), então precisa de `ui.disable: false`. Área de transferência e injeção de teclado continuam negadas;
  - o node consulta as pastas acima do script e precisa de `enumeratePaths` nelas. "Só listar" a própria pasta de trabalho rebaixa a escrita;
  - a rede é filtrada por endereço IP, não por domínio. A lista de domínios precisa de um proxy do núcleo;
  - as duas fugas que passaram vazam informação, não conteúdo: os nomes da pasta do usuário (efeito do `enumeratePaths`) e a resolução de DNS (a conexão é barrada no proxy).
- **`sandbox-runtime` no Windows (CONFIRMADO):**
  - sem o preparo, ele recusa com "Sandbox user is not provisioned" e explica o comando;
  - o auxiliar `srt-win.exe` vem no pacote e precisa ser apontado (`windows.srtWin.path`);
  - tem um "ask callback" para o domínio que nenhuma regra decide, que é o cartão "rede" da SPEC.
- **Dependências:** o `sandbox-runtime` 0.0.81 traz `node-forge` e `zod` 3 com alertas altos sem correção, segundo o `npm audit`.

## Achados da M2.2 (2026-10-25, experimento com o OpenCode real do Pai)

- **CONFIRMADO:** o `opencode acp` (2.0.32) roda contido pela MXC e responde ao `initialize` do ACP em menos de 1 s, com leitura e escrita nas pastas dele (`~/.local/share/opencode`, `~/.local/state/opencode`, `~/.cache/opencode`) e leitura da configuração.
- **CONFIRMADO:** o `session/new` falha ("Internal service failure"). O OpenCode 2 inicia um serviço de fundo (`opencode serve --service`), que muda o diretório para a pasta do usuário e cai com `EPERM` dentro da contenção, mesmo com a pasta do usuário liberada para leitura.
- **Pesquisa ao vivo (2026-10-25):** o OpenCode 2 roda um serviço de fundo por usuário. Os clientes usam esse serviço, que nasce sob demanda e continua vivo depois. Existe o `--standalone`, para rodar com um servidor privado ([The New Stack](https://thenewstack.io/opencode-2-shared-service/), [ComputingForGeeks](https://computingforgeeks.com/opencode-cli-cheat-sheet/)).
- **CONFIRMADO:** o `opencode acp` 2.0.32 não aceita `--standalone` ("Unrecognized flag", antes ou depois do subcomando). Pelo ACP, ele sempre usa o serviço de fundo, e o serviço não sobe dentro da contenção.
- **CONFIRMADO, e virou teste nos três sistemas:** com o proxy ligado (loopback do host liberado no Windows e no macOS), o comando contido não alcança outro serviço local (`EACCES`). Um OpenCode contido não conseguiria entregar o trabalho a um serviço rodando fora. A hipótese da contenção de fachada está descartada para o desenho atual.
- **Para conter o OpenCode, há três caminhos:**
  - pedir ao projeto do OpenCode um `acp` com servidor privado (publicar no GitHub deles exige o Pai);
  - subir um `opencode serve` privado dentro da mesma contenção e ligar o `acp` a ele;
  - conter primeiro um agente sem serviço de fundo (o adaptador do Codex, que já foi aprovado).
- **Consequência:** a contenção de agente é por agente. Cada um tem pastas, domínios e arquitetura próprios, e o perfil de cada um vem de pesquisa ao vivo e de um ensaio, nunca de suposição.

## Achados do servidor privado do OpenCode (2026-10-25, caminho 2 do Pai)

- **CONFIRMADO:** o `opencode serve` privado (sem `--service`) sobe dentro da contenção. O problema antigo era só o modo de serviço.
- **CONFIRMADO:** o `acp` não aceita `--server` nem `--standalone`. O `serve --stdio` só informa o endereço HTTP.
- **CONFIRMADO, fora da contenção:** um lançador (servidor privado com senha nova, e configuração e estado privados que apontam o `acp` para ele, sem ler a senha real do Pai) faz a sessão do `acp` abrir.
- **CONFIRMADO, dentro da contenção:** falha. Com o proxy de rede, o loopback fica liberado só para o proxy, e o `acp` não alcança o próprio servidor. A MXC 1.0.1 recusa liberar `127.0.0.1` junto com o proxy ("networkProxy requires egress deny with no allow rules"). Sem o proxy, dois processos do mesmo contêiner conversam, mas o modelo só seria alcançado liberando endereços IP do provedor.
- **Conclusão:** conter o OpenCode 2 hoje depende de uma mudança na MXC (loopback interno junto com o proxy) ou no OpenCode (`acp` apontando para um servidor). Uma terceira via é aceitar a rede do OpenCode por IP, sem cartão por domínio.

## Dependências e bloqueios

- **O preparo do `sandbox-runtime` no Windows é do Pai.** Ele cria uma conta de usuário local e filtros de rede para a máquina inteira, com um pedido de administrador. É mudança de configuração de segurança do sistema: o buddy-dev não a dispara, nem com autorização; o Pai a faz e a desfaz.
