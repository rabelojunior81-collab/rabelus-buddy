<div align="center">

# Rabelus Buddy

**An agnostic, extensible, "multi-everything" harness for AI agents.**
*by [Rabelus Lab](https://rabelus.com)*

[Português](./README.md) · [**English**](./README.en.md)

</div>

> **Status:** Phase 0 ("Setting the house in order") completed on 2026-10-15. In preparation: the SPEC for **M0 — Governed core** ([roadmap](./docs/50-planos/ROADMAP.md)). There is no runnable product yet; what exists is the research, the development governance, and the tools that enforce it.

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
| `scripts/` | `bd` tools (clock, names, event bus, archive, guard, Blog gate, surfaces, dependencies, test guard) |

Internal documentation is in Portuguese (ADR 0002).

## Contributing

Read [`CONTRIBUTING.en.md`](./CONTRIBUTING.en.md). The project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). For security issues, see [`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE) · © 2026 Adilson Ramires Rabelo Junior (Rabelus Lab). See [`NOTICE`](./NOTICE).
