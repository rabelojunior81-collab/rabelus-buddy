<div align="center">

# Rabelus Buddy

**An agnostic, extensible, "multi-everything" harness for AI agents.**
*by [Rabelus Lab](https://rabelus.com)*

[Português](./README.md) · [**English**](./README.en.md)

</div>

> **Status:** **M0 — Governed core complete** (2026-10-17, validated by Pai through the console). **M1 — Orchestrator and multimodal** in progress, with the SPEC approved by Pai ([SPEC 0002](./docs/40-specs/0002-orquestrador-e-multimodal/SPEC.md), [ADR 0018](./docs/60-decisoes/0018-ordem-c-depois-do-m0.md)): automatic detection of installed harnesses through the official ACP registry, images in the conversation, a new olive-green console. Done in M1: **M1.0** (typed console contract: invalid input is refused with a clear message before reaching the core), **M1.2a and M1.2b** (Buddy checks on its own whether each agent is ready; anything that downloads code only runs after Pai approves it in the console, and Codex is already ready), **M1.2c** (the core talks to the agents over ACP with live progress, and Pai's OpenCode and Codex have already answered), **M1.2d** (the agent asks before writing or running anything, and each request goes through Buddy's policy and the Approvals panel), **M1.2e** (the core signs the agent in without ever seeing the credential; the on-screen "Sign in" arrives with the new console), **M1.5a** (the new console, with the look Pai approved: olive green and glass, the Rabelus Lab mark, conversations and harnesses in the sidebar, Settings in a panel, AA contrast measured and no sideways scrolling on a phone), **M1.5b** (the harness is picked in the message box, with its state in view, permission requests showing who asks, and "Sign in" when it asks for it), **M1.1** (installed agents are recognized on their own through the official ACP registry, and the model catalog gathers 538 models from 4 providers, with each capability and its source) and the new console prototype approved by Pai. M0: ([SPEC 0001](./docs/40-specs/0001-nucleo-governado/SPEC.md), [plan](./docs/50-planos/m0/PLANO.md)), with **M0.7c** done (M0.7 complete): `rbuddy run "<task>"` runs the agent on the subscriptions (OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter), with policy, approvals in the terminal, budget by window and recovery after a crash (`rbuddy resume`); `status`, `log`, `providers`, `login`/`logout`, `approvals`, `budget` and `daemon` round out the CLI. Secrets and catalog audited by tests; an audit against the real services fixed the ChatGPT sign-in and error handling. Rabelus Buddy is an agent with UX/UI, not a CLI: the **local web console** is ready (**M0.8**, rehearsed in M0.8c, [ADR 0017](./docs/60-decisoes/0017-console-web-local-no-m0.md)): double-clicking `abrir-rabelus-buddy.cmd` opens a chat with the agent in the browser, with effort, provider, approvals, usage, ChatGPT sign-in and resume. Since **M0.8d** it shows live progress (reasoning, text as it streams, a queue with steering, and Stop). Still to come: the demo with Pai (M0.9).

> Portuguese (pt-BR) is the project's primary language. Public-facing files are mirrored in English; internal documentation is in Portuguese and translated on demand.

## What it is

Rabelus Buddy (**buddy**, among friends) is a harness for running AI agents across multiple model providers, tools, channels, sessions and workspaces, under human approval, governed memory and a closed budget. The first user is an individual developer; the operating mode is hybrid: a local core with a minimal server-side gateway.

The research that started the project is preserved untouched in [`docs/00-proveniencia/`](./docs/00-proveniencia/). Its weak findings were corrected in [Revision 0.2](./docs/10-pesquisa/rev-0.2/RELATORIO.md), accepted by Pai.

## How this repository is developed

The project is written by Adilson Rabelo Junior together with **Buddy Fenix** (`buddy-dev`), an AI agent of the Rabelus Lab family. The way we develop is itself raw material for the product: ledger, event bus, approvals, governed archive and cross-harness bootstrap are what buddy will offer its users.

- **Document → Spec → Test → Code.** Nothing is built without an approved SPEC; nothing is called done without proof.
- **Nothing is deleted.** What goes out of use is moved to [`archive/`](./archive/) with a tombstone and hashes.
- **Before, during and after — always.** `npm run bd -- pre` and `npm run bd -- post` check clock, git, session, conventions and that every surface is up to date.
- **Knowledge verified live**, with source and date, in [`docs/20-conhecimento/`](./docs/20-conhecimento/).

## Map

| Path | What lives there |
|---|---|
| `AGENTS.md` · `BOOTSTRAP.md` | Entry point for any AI agent (Claude Code, Codex, OpenCode, Gemini, Copilot…) |
| `.buddy-dev/` | Corpus of Buddy Fenix (buddy-dev): identity, appearance, memory, journal, changelog, event bus |
| `docs/00-proveniencia/` | Originating material, untouched |
| `docs/10-pesquisa/` | Revisions of the originating research (0.2 is current) |
| `docs/20-conhecimento/` | Verified knowledge base (source, date, version) |
| `docs/30-governanca/` | Method and conventions |
| `docs/40-specs/` · `docs/50-planos/` · `docs/60-decisoes/` | SPECs, roadmap and plans, ADRs |
| `docs/registros/` | Dated records (audits, incidents, evidence) |
| `archive/` | Dead archive: things go in with a tombstone and never leave |
| `packages/` | Product code in TypeScript with no build step: `client` (i18n and shared client), `cli` (`rabelus-buddy`/`rbuddy`), `core` (event log, owner, policy and budget) |
| `locales/` | Translation catalogs, pt-BR and en |
| `scripts/` | `bd` tools (clock, names, event bus, archive, guard, Blog gate, surfaces, dependencies, test guard, merge and prune, validations) |

Internal documentation is in Portuguese (ADR 0002).

## Contributing

Read [`CONTRIBUTING.en.md`](./CONTRIBUTING.en.md). The project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). For security issues, see [`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE) · © 2026 Adilson Ramires Rabelo Junior (Rabelus Lab). See [`NOTICE`](./NOTICE).
