# Contributing to Deneb

Thanks for your interest in contributing. Deneb is a small, opinionated project, so a quick conversation before non-trivial work usually saves both sides a wasted afternoon.

This file gives you a quick intro to where to look and some basic orientation. The deeper material lives in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [CLAUDE.md](CLAUDE.md); both are kept up to date, and you should not need to memorize the contents of either.

## Before you start

- **Bug reports and small fixes**: open an issue or jump straight to a PR. For bugs, include reproduction steps, the visual version, and the host environment (Power BI Desktop / Service / a specific browser).
- **New features, refactors, or anything cross-cutting**: please open an issue or discussion first, describing the problem and the rough shape of the change. Deneb has a deliberate scope (declarative Vega/Vega-Lite in Power BI), and not every feature will land. Discussing ahead of time avoids wasted implementation work.
- **Security-sensitive issues**: please do not file a public issue. Reach out privately first - see [SECURITY.md](SECURITY.md) for policy.

## Local setup

Firstly, [set up your environment for Power BI Development](https://learn.microsoft.com/en-us/power-bi/developer/visuals/environment-setup), if you haven't already.

```bash
npm install
npm run dev
```

Deneb uses a custom webpack configuration for development and packaging, which deviates from the standard `powerbi-visuals-tools`-provided one. `npm run dev` will auto-prime the assets needed on first run.

Full details, including .env setup, scripts reference, webpack architecture, and packaging modes, are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Branching

Deneb uses a two-branch trunk:

- **`next`** is the active integration branch. Base your feature branch off `next` and target it with your PR.
- **`main`** mirrors the version currently published on AppSource and is reserved for production hotfixes.

```bash
git checkout next && git pull
git checkout -b <type>/<short-name>     # e.g. fix/email-validation, feat/new-toolbar
```

Do **not** branch off `main`, do **not** rebase against `main`, and do **not** open feature PRs against `main`. `main` is typically far behind `next` and will produce unintended diffs or massive replays. PRs targeted at `main` are typically parked until the next planned release from `next`, and you may be asked to rebase the work onto `next` during review.

Full rationale is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#2-local-development-workflow) under "Branching model".

Branches merged to `next` are squashed on PR acceptance, and regular merges from `next` to `main` are as-is to preserve the high-level contribution history and ensure that anyone making a PR to `next` still gets credit for their contributions.

## Commits

- Keep commits small and focused on one logical change. Prefer a clean series of incremental commits over one large mixed commit.
- Use conventional commit prefixes where they fit (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`, `ci:`, `build:`, `test:`). Recent history in `git log` is a good reference.
- **Sign your commits.** Deneb commits are GPG-signed. If you have not signed before:

    ```bash
    # one-time setup
    git config --global user.signingkey <YOUR_KEY_FINGERPRINT>
    git config --global commit.gpgsign true
    ```

    On Windows, if `git commit -S` reports `gpg failed to sign the data: No secret key`, your git is likely using the `gpg` bundled with Git Bash (which has its own empty keyring) instead of your Gpg4Win install. Point git at the right binary:

    ```bash
    git config --global gpg.program "C:/Program Files/GnuPG/bin/gpg.exe"
    ```

    Verify with `git log --pretty=format:"%h %G? %s" -5` - every commit should show `G` (good signature).

- If you commit a series of unsigned commits and want to re-sign before pushing, rebase against the actual fork point (typically `HEAD~N` for the last N commits on your branch), **not** `main`:

    ```bash
    git rebase --exec "git commit --amend --no-edit -S" HEAD~N
    ```

## Before opening a PR

Run these locally and make sure they are clean:

```bash
npm run prettier-check       # formatting
npm run eslint               # lint
npm run test                 # vitest across packages
npx tsc --noEmit             # type-check
```

If you touched the visual itself (not just docs or tests), also confirm a clean dev build:

```bash
npm run webpack:build
```

Before packaging anything as a `.pbiviz` (only relevant if you are testing certified-mode behavior locally), run:

```bash
npm run validate-config-for-commit
```

This guards against shipping with `LOG_LEVEL` raised, dev toggles enabled, or other certification-unsafe settings.

## Pull requests

- **Target `next`.** Use `gh pr create --base next "<title>"` or set the base manually in the GitHub UI.
- **Title.** Short, descriptive, conventional prefix where natural. The PR title is what appears in the release notes.
- **Description.** Cover the _what_ and the _why_. Reference any related issue (`Fixes #123`). For UI changes, include before/after screenshots or a short clip if it helps the reviewer.
- **Keep the diff focused.** Drive-by formatting or unrelated cleanup belongs in its own PR — it makes review and rollback much easier.
- **Tests.** New behavior should generally come with tests. Bug fixes should include a regression test where practical. The existing test suites use Vitest; see `packages/*/src/**/__tests__/` for patterns.

Reviews are best-effort and can take a while. Deneb has very few active maintainers and depends on their availability. If a PR is waiting on something specific, a polite nudge is fine.

## Code style

Prettier and ESLint configurations live at the repo root and in each package. The formatter does most of the heavy lifting; please run `npm run prettier-format` (or your editor's prettier integration) before pushing.

Beyond formatting, [CLAUDE.md](CLAUDE.md) contains the high-level conventions (singleton `powerbi-compat`, monorepo package boundaries, feature-flag patterns, logging usage). Mirror existing patterns rather than introducing new ones. When in doubt, grep for similar implementations and follow their shape.

## Documentation

- User-facing documentation for the visual itself lives at <https://deneb-viz.github.io/> in a separate repo.
- Developer-facing documentation lives in this repo under `docs/`.
- Captured learnings from solved problems live in `docs/solutions/` and are organized by category (`ui-bugs/`, `logic-errors/`, `best-practices/`, etc.). If your work resolves a non-trivial bug or establishes a non-obvious pattern, please add an entry - future sessions (human and AI) read these. If you use Claude Code, the [Compound engineering](https://github.com/EveryInc/compound-engineering-plugin) plugin helps structure this; otherwise, mirror the frontmatter and section structure of an existing entry.

## License

By contributing, you agree that your contributions will be licensed under Deneb's [MIT License](LICENSE).
