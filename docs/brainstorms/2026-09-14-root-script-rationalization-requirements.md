# Rationalize the root npm scripts — requirements

- **Date:** 2026-09-14
- **Issue:** #757 (follow-up to PR #764, which moved the visual into
  `apps/deneb` and left every pre-move entry point working through
  delegating shims)
- **Status:** Approved design; awaiting implementation plan
- **Merge target:** `main`
- **Branch:** `chore/757-scripts`

## Goal

Settle the final shape of the root script surface now that the visual lives
at `apps/deneb`: remove the delegating shims nothing calls, keep every
certification/CI/human entry point byte-identical, and guard the
certification-required root surface with an invariant canary. **No packaging
change** — proven by strict content-level parity this time (no build inputs
change, so `content.js` must be byte-identical; the equivalence flag is not
needed).

## Scope

**In scope:** three root script removals, the doc updates that follow from
them, a short script-architecture note in the development guide, and one new
invariant test.

**Out of scope:** renames of any existing script (the hyphen/colon naming
inconsistency — `package-alpha` vs `package:alpha`, `sync-packages` vs
`sync:metadata` — is accepted as-is; renaming would break muscle memory,
CI, and externally communicated commands for no functional gain); any change
to `apps/deneb` scripts; any change to `bin/ci-local.js` or the workflows.

## Design

### 1. Removals (root `package.json` only)

| Script | Rationale |
|---|---|
| `webpack:build` | Convenience shim; no CI/bin/hook callers. Docs move to the `-w` form. |
| `webpack:package` | Only mentioned once in CLAUDE.md troubleshooting; `npm run package` is the real entry point. |
| `build:package` | Root copy of the turbo filter build; nothing calls it since `apps/deneb` gained its own in PR #764. |

Each removal is preceded by a verify-no-caller sweep (grep across
`.github/`, `bin/`, `apps/*/bin/`, `.claude/hooks/`, `docs/`, `CLAUDE.md`,
`CONTRIBUTING.md`, `package.json` files) — a hit anywhere other than the
docs being updated blocks the removal.

**Kept deliberately:** `webpack:analyze` (documented, regularly used from
root); all CI/release/cert entry points (`package`,
`package-alpha|beta|standalone`, `validate-config-for-commit`, `eslint`,
`prettier-*`, `test*`, `bench*`, `build`, `clean`, `sync*`,
`validate-packages-sync`, `verify-package-parity`, `ci:local`, `eslint:root`,
`dev`, `test:watch`).

### 2. Documentation

- `CLAUDE.md`: the `webpack:build` quick-command line becomes
  `npm run webpack:build -w @deneb-viz/deneb`; the troubleshooting mention of
  `npm run webpack:package` becomes `npm run package` (with
  `npx tsc --noEmit` unchanged as the alternative).
- `CONTRIBUTING.md`: same `-w` substitution for `webpack:build`.
- `docs/DEVELOPMENT.md`: a short **script architecture** note — root =
  workspace orchestration plus delegating shims for the certification, CI
  and day-to-day human entry points; `apps/deneb` = the visual's own
  pipeline; any app script is reachable from the root via
  `npm run <script> -w @deneb-viz/deneb`. Sweep the same four docs for any
  remaining reference to the three removed scripts.

### 3. Invariant canary: certification root surface

New test beside the existing invariants
(`apps/deneb/src/__test__/invariants/`), following their pattern: read the
ROOT `package.json` (via `REPO_ROOT`) and assert the Microsoft
certification file requirements that nothing currently protects:

- `scripts.eslint` exists;
- `scripts.package` exists;
- `devDependencies` contains `typescript`, `eslint`, and
  `eslint-plugin-powerbi-visuals`.

Rationale: the certified repository must carry these at its root; a future
cleanup could silently drop one and only fail at submission time. ~20 lines,
node-environment, no new helpers beyond `REPO_ROOT`.

### 4. Proof (acceptance criteria)

1. Baseline: certified `npm run package` on the pre-change commit; copy the
   artifact aside (same procedure as PR #764).
2. After the change: rebuild, then `npm run verify-package-parity --
   <baseline> <candidate>` — **strict all-parts PASS, no flag**. Any DIFF is
   a regression (the change touches no build input).
3. `npm run ci:local` — all checks pass (this also exercises every retained
   entry point end-to-end, since `ci:local` and the `package` chain call
   them).
4. Full test suite green, including the new canary (and the canary shown to
   fail when a guarded field is removed, during development).

### 5. Sequencing

Small PR, two commits: (1) script removals + doc updates; (2) invariant
canary. Parity report in the PR body. Branch `chore/757-scripts` off `main`.

## Risks addressed by design

- A hidden caller of a removed script → verify-no-caller sweep before each
  removal, plus `ci:local` end-to-end.
- Certification root surface regressing later → the new invariant canary.
- Anything touching packaged output → strict parity proof.
