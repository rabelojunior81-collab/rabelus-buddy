# Changelog

Todas as mudanças relevantes do **produto** Rabelus Buddy ficam registradas aqui.

O formato segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/).

> O registro granular do desenvolvimento (cada ação do buddy-dev) mora em `.buddy-dev/CHANGELOG.md` e no ledger `.buddy-dev/bus/ledger/`. Este arquivo é a visão do produto para quem o usa.

## [Não publicado]

### Adicionado

- Ferramentas de desenvolvimento `bd`: relógio de Curitiba verificado, nomes com carimbo, barramento com ledger, arquivo morto governado, guarda contra exclusão.
- `bd`: gate do Blog (`session end` recusa sem post e daily publicados; `blog-check`) e checagem de superfícies (`surfaces`: índices, ADR aceita citada como proposta, carimbos, `main` do STATUS), também na CI.
- `bd`: protocolo de dependências (`deps`, `deps --latest`, rotina semanal na CI) e trava de testes (`test-guard`: a suíte não perde testes nem asserções, sem `skip`/`todo`/`only`), ambos no `bd post` e na CI.
- `bd`: merge governado (`merge`: CI verde e `bd post` limpo antes do merge commit), prune de branches (`prune`: mergeadas removidas, abandonadas arquivadas em tag) e registro de validações (`validacoes`), com o `bd pre` reprovando branch para podar.
- Superfície open source: licença Apache-2.0, README e guia de contribuição em pt-BR e en, Código de Conduta, política de segurança.
