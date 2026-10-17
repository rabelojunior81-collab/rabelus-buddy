# Banco de conhecimento

**Classe:** CONHECIMENTO · Fonte de verdade para fatos externos que o projeto usa.

Regra: **conhecimento não vem da memória do modelo.** Todo fato externo (versão, preço, limite, licença, comportamento de ferramenta) entra aqui verificado ao vivo, com fonte e data, antes de virar premissa de SPEC, plano ou código.

## Formato de uma ficha

Uma ficha por tema, com endereço fixo (`<tema>.md`). O conteúdo envelhece; por isso cada ficha tem:

1. **Cabeçalho:** classe, última verificação (carimbo de Curitiba) e estado (`vigente`, `a reverificar`, `obsoleta`).
2. **O que importa para o buddy:** 2 a 5 linhas.
3. **Fatos verificados:** tabela com fato, fonte (tier) e data.
4. **Explicação:** o porquê, em linguagem de aula.
5. **Implicações:** o que muda no projeto.
6. **Histórico de verificações:** append-only; nunca se apaga uma verificação antiga.

## Tiers de fonte

| Tier | Fonte |
|---|---|
| 0 | Documentação oficial, especificação, texto de licença |
| 1 | Repositório oficial (releases, tags, código) |
| 2 | Comunidade verificada (fórum oficial, mantenedores) |
| 3 | Blogs técnicos e cobertura independente |
| 4 | Web genérica (só como pista, nunca como prova) |

Antes de qualquer tier: a casa e a família (este repositório, o [Blog](https://rabelus.online) e os corpus dos irmãos).

## Fichas

| Ficha | Tema | Última verificação |
|---|---|---|
| [relogio-e-fuso.md](./relogio-e-fuso.md) | Hora de Curitiba, tzdata, fontes de relógio | 2026-10-14 |
| [node-runtime.md](./node-runtime.md) | Versões do Node.js e estado do `node:sqlite` | 2026-10-15 |
| [padroes-comunidade-oss.md](./padroes-comunidade-oss.md) | Licença, código de conduta, changelog, commits, ADR | 2026-10-14 |
| [github-plataforma.md](./github-plataforma.md) | Plano (Free, medido), proteções de branch, segurança | 2026-10-15 |
| [bmad-method.md](./bmad-method.md) | BMad Method: versões, caminhos, artefatos | 2026-10-14 (reverificar após 16/10) |
| [ci-github-actions.md](./ci-github-actions.md) | Actions fixadas por SHA, gitleaks | 2026-10-14 |
| [precos-llm.md](./precos-llm.md) | Preços de Anthropic, OpenAI, Google e dos modelos do OpenCode Go | 2026-10-16 (reverificar antes de 30/11) |
| [sandbox-e-permissoes.md](./sandbox-e-permissoes.md) | Isolamento de execução e modelos de permissão | 2026-10-14 |
| [projetos-comparaveis.md](./projetos-comparaveis.md) | Harnesses, agentes e gateways abertos | 2026-10-14 |
| [assinaturas-de-agentes.md](./assinaturas-de-agentes.md) | ChatGPT Plus (Codex) e OpenCode Go via ACP | 2026-10-14 |
| [banco-e-ipc.md](./banco-e-ipc.md) | `node:sqlite`, better-sqlite3, IPC por named pipe e socket Unix; spike do M0 | 2026-10-15 |
| [bibliotecas-do-nucleo.md](./bibliotecas-do-nucleo.md) | CLI, TUI, i18n, SDKs do provedor, limites da OpenAI | 2026-10-15 |
| [pi-agent.md](./pi-agent.md) | Pi (earendil-works): harness, extensões, provedores; forkar ou compor | 2026-10-15 |
| [stacks-mobile-e-web.md](./stacks-mobile-e-web.md) | Expo/React Native, Flutter, Compose MP, Capacitor, Tauri, PWA no iOS | 2026-10-15 |
| [gemini-imagem.md](./gemini-imagem.md) | Geração de imagem com Gemini (Nano Banana), preços e boas práticas | 2026-10-15 |
