# 06 — Sessões, concorrência, filesystem e persistência

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. Esta frente trata do modelo de estado; memória e índice de conhecimento estão na nota 07 e eventos de agente na nota 01.

## Resumo

- **SQLite em WAL é a base correta** para uso individual local: leitores não bloqueiam escritor e escritor não bloqueia leitores, mas **só existe um escritor por vez**; WAL não funciona em filesystem de rede; checkpoint automático a cada 1.000 páginas [1].
- **Bug do WAL-reset:** afeta SQLite de 3.7.0 a 3.51.2 (corrigido em 3.51.3, de 13/03/2026), exige duas ou mais conexões escrevendo ou fazendo checkpoint ao mesmo tempo. Regra prática: versão atualizada do SQLite e um único escritor por banco [1].
- **Litestream** (v0.5.x, mantido) roda como processo separado e replica mudanças do SQLite continuamente para armazenamento em nuvem ou arquivos locais, sem mudança de código, com recuperação até a última transação replicada [2].
- **Modelo de estado:** SQLite canônico + arquivos versionados (Markdown/YAML) como fonte de verdade para identidade, políticas e conhecimento; SQLite como índice reconstruível (nota 07).
- **Concorrência sem servidor de banco:** um executor por sessão, serializado; sessões diferentes em paralelo; aprovações como linhas de estado; idempotência por chave de evento.
- **Retomada após reinício:** máquina de estados derivada do log de eventos; checkpoint por passo; nada de "retomar do zero".
- **Sincronização local ↔ gateway:** conexão de saída do núcleo, com fila e confirmação; sem CRDT e sem banco compartilhado.

## Fatos verificados

### 1. SQLite WAL [1]

- WAL: leitores não bloqueiam escritor, escritor não bloqueia leitores; leitura e escrita concorrentes; menos fsync; I/O mais sequencial.
- **Um único escritor por vez** (um só arquivo WAL). Checkpoint roda concorrente com leitores, mas para em páginas além do "end mark" de leitores ativos.
- **WAL não funciona em filesystem de rede** — todos os processos no mesmo host.
- Checkpoint automático quando o WAL passa de 1.000 páginas (~4 MB); checkpoint starvation ocorre quando há sempre ao menos um leitor ativo.
- `PRAGMA synchronous=NORMAL` evita fsync por commit; checkpoint vira a única barreira; transações deixam de ser duráveis contra queda de energia.
- WAL é persistente no arquivo; `-wal` e `-shm` devem acompanhar o banco em cópias.
- WAL-reset bug: 3.7.0 até 3.51.2; corrigido em 3.51.3 (13/03/2026); requer 2+ conexões em threads ou processos distintos escrevendo ou fazendo checkpoint no mesmo instante; ocorrência rara, mas consequência grave (corrupção).
- Modo EXCLUSIVE dispensa memória compartilhada quando só um processo acessa o banco.
- `SQLITE_BUSY` pode ocorrer em casos como conexão em locking exclusivo ou recuperação após crash.

### 2. Litestream [2]

- v0.5.x: ativamente mantido; processo separado; replicação contínua para backends de armazenamento (nuvem ou arquivos locais); recuperação até a transação replicada mais recente; sem alteração de código na aplicação; posicionado como solução de baixo custo ("pennies per day").

### 3. Armazenamento de artefatos

- SQLite e FTS5 e sqlite-vec no mesmo arquivo (nota 07) [3].
- MinIO/S3 e object storage: candidatos apenas para o gateway (nota 05); custos não pesquisados.

## Interpretações

- **I1. Um escritor por banco casa com o modelo de sessão.** O harness tem um processo núcleo; sessões concorrentes são concorrência dentro do processo, não entre processos. Regra: uma única conexão de escrita, transações curtas, `synchronous=NORMAL` com checkpoint em thread separada ou em momentos de pausa. Isso também elimina a condição do bug do WAL-reset (2+ conexões).
- **I2. Estado canônico versus índice.** Sessão, execução, passo, chamada de ferramenta, aprovação e auditoria são estado canônico em SQLite. Identidade, políticas e conhecimento são arquivos versionados; o SQLite indexa (FTS5 + sqlite-vec, nota 07). Perda do banco custa rebuild do índice, não perda de conteúdo.
- **I3. Log de eventos, não event sourcing completo.** Tabela append-only de eventos (`session_id`, `seq`, `tipo`, `payload`, `ts`, `ator`, `hash_anterior`?) com projeções materializadas nas tabelas de sessão. Isso dá retomada barata e auditoria sem a complexidade de replay total. O encadeamento de hashes é opção de integridade (hipótese, não verificada como prática padrão).
- **I4. Idempotência é obrigatória, não opcional.** Canais reentregam eventos (Slack com 3 retries, Discord com 3 segundos para responder — nota 05). Toda entrada externa tem chave de idempotência; toda saída tem registro de envio.
- **I5. Aprovação como estado, não como mensagem.** Pedido de aprovação é linha com `status` (pendente, aprovada, rejeitada, expirada), `expira_em` e `canal`. A execução espera; timeout segue política (por classe de ação, requisito do usuário).
- **I6. Orçamento como estado transacional.** Gasto acumulado por sessão, por dia e por mês, atualizado na mesma transação do passo; estouro dispara bloqueio e evento, não apenas aviso.
- **I7. Backup mínimo viável.** Litestream replicando para pasta local ou nuvem barata; exportação periódica do SQLite com `VACUUM INTO`; artefatos no filesystem com versionamento em Git quando forem texto.
- **I8. Artefatos fora do workspace.** Artefatos grandes (imagens, áudios, PDFs) não vão para o banco: referência por caminho e hash; se o gateway precisar servir, object storage entra só nessa fronteira.
- **I9. Esquema e migrações.** Migrações versionadas e aplicadas na abertura; compatibilidade de versões do esquema registrada no log; nada de mutação destrutiva sem etapa de exportação.
- **I10. Criptografia em repouso.** SQLite não cifra por padrão; SQLCipher é o candidato (não verificado nesta rodada). Segredos não ficam no banco (cofre do sistema, nota 08).

## Hipótese e pontos não confirmados

- H1. SQLCipher no Windows, macOS e Linux com as bibliotecas do projeto: não verificado.
- H2. Custo real de replicação Litestream para objeto storage: não medido (a página promete "pennies per day").
- H3. `VACUUM INTO` como estratégia de exportação: mecanismo documentado do SQLite, mas o fluxo de restore não foi testado.
- H4. Desempenho de FTS5 + sqlite-vec no mesmo SQLite com milhões de eventos: não medido.
- H5. Encadeamento de hashes no log de eventos: proposta do autor; não verificado como prática recomendada.
- H6. Comportamento de sqlite-vec em DELETE e em transações no Windows: herdado da nota 07 (não testado).

## Lacunas e conflitos

- PostgreSQL fica apenas como opção de gateway (vetores compartilhados), coerente com a nota 07.
- Sincronização offline verdadeira (núcleo usado sem rede por longos períodos) não é requisito confirmado; a arquitetura acomoda, mas sem CRDT.
- Retenção e exclusão de eventos: politica a definir pelo usuário (LGPD/GDPR, nota 08).

## Recomendação preliminar

### Modelo de dados (núcleo)

```
usuario(1) — workspace(n) — projeto(n)
sessao(id, workspace_id, canal, estado, orcamento_*)
execucao(id, sessao_id, agente, modelo, estado, inicio, fim)
passo(id, execucao_id, seq, tipo, entrada, saida, latencia, tokens, custo)
chamada_ferramenta(id, passo_id, ferramenta, args_hash, resultado_ref, status)
aprovacao(id, chamada_id, classe, status, expira_em, canal, respondido_em)
evento(id, sessao_id, seq, tipo, payload, ts, ator, idempotencia_key)
orcamento(id, escopo, mes, teto, gasto)
artefato(id, caminho, hash, tamanho, sessao_id)
auditoria(id, ts, ator, acao, alvo, antes_hash, depois_hash, aprovacao_id)
```

- `estado` como máquina explícita: `aberta → executando → aguardando_aprovacao → executando → pausada → concluida | falhou | cancelada`.
- Toda tabela com `created_at`/`updated_at`; exclusão lógica (tombstone) seguida de purge com política.

### Regras de concorrência

1. Uma conexão de escrita por processo; transações curtas; `busy_timeout` configurado.
2. Um executor por sessão; sessões concorrentes em paralelo; subagentes como execuções filhas.
3. Idempotência por `idempotencia_key` em tudo que vem de canal ou de ferramenta.
4. Checkpoint em thread separada; `synchronous=NORMAL`; reconexão com recuperação automática do WAL.
5. Locks somente where necessário: lock de arquivo do workspace por sessão (worktree, nota 04), não lock de banco.

### Retomada e recuperação

- Ao abrir sessão: reprojetar estado a partir do log; execuções `executando` viram `interrompida`; retomada a partir do último passo committed, com nova execução.
- Aprovações pendentes sobrevivem a restart; expiração por política.
- Backup: Litestream contínuo + exportação periódica; restore testado como spike.

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo)

| Opção (pergunta de arquitetura) | Adequação | Maturidade | Extensibilidade | Portabilidade | Segurança | Custo | O&M |
|---|---|---|---|---|---|---|---|
| SQLite WAL como estado canônico | 5 | 5 | 4 | 5 | 4 | 5 | 5 |
| Log de eventos + projeções | 5 | 4 | 4 | 4 | 4 | 5 | 4 |
| Litestream para backup | 4 | 4 | 3 | 4 | 4 | 5 | 4 |
| PostgreSQL no gateway | 3 | 5 | 4 | 2 | 4 | 3 | 3 |
| Event sourcing completo (replay total) | 2 | 3 | 5 | 3 | 3 | 4 | 2 |
| Sincronização com CRDT | 2 | 2 | 4 | 4 | 3 | 4 | 2 |

Justificativas curtas: SQLite WAL é processo único, sem servidor, cross-platform, com semântica de concorrência documentada; o log de eventos dá retomada e auditoria sem replay total; PostgreSQL só se justifica no gateway; CRDT é custo sem requisito confirmado.

### Próximos passos (não executados)

1. Fixar versão mínima do SQLite em 3.51.3+ e testar no Windows.
2. Spike: reprojetar sessão a partir do log após kill do processo.
3. Spike: Litestream replicando para pasta local e restore.
4. Avaliar SQLCipher para dados em repouso.

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | Write-Ahead Logging | SQLite | https://sqlite.org/wal.html | 14/10/2026 |
| 2 | Litestream | Ben Johnson | https://litestream.io/ | 14/10/2026 |
| 3 | SQLite FTS5 | SQLite | https://sqlite.org/fts5.html | via nota 07 (13/10/2026) |
