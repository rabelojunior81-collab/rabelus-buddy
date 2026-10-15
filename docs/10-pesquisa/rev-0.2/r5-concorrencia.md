# R5 — Concorrência como premissa fundacional

**Revisão:** 0.2 · **Limite tratado:** 7 (concorrência periférica na 0.1) · **Autor:** buddy-dev (claude-code-5c038b) · **Data:** 2026-10-14

## O problema na 0.1

A pesquisa de origem tratou concorrência como detalhe de implementação: "um escritor por banco; executor serializado por sessão; sessões concorrentes em paralelo" (relatório, §8). Não definiu **quem** concorre, **por qual recurso**, nem **o que acontece quando um efeito externo fica com resultado desconhecido**. A família já pagou por esse erro: uma SPEC do LARS foi reprovada pelo Pai por omitir simultaneidade ("A Concorrência Devia Estar na Fundação", Blog, 2026-10-06).

## Fatos verificados

| Fato | Fonte | Data |
|---|---|---|
| No WAL, "there can only be one writer at a time" | https://sqlite.org/wal.html (tier 0; página atualizada em 2026-08-25) | 2026-10-14 |
| "All processes using a database must be on the same host computer; WAL does not work over a network filesystem." | idem | 2026-10-14 |
| Checkpoint automático a 1000 páginas; sem checkpoint, o WAL "will grow without bound" | idem | 2026-10-14 |
| Bug de WAL-reset corrigido a partir da 3.51.3 (2026-03-13) | idem | 2026-10-14 |
| Release mais recente do SQLite: 3.54.0 | https://sqlite.org/download.html (`sqlite-autoconf-3540000`) | 2026-10-14 |
| `node:sqlite` do Node v26.11.1 embarca SQLite 3.53.4 | medição local (`select sqlite_version()`) | 2026-10-14 |
| `node:sqlite`: "Stability: 1.2 - Release candidate" na documentação do v26.11.1 | https://nodejs.org/api/sqlite.html (tier 0) | 2026-10-14 |
| Índice git compartilhado mistura commits de executores diferentes; quem commita não é necessariamente quem agiu; timeout não prova que o efeito remoto não ocorreu | Blog, LARS, 2026-10-06 (família) | 2026-10-14 |

## Quem concorre no Rabelus Buddy

| # | Concorrência | Exemplo | Recurso disputado |
|---|---|---|---|
| C1 | Sessões paralelas no mesmo host | CLI e Telegram trabalhando ao mesmo tempo | banco de estado, arquivos do workspace, orçamento do mês |
| C2 | Subagentes dentro de uma sessão | agente principal + dois subagentes de pesquisa | histórico da sessão, ferramentas, orçamento da sessão |
| C3 | Agentes externos via ACP | OpenCode editando enquanto o núcleo também age | arquivos do workspace, terminal |
| C4 | Canais entregando eventos ao mesmo tempo | dois webhooks do mesmo usuário em sequência rápida; reentrega | fila de entrada, ordem da conversa |
| C5 | Núcleo local × gateway remoto | gateway recebe mensagem enquanto o núcleo está offline | estado da conversa, aprovações pendentes |
| C6 | Humano × agente | o Pai edita um arquivo enquanto o agente o altera | arquivos do workspace |

## Requisitos fundacionais (candidatos à SPEC do M0)

Cada requisito vem com um critério observável, para virar teste.

1. **Um dono do banco.** Um único processo do núcleo escreve no SQLite; outros processos (CLI, UI, runners) falam com ele por IPC. *Teste:* duas CLIs abertas emitem comandos simultâneos; nenhum `SQLITE_BUSY` chega ao usuário e a ordem dos eventos é total por sessão.
2. **Gateway nunca compartilha o banco do núcleo.** O WAL não atravessa máquinas; o gateway tem armazenamento próprio e entrega eventos ao núcleo com chave de idempotência. *Teste:* a mesma mensagem reentregue três vezes gera um único evento.
3. **Recursos com claim e geração.** Arquivo, worktree, item de memória e orçamento são recursos; quem altera precisa de um claim com prazo e de uma revisão esperada (compare-and-set). *Teste:* duas sessões tentam alterar o mesmo arquivo; a segunda recebe conflito explícito, nunca sobrescreve.
4. **Isolamento de sistema de arquivos por sessão.** Cada sessão que altera código trabalha num worktree próprio; integração é um passo explícito, com diff e aprovação. *Teste:* duas sessões editando o mesmo repositório não veem os arquivos uma da outra até a integração.
5. **Efeito externo com identidade estável.** Toda ação com efeito fora do processo (API, mensagem, instalação) tem uma intenção com id; tentativas e recibos são separados. Timeout gera estado **desconhecido**, que exige reconciliação antes de nova tentativa. *Teste:* uma chamada de API que expira não é reenviada sem verificação; o estado aparece como "desconhecido" na UI.
6. **Orçamento como recurso atômico.** Gastos são reservados antes da chamada e liquidados depois; sessões paralelas não estouram o teto juntas. *Teste:* N sessões simultâneas com orçamento restante para uma só chamada; só uma chamada sai.
7. **Retomada a partir do log.** Matar o processo no meio de uma execução e reiniciar reprojeta o estado dos eventos; aprovações pendentes sobrevivem. *Teste:* `kill -9` durante uma chamada de ferramenta; ao reiniciar, a execução aparece interrompida com o efeito em estado conhecido ou desconhecido, nunca "concluída" sem recibo.
8. **Humano vence.** Alteração humana detectada num arquivo sob claim do agente invalida o claim e pede nova leitura. *Teste:* editar o arquivo à mão durante uma sessão; a próxima escrita do agente é recusada com conflito.

## O que o buddy-dev já pratica (protótipo)

O barramento de desenvolvimento ([ADR 0005](../../60-decisoes/0005-barramento-ledger-por-arquivo.md)) já implementa, em pequeno, os requisitos 3 e 4 (claims com prazo entre worktrees; uma sessão por worktree) e a parte de identidade de origem do 5 (cada evento guarda sessão, harness, modelo, host, branch). Ainda não implementa geração/compare-and-set nem estado "desconhecido".

## Decisões em aberto

- `node:sqlite` (Release candidate, sem dependência) ou biblioteca externa madura para o núcleo: decidir na SPEC do M0, com teste de carga dos requisitos 1 e 7.
- Granularidade dos claims (arquivo, diretório, símbolo?): decidir na SPEC do M2.

## Estado do limite 7

**Resolvido no nível de pesquisa:** os requisitos acima entram como premissa obrigatória da SPEC do M0, não como extensão futura.
