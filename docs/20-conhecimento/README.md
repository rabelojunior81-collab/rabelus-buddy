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
| [ci-github-actions.md](./ci-github-actions.md) | Actions fixadas por SHA, gitleaks, cota e preço dos minutos, plano de minutos da CI | 2026-10-18 |
| [precos-llm.md](./precos-llm.md) | Preços de Anthropic, OpenAI, Google e dos modelos do OpenCode Go | 2026-10-16 (reverificar antes de 30/11) |
| [cua-computador-para-agentes.md](./cua-computador-para-agentes.md) | Cua: um computador (sandbox) para cada agente; candidato ao nível S2 da contenção | 2026-10-25 |
| [sandbox-e-permissoes.md](./sandbox-e-permissoes.md) | Isolamento de execução e modelos de permissão | 2026-10-14 |
| [projetos-comparaveis.md](./projetos-comparaveis.md) | Harnesses, agentes e gateways abertos | 2026-10-14 |
| [assinaturas-de-agentes.md](./assinaturas-de-agentes.md) | OpenCode Go, Sign in with ChatGPT, Ollama Cloud, OpenRouter; esforço de raciocínio | 2026-10-17 |
| [banco-e-ipc.md](./banco-e-ipc.md) | `node:sqlite`, better-sqlite3, IPC por named pipe e socket Unix; spike do M0 | 2026-10-15 |
| [bibliotecas-do-nucleo.md](./bibliotecas-do-nucleo.md) | CLI, TUI, i18n, SDKs do provedor, limites da OpenAI | 2026-10-15 |
| [pi-agent.md](./pi-agent.md) | Pi (earendil-works): harness, extensões, provedores; forkar ou compor | 2026-10-15 |
| [acp-permissoes-dos-harnesses.md](./acp-permissoes-dos-harnesses.md) | Como fazer o harness pedir permissão ao núcleo: modo `read-only` do Codex por `session/set_config_option`; `permission: ask` do OpenCode por `OPENCODE_CONFIG_CONTENT`; medido ao vivo | 2026-10-18 |
| [acp-registro-e-orquestradores.md](./acp-registro-e-orquestradores.md) | Registro oficial do ACP (42 agentes, ícones, como iniciar), SDK TypeScript, o modelo do AionUi; harnesses na máquina do Pai; imagem na entrada | 2026-10-18 |
| [t3-referencias.md](./t3-referencias.md) | create-t3-app (axiomas, pilha, estado) e t3.chat (layout, tokens, vidro, paleta) | 2026-10-17 |
| [hermes-desktop-e-rabelus-com.md](./hermes-desktop-e-rabelus-com.md) | Hermes Desktop (Kanban, Bots, backends de sandbox) e rabelus.com (tipografia, cantos, vidro) | 2026-10-18 |
| [stacks-mobile-e-web.md](./stacks-mobile-e-web.md) | Expo/React Native, Flutter, Compose MP, Capacitor, Tauri, PWA no iOS | 2026-10-15 |
| [gemini-imagem.md](./gemini-imagem.md) | Geração de imagem com Gemini (Nano Banana), preços e boas práticas | 2026-10-15 |
| [modos-de-permissao-dos-agentes.md](./modos-de-permissao-dos-agentes.md) | Modos, regras e escopos de permissão do Claude Code, do Codex e do OpenCode | 2026-10-20 |
| [acp-opcoes-de-sessao.md](./acp-opcoes-de-sessao.md) | Opções de sessão do ACP (modelo, modo, esforço) e o que cada harness declara | 2026-10-20 |
| [github-repositorio-publico-e-pages.md](./github-repositorio-publico-e-pages.md) | O que muda ao tornar o repositório público; publicar pelo GitHub Pages | 2026-10-20 |
