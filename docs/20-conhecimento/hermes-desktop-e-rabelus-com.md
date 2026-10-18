# Hermes Desktop (Kanban, Bots, sandbox) e rabelus.com (tipografia e estilo)

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-18T01:49:16-03:00 · **Estado:** vigente (referência, não dependência)

Pedido do Pai em 2026-10-18 (decisões da SPEC 0002, item 2): levar ao M1 a tipografia e os cantos do portfólio dele e usar o Kanban e os Bots do Hermes Desktop como referência de painel e de sandbox por agente.

## Fontes e como foram lidas

- **Instalação local do Hermes**, em `%LOCALAPPDATA%\hermes`: leitura autorizada pelo Pai. Li só código, documentação e configuração filtrada. **Não abri** arquivos de credencial, como o `auth.json`. No `config.yaml`, só li linhas sem key, token, secret ou password.
- **Repositório e documentação oficiais da Nous Research** (Hermes Agent e Hermes Desktop), consultados ao vivo em 2026-10-18.
- **rabelus.com**: estilo calculado no navegador (`getComputedStyle`) na página publicada, em 2026-10-18.

## Hermes: Kanban (orquestração)

- **Quadro em SQLite** com os estados triage, todo, ready, running, blocked, review, done e archived.
- **Painel escuro no estilo do Linear:**
  - colunas com contagem;
  - ponto de estado colorido;
  - chips de prioridade e de tenant;
  - cartão com id, título, prioridade, tenant, responsável, comentários e links, progresso N/M e idade;
  - barra com busca, filtros de tenant e de responsável, mostrar arquivados, raias por perfil e "Nudge dispatcher";
  - arrastar e soltar;
  - gaveta lateral de detalhe;
  - atualização ao vivo por WebSocket.
- **Despachante:** atribui cada tarefa a um perfil e roda o worker num processo isolado. O workspace pode ser `scratch`, `dir` ou `worktree`.
- **Para o buddy:** é a forma do painel de orquestração da M1.5. Uma coluna por estado da tarefa delegada, um cartão por tarefa com o harness como responsável, e a gaveta de detalhe mostrando o andamento ao vivo (`run.live`). O `worktree` por tarefa repete a regra do repositório: uma sessão por worktree.

## Hermes: Bots e sandbox

- **Bot Mode:** cada bot é um **perfil** com chat, memória, skills, modelo e Routines (cron) próprios.
- **Backends de terminal:** local, ssh, docker, singularity, modal e daytona.
  - Há uma imagem com área de trabalho gráfica: `nousresearch/hermes-sandbox:desktop`.
  - Cada backend aceita limites de CPU, memória e disco, e persistência.
  - Na máquina do Pai, a configuração é `backend: "local"`.
- **A documentação oficial não descreve "uma VM por bot".** **PROVÁVEL:** a "máquina virtual com tela" que o Pai viu é um bot cujo terminal roda no backend docker com a imagem desktop.
- **Cua** (`%LOCALAPPDATA%\Programs\Cua\cua-driver`, computer-use) também está instalado. **HIPÓTESE:** é o que dá a um agente olhos e mãos numa tela.
- **Para o buddy:** referência do M2, a sandbox por agente. Cada harness orquestrado (e o próprio Buddy) teria um workspace isolado, com escolha de backend e limites, e, quando precisar de interface gráfica, uma tela própria que o Pai possa assistir. Isso não entra no M1. **Nada foi instalado.**

## rabelus.com: tipografia e estilo (medido)

- **Fonte:** `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, **sem webfont baixada**: usa a Inter instalada no sistema, ou a fonte do sistema.
- **Títulos:**
  - h1 com 92,8 px, peso 700 e espaçamento de −0,075 em;
  - h2 com 49,6 px e espaçamento de −0,055 em.
- **Texto:** 16 px, com linha de 1,6.
- **Etiqueta:** em maiúsculas, com espaçamento aberto e moldura dourada fina.
- **Raio de borda 0 em tudo** (cantos retos).
- **Bordas:** `0.89px solid rgba(180,200,230,.18)`.
- **Cartões:**
  - preenchimento `linear-gradient(rgba(255,255,255,.07), rgba(255,255,255,.024))`;
  - sombra `0 24px 80px rgba(0,0,0,.42)`.
- **Fundo:** `rgb(7,10,18)`, com brilhos radiais (ciano a 18% 8%, dourado a 78% 12%) e uma grade sutil.
- **Título com texto em degradê:** branco, depois dourado, ciano e lilás.
- **Botão principal:** borda dourada e preenchimento em degradê.

## Como entrou no protótipo v4 (2026-10-18)

- **Cantos e bordas:** cantos retos em tudo; bordas finas e translúcidas.
- **Vidro "liquid glass":** desfoque com saturação, reflexo claro na borda de cima e sombra interna.
- **Tipografia:** a pilha Inter do portfólio, com títulos de espaçamento apertado e a etiqueta em maiúsculas.
- **Fundo:** degradê mais forte, com brilhos oliva e dourados e a grade.
- **Interação:** brilho que segue o cursor e entradas suaves, respeitando a preferência por menos movimento.
- **Cores:** a paleta continua oliva (cor B). Do portfólio vêm a forma e a luz, não as cores. O dourado só aparece nos detalhes.
