<div align="center">

# Rabelus Buddy

**An agnostic, extensible, "multi-everything" harness for AI agents.**
*by [Rabelus Lab](https://rabelus.com)*

[Português](./README.md) · [**English**](./README.en.md)

</div>

> **Status:** Phase 0 — "Setting the house in order". There is no runnable product yet. What exists today is the originating research, the development governance, and the tools that enforce it.

> Portuguese (pt-BR) is the project's primary language. Public-facing files are mirrored in English; internal documentation is in Portuguese and translated on demand.

## What it is

Rabelus Buddy (**buddy**, among friends) is a harness for running AI agents across multiple model providers, tools, channels, sessions and workspaces, under human approval, governed memory and a closed budget. The first user is an individual developer; the operating mode is hybrid: a local core with a minimal server-side gateway.

The research that started the project is preserved untouched in [`docs/00-proveniencia/`](./docs/00-proveniencia/). It has known weak findings; its revision is planned in the [roadmap](./docs/50-planos/ROADMAP.md).

## How this repository is developed

The project is written by Adilson Rabelo Junior together with **buddy-dev**, an AI agent of the Rabelus Lab family. The way we develop is itself raw material for the product: ledger, event bus, approvals, governed archive and cross-harness bootstrap are what buddy will offer its users.

- **Document → Spec → Test → Code.** Nothing is built without an approved SPEC; nothing is called done without proof.
- **Nothing is deleted.** What goes out of use is moved to [`archive/`](./archive/) with a tombstone and hashes.
- **Before, during and after — always.** `npm run bd -- pre` and `npm run bd -- post` check clock, git, session and conventions.
- **Knowledge verified live**, with source and date, in [`docs/20-conhecimento/`](./docs/20-conhecimento/).

## Contributing

Read [`CONTRIBUTING.en.md`](./CONTRIBUTING.en.md). The project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). For security issues, see [`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE) · © 2026 Adilson Ramires Rabelo Junior (Rabelus Lab). See [`NOTICE`](./NOTICE).
