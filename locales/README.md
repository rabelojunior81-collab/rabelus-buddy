# Localização do produto

Idiomas do produto: **pt-BR** (padrão) e **en** ([ADR 0002](../docs/60-decisoes/0002-idiomas-pt-br-e-en.md)).

Toda string visível ao usuário, em qualquer superfície do buddy (CLI/TUI, Web UI, desktop, mensagens de canal), sai de catálogo de tradução desde a primeira linha de código; nenhuma string fica embutida.

- **Biblioteca:** i18next (SPEC 0001, decisão 5), carregada por `@rabelus-buddy/client/i18n`.
- **Estrutura:** `locales/pt-BR/<domínio>.json` e `locales/en/<domínio>.json`, as mesmas chaves nos dois.
- **Plural:** sufixos `_one`/`_other` com a variável `count` (Intl.PluralRules).
- **Idioma:** `--lang`, depois `RBUDDY_LANG`, depois pt-BR.
- **Conferido por teste:** `packages/client/test/i18n.test.ts` (mesmas chaves nos dois idiomas; toda chave usada no código existe).
