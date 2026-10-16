# Contributing

[Português](./CONTRIBUTING.md) · [English](./CONTRIBUTING.en.md)

Thanks for your interest. Rabelus Buddy is developed by humans and AI agents under the same rules. There are few of them, and each one has a tool that checks it.

## In one minute

1. **Before:** `npm run bd -- pre`. Checks clock (Curitiba, `America/Sao_Paulo`), branch, sync and session.
2. **One branch per unit of work:** `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `test/…`. Never work directly on `main`.
3. **Small, frequent commits, pushed each time.** Messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): type and scope in English, description in Portuguese (the project's primary language).
4. **Document → Spec → Test → Code.** Behavior changes require an approved SPEC and a test before the code.
5. **Nothing is deleted.** To retire something: `npm run bd -- archive <path> --reason "..." --name "..."`. CI rejects deletions.
6. **Dependencies** only through the [protocol](./docs/30-governanca/DEPENDENCIAS.md): registry entry, exact version, approval, `bd deps` green.
7. **A failing test is fixed in the code.** Removing or weakening tests fails CI (`bd test-guard`).
8. **After:** `npm test` and `npm run bd -- post`. Open the PR using the template. Once CI is green, the PR is merged with a merge commit (no squash) to keep the granular history.

## Requirements

- Node.js **≥ 24.12** (LTS), which runs TypeScript with no build step. After cloning: `npm ci`. Before a PR: `npm test` and `npm run typecheck`.
- Git with worktree support (for parallel work).

## AI agents

If you are an agent, start with [`AGENTS.md`](./AGENTS.md). AI-assisted commits carry a `Co-Authored-By` trailer identifying the model.

## Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License of contributions

By contributing, you agree that your contribution is licensed under [Apache-2.0](./LICENSE), per section 5 of the license.
