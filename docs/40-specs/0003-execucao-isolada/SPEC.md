# SPEC — M2: Execução isolada

**ID:** 0003-execucao-isolada · **Tamanho:** fase · **Revisão:** 1 · **Estado:** aprovada
**Autor:** buddy-dev (Buddy Fenix), sessão `claude-code-desktop-2ea315` · **Criada em:** 2026-10-21 · **Aprovada por:** Pai, 2026-10-25 ("Aprovo a especificação da contenção de comandos, a entrada das duas bibliotecas para a comparação e o pedido de administrador do Windows durante ela, com desfazer")
**Revisão anterior:** — · **Decisão de origem:** [ROADMAP](../../50-planos/ROADMAP.md) e [ADR 0018](../../60-decisoes/0018-ordem-c-depois-do-m0.md) (ordem C: M2 é o isolamento); pesquisa [R2](../../10-pesquisa/rev-0.2/r2-sandbox.md), reverificada ao vivo em 2026-10-21 na [ficha de sandbox](../../20-conhecimento/sandbox-e-permissoes.md)

## Problema e resultado

Hoje, tudo o que um agente roda no computador do Pai roda com os direitos do Pai. A política do núcleo decide **se** uma ação acontece (perguntar, permitir, negar), mas não limita **o que** um comando aprovado consegue fazer depois de começar: ele lê o disco inteiro, escreve fora da pasta e acessa qualquer endereço da rede. Com os agentes de fora (OpenCode, Codex e os outros), é pior: eles rodam os próprios comandos dentro do processo deles, e o núcleo só vê o que o agente decide perguntar. O OpenCode, por exemplo, não tem isolamento nenhum ([R2](../../10-pesquisa/rev-0.2/r2-sandbox.md)).

Por isso o comando ainda pede aprovação humana (com os escopos decididos pelo Pai em 2026-10-21), e o modo "Sem perguntas" vem com aviso fixo. O M2 troca confiança por contenção.

**Resultado do M2:**
- **Contenção pelo sistema operacional:** um comando, do Buddy ou de um agente, roda contido pelo sistema operacional. Ele lê e escreve só a pasta de trabalho e o que a política liberar, e a tentativa de sair falha no próprio sistema, não por educação do agente.
- **Rede negada por padrão:** o comando só alcança os domínios que a sessão liberou, por um proxy do núcleo. Cada domínio novo é uma aprovação ("rede", R3).
- **Agentes de fora contidos:** o processo do agente inteiro (OpenCode, Codex…) roda contido, o que limita os comandos que ele roda por conta própria.
- **Medido no computador do Pai:** o spike mede, no Windows 11 dele, qual das duas bibliotecas candidatas contém de verdade, quanto custa (memória e latência por comando) e quanto bloqueia sem necessidade.

## Escopo

1. **Spike `@anthropic-ai/sandbox-runtime` × `@microsoft/mxc-sdk`** (proposta de dependência; nada se instala antes da aprovação do Pai).
   - Os dois rodam a mesma bateria de 12 tentativas de fuga, a mesma bateria de 10 comandos legítimos (`node`, `npm test`, `git status`, leitura e escrita na pasta) e o mesmo agente real (OpenCode) dentro da contenção.
   - Mede: tentativas contidas, comandos legítimos bloqueados sem necessidade, memória e latência por comando, tempo de preparo, o que exige administrador e o que fica instalado na máquina.
   - Roda primeiro no Windows do Pai, que é o caso difícil e o ambiente real. O Linux e o macOS rodam na CI (GitHub Actions `ubuntu-latest` e `macos-latest`), com a mesma bateria.
   - O resultado vira uma ADR com a escolha. A biblioteca perdedora não entra no projeto.
2. **Camada de execução no núcleo** (`packages/core/src/sandbox/`):
   - uma interface única (`execute`, `spawn`), com uma implementação por biblioteca, e a escolhida ligada por padrão;
   - um perfil por sessão: a pasta de trabalho com leitura e escrita; leitura do que o comando precisa para rodar (runtime, PATH); negação dos caminhos protegidos (os mesmos do motor de política: `.git/`, `.buddy-dev/`, `.env*`, chaves); rede negada;
   - o `run_command` do Buddy passa por ela;
   - o processo de cada agente de fora também passa por ela.
3. **Rede por proxy com lista por sessão.**
   - A lista começa vazia, mais os domínios do provedor do próprio agente (sem eles, o agente não fala com o modelo).
   - Um domínio novo vira um cartão de aprovação "rede" com os quatro escopos.
   - O proxy registra no log cada destino, com a decisão.
4. **Política e contenção juntas.**
   - Com a contenção ativa e confirmada, o comando dentro da pasta deixa de pedir aprovação no modo Manual. É o critério do ROADMAP: "comandos no workspace rodam sem prompt".
   - Sem contenção (máquina sem suporte, preparo não feito, falha do spike), tudo continua como hoje, e a console diz por quê.
5. **Preparo da máquina** pela console, nunca por terminal (regra do Pai).
   - Se a biblioteca escolhida exigir um preparo com administrador (as duas exigem em algum caso, veja as fontes), a console mostra um botão "Preparar a contenção".
   - O botão explica o que será instalado e como desfazer, e abre o pedido de administrador do Windows (UAC). O Pai aprova ou não.
   - Desfazer também é um botão.
6. **Worktree por sessão** (R5-4; ADR 0009): a escrita do agente acontece num worktree git da sessão, e integrar na pasta do Pai é uma aprovação com o diff, com desfazer.

**Fora (vai para depois do M2):**
- VM descartável para plugin de terceiro (S2);
- execução remota (S3);
- contenção de interface gráfica (abrir janelas e apps);
- o perfil AppArmor do Ubuntu 24.04+ além do que a biblioteca escolhida já documenta;
- claims com geração sobre arquivos e worktrees (R5-3; fica no M2 só se o spike couber no prazo).

## Decisões técnicas (cada uma com fonte)

| Decisão | Por quê | Fonte |
|---|---|---|
| Spike antes de escolher | Em 2026-10-21, as duas candidatas mudaram desde a R2: o `sandbox-runtime` ganhou Windows em alfa (conta `srt-sandbox` dedicada, barreira de rede WFP, token restrito, ACLs) e o MXC chegou à 1.0.1 com ProcessContainer padrão no Windows 11 | READMEs das duas, lidos ao vivo ([ficha](../../20-conhecimento/sandbox-e-permissoes.md)) |
| Windows primeiro | É o ambiente do Pai e o caso que a R2 marcou como fraco; o Claude Code ainda roda sem sandbox no Windows nativo | R2; documentação do Claude Code |
| O agente de fora inteiro dentro da contenção | O núcleo não vê os comandos que o agente roda sozinho; conter o processo dele é o único jeito de limitar isso | R2 (OpenCode sem isolamento); M1.2d |
| Proxy de rede do núcleo, com lista por sessão | Padrão dos harnesses atuais; o `sandbox-runtime` já traz proxy HTTP/SOCKS5, e o MXC tem política de saída por backend | R2; READMEs |
| Contenção confirmada antes de afrouxar a pergunta | Sem a confirmação (o `sandbox-runtime` prova a barreira a cada `initialize()`; o MXC tem `getPlatformSupport()`), afrouxar seria confiança disfarçada | READMEs |

## Critérios de aceitação (observáveis; cada um vira teste, e nenhum teste se afrouxa)

1. **Bateria de fuga contida:** com a contenção ligada, as 12 tentativas falham no sistema operacional e ficam no log com o motivo. As tentativas são:
   - ler `~/.ssh` e o `.env` da pasta;
   - escrever fora da pasta e em `.git/`;
   - apagar um caminho protegido pelo diretório pai;
   - abrir uma conexão direta sem o proxy;
   - resolver um domínio não liberado;
   - iniciar um processo que tente sair da contenção (no Windows, por agendador de tarefas);
   - e as demais da bateria, descritas no plano.
2. **Comandos legítimos passam:** os 10 comandos legítimos rodam com o mesmo resultado de fora da contenção (código de saída e saída).
3. **Agente real contido:** o OpenCode real, dentro da contenção, conversa com o modelo (domínio do provedor liberado), escreve na pasta e falha ao escrever fora dela, sem cartão.
4. **Rede por aprovação:** um `curl` (ou `node fetch`) para um domínio novo vira cartão "rede"; aprovar "nesta conversa" libera o mesmo domínio na mesma conversa, e negar devolve a falha ao comando.
5. **Sem contenção, nada muda:** numa máquina sem suporte, o comportamento é o de hoje, com aprovação, e a console mostra o motivo.
6. **Sem prompt dentro da pasta:** com a contenção confirmada, no modo Manual, um comando dentro da pasta roda sem cartão. Fora dela, ou com rede nova, pergunta.
7. **Preparo pela console:** o botão "Preparar a contenção" explica o que será feito e abre o pedido de administrador. "Desfazer" remove o que foi instalado, conferido pelo estado que a própria biblioteca informa.
8. **Medido e registrado:** memória e latência por comando, tempo de preparo e taxa de bloqueio indevido, nos três sistemas (Windows no computador do Pai; Linux e macOS na CI), num registro em `docs/registros/`.
9. **Worktree por sessão:** a escrita do agente acontece no worktree da sessão; integrar mostra o diff e pede aprovação; desfazer volta ao estado anterior.

## Métricas (registradas)

Tentativas de fuga contidas sobre o total; bloqueios indevidos sobre comandos legítimos; memória e latência por comando, com e sem contenção; tempo de preparo; cartões de rede por sessão.

## Fontes de verdade

- [R2 — isolamento de execução](../../10-pesquisa/rev-0.2/r2-sandbox.md) e [R3 — aprovações](../../10-pesquisa/rev-0.2/r3-aprovacoes.md)
- [Ficha de sandbox e permissões](../../20-conhecimento/sandbox-e-permissoes.md), reverificada em 2026-10-21
- [ADR 0009](../../60-decisoes/0009-aprovacoes-com-escopo.md) (aprovações com escopo e worktree) e [ADR 0012](../../60-decisoes/0012-canais-globais-rede-e-buzz.md) (web como rede)
- [DEPENDENCIAS.md](../../30-governanca/DEPENDENCIAS.md): versão exata, licença, ficha e aprovação do Pai

## Capacidade do produto que esta unidade antecipa

O "Sem perguntas" seguro: com contenção, liberar tudo dentro da pasta deixa de ser um risco para o resto do computador.

## Riscos e rollback

- **A contenção quebra comandos legítimos** (no Windows, ferramentas que usam o TLS do sistema não fazem HTTPS sob o token restrito do `sandbox-runtime`: `curl.exe` do Windows, `Invoke-WebRequest`, `winget`, `dotnet restore`). Mitigação: a bateria legítima mede isso, e o cartão explica e oferece rodar fora da contenção com aprovação. Rollback: a contenção é uma chave, desligável na console.
- **O preparo deixa coisas na máquina** (conta de usuário dedicada e filtros de rede no `sandbox-runtime`; permissões na raiz do disco no MXC, em alguns casos). Mitigação: tudo explicado antes, com desfazer pela console.
- **Alfa e versões novas:** o `sandbox-runtime` marca o Windows como alfa, e o MXC tem backends experimentais. Mitigação: versão exata fixada, reverificação a cada 30 dias (`bd deps`) e o spike no ambiente real.
- **Agentes que já se contêm** (o Codex usa o próprio MXC no Windows). Mitigação: medir se a contenção dupla funciona ou se basta a do agente, e registrar.

## Dúvidas para o Pai (bloqueiam só o que depende delas)

1. **Aprovar a SPEC** (o que o M2 entrega e como saberemos que deu certo).
2. **Aprovar as duas bibliotecas para o spike:**
   - `@anthropic-ai/sandbox-runtime` 0.0.81, Apache-2.0, da Anthropic;
   - `@microsoft/mxc-sdk` 1.0.1, MIT, da Microsoft.

   Elas entram só para o spike, numa branch. A perdedora sai antes do merge.
3. **Autorizar o preparo de administrador no seu computador durante o spike**, pelo pedido do Windows, com desfazer ao fim se a biblioteca perder.
