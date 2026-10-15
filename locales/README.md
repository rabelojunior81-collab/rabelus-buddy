# Localização do produto

Idiomas do produto: **pt-BR** (padrão) e **en** ([ADR 0002](../docs/60-decisoes/0002-idiomas-pt-br-e-en.md)).

Toda string visível ao usuário, em qualquer superfície do buddy (CLI/TUI, Web UI, desktop, mensagens de canal), sai de catálogo de tradução desde a primeira linha de código; nenhuma string fica embutida. O formato do catálogo e a biblioteca de i18n serão escolhidos na SPEC da primeira superfície, com pesquisa ao vivo.

Estrutura prevista: `locales/pt-BR/` e `locales/en/`, um arquivo por domínio.
