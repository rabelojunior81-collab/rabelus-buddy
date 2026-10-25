# Plano — M2: Execução isolada

**SPEC:** [0003-execucao-isolada](../../40-specs/0003-execucao-isolada/SPEC.md) · **Estado:** em execução (aprovado pelo Pai em 2026-10-25, com a SPEC, as duas bibliotecas do spike e o pedido de administrador durante ele)
**Branch(es):** uma por sub-fase, `feat/m2-N-<slug>` · **Atualizado em:** 2026-10-25T09:45:38-03:00

## Objetivo

Um comando, do Buddy ou de um agente de fora, roda contido pelo sistema operacional:
- lê e escreve só a pasta de trabalho e o que a política liberar;
- alcança a rede só pelos domínios liberados, com cartão para o domínio novo;
- dentro da pasta, com a contenção confirmada, roda sem perguntar.

A biblioteca vem do spike, medido no Windows do Pai e na CI.

## TODO

- [x] **M2.0 Spike `sandbox-runtime` × `mxc-sdk`** (critérios 1, 2 e 8). A bateria fica em [`scripts/spike-m2/`](../../../scripts/spike-m2/rodar.mjs): 12 fugas, 10 legítimos, sem contenção e dentro de cada biblioteca. As bibliotecas ficam fora da árvore do repositório, porque o `sandbox-runtime` traz alertas altos sem correção.
  - [x] Base e MXC no Windows do Pai (2026-10-25). Base: 0 de 12 fugas contidas, 10 de 10 legítimos, 183 ms por comando. MXC no nível base-container, sem administrador: 10 de 12 contidas, 10 de 10 legítimos, 505 ms por comando.
  - [x] Linux e macOS pela CI (workflow `spike-m2`), as duas bibliotecas (2026-10-25, [registro](../../registros/2026-10-25T085733-0300-ensaio-do-spike-de-contencao-m2-0/README.md)). MXC: macOS 12 de 12, Linux 11 de 12. sandbox-runtime: macOS 11 de 12, Linux 10 de 12. 10 de 10 legítimos em todos.
  - [>] `sandbox-runtime` no Windows do Pai: dispensado pelo Pai ao aceitar a ADR 0019.
  - [>] Agente real (OpenCode) dentro da biblioteca vencedora (critério 3): vai para a M2.2, que é onde o agente de fora é contido.
  - [x] ADR com a escolha: [ADR 0019](../../60-decisoes/0019-contencao-pelo-mxc.md), **aceita pelo Pai em 2026-10-25**: MXC. O `sandbox-runtime` saiu do registro de dependências.
- [x] **M2.1 Camada de execução no núcleo** (`packages/core/src/sandbox/`; **feita em 2026-10-25**, [checagem real](../../../docs/registros/2026-10-25T092213-0300-checagem-real-da-contencao-m2-1/README.md)): perfil por pasta (leitura e escrita na pasta; `.git`, `.buddy-dev` e `archive` só leitura; segredos negados; pastas acima só para listar; rede negada), contenção confirmada por uma execução real, o `run_command` do Buddy por ela, a chave `RBUDDY_CONTAINMENT=off`, e o resultado diz ao modelo que rodou contido (critérios 1, 2 e 5 com teste).
- [ ] **M2.2 Agente de fora contido:** o processo do harness inteiro roda dentro da contenção, com o domínio do provedor liberado (critério 3). **Depois da M2.3** (decisão de ordem de 2026-10-25, dentro da SPEC aprovada): o agente precisa da rede por proxy com lista de domínios, e o OpenCode 2 tem um serviço de fundo que precisa ser entendido antes (achados abaixo).
- [ ] **M2.3 Rede por cartão:** domínio novo vira cartão "rede" com os quatro escopos, e o proxy registra cada destino (critério 4).
- [ ] **M2.4 Sem prompt dentro da pasta** com a contenção confirmada, no modo Manual (critério 6).
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
- **HIPÓTESE, a pesquisar antes de prometer contenção do OpenCode:** se esse serviço já estiver rodando fora da contenção (o Pai usando o OpenCode por conta própria), o `opencode acp` contido pode entregar o trabalho a ele pelo loopback. Aí a contenção vira fachada. Não testei, porque subir o serviço fora da contenção mexeria no computador do Pai sem necessidade.
- **Consequência:** a contenção de agente é por agente. Cada um tem pastas, domínios e arquitetura próprios, e o perfil de cada um vem de pesquisa ao vivo e de um ensaio, nunca de suposição.

## Dependências e bloqueios

- **O preparo do `sandbox-runtime` no Windows é do Pai.** Ele cria uma conta de usuário local e filtros de rede para a máquina inteira, com um pedido de administrador. É mudança de configuração de segurança do sistema: o buddy-dev não a dispara, nem com autorização; o Pai a faz e a desfaz.
