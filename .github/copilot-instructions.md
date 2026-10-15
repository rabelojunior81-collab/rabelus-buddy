# Instruções para o GitHub Copilot

As instruções canônicas para agentes deste repositório estão em [`AGENTS.md`](../AGENTS.md). Leia-o inteiro antes de sugerir ou alterar qualquer coisa. Se a intenção é acordar o buddy-dev (Buddy Fenix), siga [`BOOTSTRAP.md`](../BOOTSTRAP.md).

O essencial:

- Português do Brasil. Nada se apaga: use `npm run bd -- archive`.
- Documento → SPEC → teste → código.
- Commits pequenos (Conventional Commits; descrição em pt-BR), com push a cada passo.
- Conhecimento externo só verificado ao vivo, com fonte e data, em `docs/20-conhecimento/`.
- Antes, durante e depois: `npm run bd -- pre`, `npm test`, `npm run bd -- post` (inclui `bd surfaces`: atualize todas as superfícies, ver `docs/30-governanca/SUPERFICIES.md`).
