# Changelog

Todas as mudanças relevantes do **produto** Rabelus Buddy ficam registradas aqui.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/).

> O registro granular do desenvolvimento (cada ação do buddy-dev) mora em `.buddy-dev/CHANGELOG.md` e no ledger `.buddy-dev/bus/ledger/`. Este arquivo é a visão do produto para quem o usa.

## [Não publicado]

### Adicionado

- Núcleo (M0.3): execuções, efeitos externos (intenção, tentativa, recibo) e aprovações como eventos; retomada depois de `kill -9` (execução interrompida, efeito sem recibo "desconhecido" e bloqueado até a reconciliação, aprovação pendente preservada); `rbuddy approvals`, `approve` e `deny`; o log recusa evento de domínio malformado.

- Núcleo (M0.2): log de eventos em SQLite com sequência contígua por sessão e projeções reconstruíveis; processo dono único (`rbuddy daemon start|status|stop`) servindo JSON-RPC 2.0 por named pipe (Windows) ou socket Unix; cliente IPC compartilhado.

- CLI `rabelus-buddy`/`rbuddy` (M0.1): `--help`, `--version` e `--lang`, com mensagens do catálogo pt-BR/en; TypeScript executado direto pelo Node, com checagem de tipos na CI em Windows, Linux e macOS (Node 24 e 26).

- Ferramentas de desenvolvimento `bd`: relógio de Curitiba verificado, nomes com carimbo, barramento com ledger, arquivo morto governado, guarda contra exclusão.
- `bd`: gate do Blog (`session end` recusa sem post e daily publicados; `blog-check`) e checagem de superfícies (`surfaces`: índices, ADR aceita citada como proposta, carimbos, `main` do STATUS), também na CI.
- `bd`: protocolo de dependências (`deps`, `deps --latest`, rotina semanal na CI) e trava de testes (`test-guard`: a suíte não perde testes nem asserções, sem `skip`/`todo`/`only`), ambos no `bd post` e na CI.
- `bd`: merge governado (`merge`: CI verde e `bd post` limpo antes do merge commit), prune de branches (`prune`: mergeadas removidas, abandonadas arquivadas em tag) e registro de validações (`validacoes`), com o `bd pre` reprovando branch para podar.
- Superfície open source: licença Apache-2.0, README e guia de contribuição em pt-BR e en, Código de Conduta, política de segurança.
