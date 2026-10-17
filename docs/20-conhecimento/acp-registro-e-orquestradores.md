# ACP: registro oficial de agentes, SDK e o modelo do AionUi

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-17T20:26:17-03:00 · **Estado:** vigente (reverificar a cada marco; o registro muda toda semana)

## O que importa para o buddy

- Existe um **registro oficial de agentes ACP**: o repositório `agentclientprotocol/registry` (Apache-2.0), atualizado em 2026-10-17. Ele publica um `registry.json` agregado numa CDN. Em 2026-10-17 eram **42 agentes**. Cada um traz:
  - `id`, `name`, `version`, `description`, `license` e `license_url`;
  - `icon` (SVG servido pela mesma CDN);
  - `distribution` por `npx` (pacote + args), `uvx` ou `binary` (arquivo por plataforma com `sha256`, `cmd` e `args`).
- Isso entrega a integração **"sem configuração, com ícone"** que o Pai pediu. Para cada entrada, o binário no PATH denuncia a instalação, e o registro diz como iniciá-lo em ACP. O ícone vem pronto.
- Para entrar no registro, o agente **precisa autenticar sozinho**: por "Agent Auth" (o agente abre o navegador e recebe o callback OAuth num servidor local) ou por "Terminal Auth". O cliente só dispara o fluxo. Isso casa com o SIWC do M0, que já faz o mesmo.
- O **SDK oficial em TypeScript** é o `@agentclientprotocol/sdk`: 1.9.0, Apache-2.0, publicado em 2026-10-16. Não tem dependências de runtime, mas exige `zod` como par (^3.25 ou ^4). Pesa cerca de 6 MB desempacotado.
- O **AionUi** (`iOfficeAI/AionUi`, Apache-2.0, 33,6 mil estrelas, v2.2.2 de 2026-09-09, push em 2026-10-14) é o modelo de "orquestrador": um agente embutido (o engine `aionrs`) **mais** os agentes CLI detectados (Claude Code, Codex, OpenCode, Gemini, Qwen, Goose, Copilot, Pi, Hermes e outros), todos por ACP. A detecção vive no backend `iOfficeAI/AionCore`, em Rust e também Apache-2.0:
  - um **catálogo** de agentes (tabela `agent_metadata`): ícone, nome, `backend`, `binary_name` a procurar, comando e args de ACP;
  - uma **sonda de disponibilidade** por agente (online, comando não encontrado, erro de conexão), com verificação manual como saída de emergência;
  - Claude Code e Codex rodam por adaptadores ACP gerenciados (`@agentclientprotocol/claude-agent-acp` e `@agentclientprotocol/codex-acp`), não pelo binário direto;
  - o catálogo foi sincronizado com 18 agentes do registro oficial (migração 025);
  - logos monocromáticos (`currentColor`) são pintados por máscara CSS para seguir o tema.
- O "modo time" do AionUi tem um **líder** que divide a tarefa e delega a colegas por um servidor MCP interno, com caixa de mensagens e quadro de tarefas. Cada agente tem o próprio diálogo de permissão.

## Fatos verificados

| Fato | Fonte (tier) | Data |
|---|---|---|
| `registry.json` em `https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`, versão 1.0.0, 42 agentes | CDN oficial, baixado (0) | 2026-10-17 |
| Formato: `id`, `name`, `version`, `description`, `repository`, `website`, `authors`, `license`, `license_url`, `icon`, `distribution.{binary,npx,uvx}`; canal `preview` opcional | `registry/FORMAT.md` (1) | 2026-10-17 |
| Exigência de autenticação: Agent Auth ou Terminal Auth (o Environment Variable Auth da especificação não é aceito no registro) | `registry/AUTHENTICATION.md` (1) | 2026-10-17 |
| Exemplos de lançamento no registro: `opencode` binário `opencode.exe acp`; `claude-acp` por npx `@agentclientprotocol/claude-agent-acp@0.93.0`; `codex-acp` por npx `@agentclientprotocol/codex-acp@2.2.2`; `gemini` por npx `@google/gemini-cli@0.64.0 --acp`; `github-copilot-cli` por npx `@github/copilot@1.0.98 --acp`; `pi-acp` por npx `pi-acp@0.0.34`; `goose` binário `goose.exe acp` | `registry.json` (0) | 2026-10-17 |
| `@agentclientprotocol/sdk` 1.9.0, Apache-2.0, sem dependências, `zod` como par | registro do npm (1) | 2026-10-17 |
| AionCore: catálogo `agent_metadata` com `binary_name`, `command` e `args` (ex.: `qwen --acp`, `goose acp`, `opencode acp`); sonda de disponibilidade | `iOfficeAI/AionCore`, migrações 001, 009 e 025, `services/availability` (1) | 2026-10-17 |
| Na máquina do Pai, pelo PATH: `claude`, `codex`, `opencode`, `copilot`, `pi`, `hermes`, além de `npx`, `uvx` e `bun` | medição local, só leitura (—) | 2026-10-17 |
| Imagem na entrada: ChatGPT `gpt-6.1-sol` aceita `input_image`; OpenRouter `nemotron-3.5-super-vl:free` aceita `image_url`; Ollama `gpt-oss:20b` recusa (400, "does not support image input"); Ollama `qwen3-vl:235b` foi aposentado em 2026-06-16 (410) | medição própria, `workspace/diag-imagem.ts` (—) | 2026-10-17 |

## Lacunas

- O Hermes não está no registro oficial, mas o AionUi o integra por um caminho próprio. Falta descobrir como.
- Nem todos os binários do registro rodam no Windows sem baixar o arquivo: o registro traz `sha256`, e baixar é instalar. Instalar exige aprovação (fora do M1, ou com o Pai).
- O resumo de raciocínio e o fluxo dos agentes ACP vêm por `session/update`, e o formato precisa de leitura na especificação antes da SPEC fechar.

## Histórico

- 2026-10-17T20:26:17-03:00 · buddy-dev (claude-code-vs-code-569aca) · criada na pesquisa do M1 (ordem C aprovada pelo Pai)
