# Beta Release Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish beta builds from CI the same way alpha builds are published — a moving `beta` tag accompanied by a versioned `x.y.z.beta-n` tag, producing a rolling "Beta Channel" GitHub pre-release whose changelog drift is measured from the last regular (4-part numeric) release — and stop CI from double-running the full ci+bench cycle on PR-branch pushes.

**Architecture:** Generalize the existing `alpha-release` job in `.github/workflows/ci.yml` into a single channel-parameterized `prerelease` job, and document the end-to-end publishing process in `docs/DEVELOPMENT.md` (section 8) for handover/reference. The channel (`alpha`/`beta`) is derived from the pushed tag name; every downstream step (versioned-tag regex, package script, artifact prefix, release title/body) keys off it. This is a smaller diff than duplicating the ~120-line job, and it keeps the two channels from drifting apart — the exact hazard that motivates the baseline fix below.

**Tech Stack:** GitHub Actions (bash steps), existing npm scripts (`package-alpha`, `package-beta` — both already exist and need no changes), `requarks/changelog-action`, `softprops/action-gh-release`.

**Verified preconditions (2026-08-06):**

- `package.json` already has `package-beta` / `package:beta` scripts; `config/package-custom.json` already has a `beta` mode with guid `BETA{0}` → the built artifact filename starts with `BETA` (mirroring `ALPHA*` for alpha). **No changes needed outside ci.yml.**
- Existing tags include: moving `alpha` and `beta` tags, `2.0.0.alpha-1/2`, historical `1.9.0.beta-1..4`, and regular releases `1.9.1.0`, `1.9.0.0`, etc. The moving `beta` tag already exists from the 1.9 era — pushing it force-updated will re-point it, same as `alpha` works today.
- **Latent bug this plan must fix:** the alpha job's changelog baseline is `git tag -l '[0-9]*' --sort=-v:refname | grep -v '\.alpha-' | head -n 1`. It excludes only `.alpha-` tags, so the first future `2.0.0.beta-N` tag would outrank `1.9.1.0` and silently become the alpha changelog baseline. The fix: positively match pure 4-part numeric tags (`^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$`), which is exactly the requirement — drift is always measured from the last regular build, for both channels.

**Verified: why CI "runs again" around a release (runs #1248–#1250, commit `f30a96cd`, 2026-07-24):**

- **The tag push is NOT the problem.** Run #1250 (push of the moving `alpha` tag) ran ONLY `alpha-release` (~3 min); `ci` and `bench` were correctly skipped by their `if: !startsWith(github.ref, 'refs/tags/')` guards. No change needed there.
- Run #1249 was the same commit pushed to `next` (the 2.0-era forward-sync), re-running the full ci (~3.5 min) + bench (~2 min) on an already-tested SHA. Retiring `next` (PR #734) already eliminates this for future releases.
- **Systematic waste this plan fixes:** `on.push.branches: '**'` plus `on.pull_request` double-runs ci+bench on EVERY push to a branch with an open PR — verified pairs seconds apart on identical SHAs: #1251/#1252, #1243/#1244, #1240/#1241, #1238/#1239, #1235/#1236. Restricting push triggers to `main` and `certification` halves Actions usage for all PR work: feature branches are covered by the `pull_request` runs, trunk pushes by the `push` runs, tag pushes by the prerelease job alone (unchanged).
- Consequence to accept: a push to a feature branch with NO open PR no longer triggers CI. `npm run ci:local` covers pre-PR validation, and CI runs the moment a PR is opened.

**Design decisions locked in:**

- One parameterized `prerelease` job replacing `alpha-release`, not a duplicated `beta-release` job. Rationale: the channels differ in exactly ~8 substitution points; duplication invites drift (fix one job, forget the other). Alpha's observable behavior is preserved: same release title format, same body, same tag conventions — only the changelog baseline changes (bug fix above).
- Tag convention for beta mirrors alpha exactly: moving tag `beta` (trigger) + versioned tag `<major>.<minor>.<patch>.beta-<n>` on the same commit (names the artifact and release title; job fails fast if missing).
- The CI config validator step (`validate-config-for-commit`) runs for both channels, exactly as it does for alpha today. Local `package-beta` stays validator-free (deliberate: maintainers can produce debug builds locally; CI enforces safe values for anything published — see the #651 comment in the workflow). **Do not wire the validator into `package-alpha`/`package-beta` npm scripts.**
- Release body: identical wording to alpha with the channel name substituted. The body's external links (Early Access Builds page, canary changelog) already cover early-access builds generally.

**Out of scope:** Website/docs-site changes for the beta channel (separate repo); deleting the stale 1.9-era `beta` tag (it gets re-pointed on first use); any change to npm scripts or `config/package-custom.json` (already in place); reusing build artifacts from the trunk push run in the release job (the release build must produce the channel-specific artifact anyway, run #1250 took only ~3 min, and cross-workflow artifact plumbing isn't worth it at that cost).

---

### Task 1: Create working branch from `main`

**Files:** none (git only)

- [ ] **Step 1: Branch from up-to-date `main`**

```bash
git checkout main && git pull
git checkout -b ci/beta-release-channel
```

Expected: new branch `ci/beta-release-channel` at the tip of `main`.

---

### Task 2: Generalize the alpha-release job to a channel-parameterized prerelease job

**Files:**
- Modify: `.github/workflows/ci.yml` (header comment lines 3-4, tag triggers lines 12-14, and the entire `alpha-release` job lines 134-254)

- [ ] **Step 1: Update the header comment**

Use the Edit tool. Old string:

```yaml
# Default the workflow token to read-only; jobs that need more (e.g.
# alpha-release publishing) declare their own permissions block.
```

New string:

```yaml
# Default the workflow token to read-only; jobs that need more (e.g.
# prerelease publishing) declare their own permissions block.
```

- [ ] **Step 2: Rewrite the trigger block — add beta tags, restrict push triggers to trunk branches**

Branch pushes and tag pushes are OR'd for the `push` event: a tag push matches the `tags` filter regardless of the `branches` filter (this is how the alpha flow already works). Restricting `branches` to `main` and `certification` removes the push+pull_request double-run on PR branches; `pull_request` continues to cover all PR validation.

Old string:

```yaml
on:
    push:
        branches:
            - '**'
        tags:
            - 'alpha'
            - 'alpha-*'
    pull_request:
```

New string:

```yaml
on:
    push:
        # Trunk branches only. Feature branches are validated by the
        # pull_request runs — with '**' here, every push to a branch
        # with an open PR ran the full ci+bench cycle twice.
        branches:
            - main
            - certification
        tags:
            - 'alpha'
            - 'alpha-*'
            - 'beta'
            - 'beta-*'
    pull_request:
```

- [ ] **Step 3: Replace the `alpha-release` job with the parameterized `prerelease` job**

Use the Edit tool. The old string is the ENTIRE `alpha-release:` job — from the line `    alpha-release:` (line 134) through the final line of the file (line 254, `                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`). Read the file first and use its exact bytes as `old_string` (it is ~120 lines; take everything from `    alpha-release:` to end-of-file).

New string (exact, 4-space indentation to match the file):

```yaml
    prerelease:
        if: startsWith(github.ref, 'refs/tags/alpha') || startsWith(github.ref, 'refs/tags/beta')
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - name: Check out code
              uses: actions/checkout@v4
              with:
                  fetch-depth: 0
            # Derive the release channel from the moving tag name
            # ('alpha'/'beta', including 'alpha-*'/'beta-*' variants).
            # Every later step keys off these outputs, so alpha and
            # beta cannot drift apart.
            - name: Resolve release channel
              id: channel
              run: |
                  CHANNEL="${GITHUB_REF_NAME%%-*}"
                  case "$CHANNEL" in
                      alpha|beta) ;;
                      *)
                          echo "::error::Unsupported prerelease channel '$CHANNEL' (from tag '$GITHUB_REF_NAME')."
                          exit 1
                          ;;
                  esac
                  echo "name=$CHANNEL" >> $GITHUB_OUTPUT
                  echo "prefix=$(echo "$CHANNEL" | tr '[:lower:]' '[:upper:]')" >> $GITHUB_OUTPUT
                  echo "title=${CHANNEL^}" >> $GITHUB_OUTPUT
                  echo "Channel: $CHANNEL"
            # The moving channel tag must be accompanied by a versioned
            # channel tag (e.g. `2.0.0.alpha-2`, `2.0.0.beta-1`) on the
            # same commit — it names the published .pbiviz and the
            # release title. Fail fast (before install/build) if it is
            # missing.
            - name: Resolve versioned channel tag
              id: version_tag
              run: |
                  # `|| true`: keep a no-match grep from failing the
                  # assignment if this step ever runs under pipefail
                  # (e.g. an explicit `shell: bash`), so the guard below
                  # prints its instructions instead of a bare exit.
                  VERSION_TAG=$(git tag --points-at HEAD | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.${{ steps.channel.outputs.name }}-[0-9]+$" | sort -V | tail -n 1 || true)
                  if [ -z "$VERSION_TAG" ]; then
                      echo "::error::No versioned ${{ steps.channel.outputs.name }} tag (e.g. 2.0.0.${{ steps.channel.outputs.name }}-1) found on this commit. Tag the commit with '<major>.<minor>.<patch>.${{ steps.channel.outputs.name }}-<n>' and re-push the '${{ steps.channel.outputs.name }}' tag to release."
                      exit 1
                  fi
                  echo "tag=$VERSION_TAG" >> $GITHUB_OUTPUT
                  echo "Versioned channel tag: $VERSION_TAG"
            - name: Use CI .env file
              run: cp .env.ci .env
            - name: Setup Node
              uses: actions/setup-node@v4
              with:
                  node-version: 22
                  cache: 'npm'
            - name: Cache turbo build setup
              uses: actions/cache@v4
              with:
                  path: .turbo
                  key: ${{ runner.os }}-turbo-${{ hashFiles('**/package-lock.json') }}
                  restore-keys: |
                      ${{ runner.os }}-turbo-
            - name: Install Packages
              run: npm ci
            - name: Build packages
              run: npm run build
            # Guard the published artifact against a tampered `.env.ci`.
            # The channel package scripts (`package-alpha`/`package-beta`)
            # deliberately skip the validator locally so that maintainers
            # can produce one-off debug builds (e.g. with
            # ALLOW_EXTERNAL_URI=true) for issue triage. CI does not need
            # that flexibility — anything published to a GitHub release
            # under a prerelease tag must satisfy the same configuration
            # invariants as the certified `package` script. Running the
            # validator here asserts that the on-disk `.env` (copied from
            # `.env.ci` above) holds the approved safe values before the
            # package script bakes them into the artifact.
            #
            # See https://github.com/deneb-viz/deneb/issues/651.
            - name: Validate CI configuration before prerelease packaging
              run: npm run validate-config-for-commit
            - name: Build channel package
              run: npm run package-${{ steps.channel.outputs.name }}
            # mv fails the job if the glob matches zero or multiple
            # files, so a missing/ambiguous build artifact is caught here
            # rather than publishing a mis-named release.
            - name: Rename package to versioned channel filename
              run: mv dist/${{ steps.channel.outputs.prefix }}*.pbiviz "dist/deneb.${{ steps.version_tag.outputs.tag }}.pbiviz"
            - name: Delete existing channel release
              run: gh release delete ${{ github.ref_name }} --yes || true
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            - name: Fetch all tags
              run: git fetch --tags --force
            - name: Get last release tag
              id: last_tag
              # Only pure 4-part numeric tags (e.g. 1.9.1.0) are releases
              # cut from main. Positively match that shape so prerelease
              # tags from ANY channel (2.0.0.alpha-2, 2.0.0.beta-1, ...)
              # can never become the changelog baseline — the drift is
              # always measured from the last regular build.
              run: |
                  LAST_TAG=$(git tag -l '[0-9]*' --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)
                  echo "tag=$LAST_TAG" >> $GITHUB_OUTPUT
                  echo "Last versioned tag: $LAST_TAG"
            - name: Generate changelog
              id: changelog
              uses: requarks/changelog-action@v1
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  fromTag: ${{ github.ref_name }}
                  toTag: ${{ steps.last_tag.outputs.tag }}
                  excludeTypes: ''
                  writeToFile: false
            - name: Create channel pre-release
              uses: softprops/action-gh-release@v2
              with:
                  prerelease: true
                  name: '${{ steps.channel.outputs.title }} Channel: Latest Build (${{ steps.version_tag.outputs.tag }})'
                  body: |
                      Deneb ${{ steps.channel.outputs.title }} Channel build, which is the latest release candidate for early adopters.

                      Please refer to the [Early Access Builds](https://deneb-viz.github.io/community/early-access) page on the Deneb website for information on usage and installation.

                      The list of changes should be present in the [Change Log in the 'canary' version](https://deneb-viz.github.io/docs/next/changelog) of the documentation on the Deneb website.

                      The .pbiviz file below needs to be manually installed and is not tied to the AppSource version. **It is not supported for production use and is intended for the purposes of testing and feedback only**.

                      For any issues you create, please ensure to specify the exact version number you are using. Again, please refer to the [Early Access Builds](https://deneb-viz.github.io/community/early-access#providing-feedback-on-early-access-builds) page for information on how to do this.

                      ---

                      ## Changes since ${{ steps.last_tag.outputs.tag }}

                      ${{ steps.changelog.outputs.changes }}
                  files: |
                      dist/deneb.${{ steps.version_tag.outputs.tag }}.pbiviz
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 4: Verify the YAML parses**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo "yaml ok"`
Expected: `yaml ok`. (If `actionlint` is installed, run `actionlint .github/workflows/ci.yml` too — zero findings expected.)

- [ ] **Step 5: Verify no stale alpha-only wiring remains**

Run these three checks (Git Bash):

```bash
grep -n "alpha-release" .github/workflows/ci.yml          # expected: no matches (old job name gone)
grep -n "ALPHA\*" .github/workflows/ci.yml                 # expected: no matches (hardcoded artifact glob gone)
grep -n "grep -v" .github/workflows/ci.yml                 # expected: no matches (old exclusion-based baseline gone)
grep -c "refs/tags/beta" .github/workflows/ci.yml          # expected: 1 (the prerelease job's if-condition)
grep -n "\*\*" .github/workflows/ci.yml                    # expected: no matches on a branches: line (the '**' catch-all is gone; hits inside comment text or glob-free lines are fine — eyeball them)
```

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add beta prerelease channel; run push CI on trunk branches only"
```

---

### Task 3: Document the prerelease publishing process in DEVELOPMENT.md

**Files:**
- Modify: `docs/DEVELOPMENT.md` (end of section 8 "Production Packaging", after the "Troubleshooting Packaging" subsection, currently ending at line 405)

The Contents list (lines 9-20) only enumerates top-level `##` sections — no TOC change needed for a new `###` subsection.

- [ ] **Step 1: Insert the new subsection**

Use the Edit tool. Old string (exact — the seam between sections 8 and 9):

```markdown
Refer to `bin/package-custom.ts` for the authoritative implementation details.

## 9. Performance & Optimization Tips
```

New string:

````markdown
Refer to `bin/package-custom.ts` for the authoritative implementation details.

### Publishing prerelease builds (alpha / beta channels)

Alpha and beta builds are published as rolling GitHub pre-releases by the `prerelease` job in [.github/workflows/ci.yml](../.github/workflows/ci.yml). They install alongside the AppSource visual (distinct GUIDs — see [Packaging Modes & Certification](#packaging-modes--certification)) and are for testing and feedback only, never production use.

**Tag convention.** A publish needs two tags on the same commit:

- A **versioned channel tag** — `<major>.<minor>.<patch>.alpha-<n>` or `<major>.<minor>.<patch>.beta-<n>` (e.g. `2.0.0.beta-1`). This names the published `.pbiviz` and the release title. The job fails fast (before install/build) if it is missing.
- The **moving channel tag** — `alpha` or `beta`. Pushing this tag is what triggers the publish; it is force-moved from release to release.

**To publish (example: beta):**

```bash
git checkout main && git pull
git tag 2.0.0.beta-1                # versioned tag on the commit to release
git tag -f beta                     # move the channel tag to the same commit
git push origin 2.0.0.beta-1
git push -f origin beta             # triggers the prerelease job
```

**What the job does:**

1. Derives the channel (`alpha`/`beta`) from the pushed tag name, then resolves the versioned channel tag on the commit.
2. Validates the CI configuration (`npm run validate-config-for-commit`) so anything published always carries certification-safe values. The local `package-alpha`/`package-beta` scripts deliberately skip this validation so maintainers can produce one-off debug builds for issue triage (see [#651](https://github.com/deneb-viz/deneb/issues/651)) — CI is where the invariant is enforced.
3. Builds via `npm run package-<channel>` and renames the artifact to `deneb.<versioned-tag>.pbiviz`.
4. Deletes and recreates the rolling "Alpha/Beta Channel: Latest Build" pre-release, attaching the artifact.
5. Generates the release changelog from the last **regular** release (pure 4-part numeric tag, e.g. `1.9.1.0`) up to the released commit. Prerelease tags from either channel are never used as the baseline, so the listed changes always represent the drift from the last AppSource-style release.

Tag pushes run **only** the `prerelease` job — the `ci` and `bench` jobs are skipped on tag refs, so publishing does not repeat the full CI cycle. The commit being released will already have been validated by the `push`/`pull_request` run that landed it on `main`.

## 9. Performance & Optimization Tips
````

> Note: the fenced ```bash block inside the new string is part of the file content — include it verbatim in the Edit call.

- [ ] **Step 2: Verify the internal anchor and structure**

Run (Git Bash):

```bash
grep -n "### Publishing prerelease builds" docs/DEVELOPMENT.md   # expected: 1 match, inside section 8 (before "## 9.")
grep -n "packaging-modes--certification" docs/DEVELOPMENT.md      # expected: 1 match (the new link; target heading "### Packaging Modes & Certification" exists at ~line 317)
grep -c "^## 9. Performance" docs/DEVELOPMENT.md                  # expected: 1 (heading not duplicated)
```

- [ ] **Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md
git commit -m "docs: document alpha/beta prerelease publishing process"
```

---

### Task 4: Runnable check of the channel-derivation and baseline logic

The workflow's bash can't be executed by pushing tags without doing a real release, so verify the three pieces of shell logic locally against the real repo tags. This is the plan's one runnable check.

**Files:**
- Create: `C:\Users\DANIEL~1\AppData\Local\Temp\claude\c--Repos-deneb\457d84d8-fd76-4900-b64b-cfa86182ddf3\scratchpad\prerelease-logic-check.sh` (session scratchpad — NOT committed to the repo; any temp location outside the repo works)

- [ ] **Step 1: Write the check script**

```bash
#!/usr/bin/env bash
set -uo pipefail
fail=0
check() { [ "$2" = "$3" ] && echo "ok:   $1" || { echo "FAIL: $1 (got '$2', want '$3')"; fail=1; }; }

# 1. Channel derivation (mirrors the 'Resolve release channel' step)
derive() { local c="${1%%-*}"; case "$c" in alpha|beta) echo "$c";; *) echo "invalid";; esac; }
check "channel: alpha"          "$(derive alpha)"       "alpha"
check "channel: beta"           "$(derive beta)"        "beta"
check "channel: alpha-hotfix"   "$(derive alpha-hotfix)" "alpha"
check "channel: beta-2"         "$(derive beta-2)"      "beta"
check "channel: v1 rejected"    "$(derive v1)"          "invalid"

# 2. Versioned-tag regex (mirrors the 'Resolve versioned channel tag' step)
match() { echo "$1" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+\.$2-[0-9]+$" && echo yes || echo no; }
check "2.0.0.beta-1 matches beta"        "$(match 2.0.0.beta-1 beta)"   "yes"
check "2.0.0.alpha-2 matches alpha"      "$(match 2.0.0.alpha-2 alpha)" "yes"
check "2.0.0.alpha-2 rejected for beta"  "$(match 2.0.0.alpha-2 beta)"  "no"
check "2.0.0.beta-1 rejected for alpha"  "$(match 2.0.0.beta-1 alpha)"  "no"
check "1.9.1.0 rejected for beta"        "$(match 1.9.1.0 beta)"        "no"

# 3. Changelog baseline (mirrors the 'Get last release tag' step) — real repo tags
LAST_TAG=$(git tag -l '[0-9]*' --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)
check "baseline from real tags is last regular build" "$LAST_TAG" "1.9.1.0"

# 4. Simulated future state: a 2.0.0.beta-1 tag must NOT shift the baseline
#    (this is the latent bug the old 'grep -v .alpha-' logic had)
SIM=$(printf '2.0.0.beta-1\n2.0.0.alpha-2\n1.9.1.0\n1.9.0.beta-4\n1.9.0.0\n' | sort -rV | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)
check "future beta tag does not shift baseline" "$SIM" "1.9.1.0"

exit $fail
```

> Note: check 3 asserts against the repo's tags as of 2026-08-06 (`1.9.1.0` is the newest 4-part numeric tag). If a regular release lands before this plan executes, update that expectation to the new latest regular tag.

- [ ] **Step 2: Run it**

Run (Git Bash, from the repo root): `bash "C:\Users\DANIEL~1\AppData\Local\Temp\claude\c--Repos-deneb\457d84d8-fd76-4900-b64b-cfa86182ddf3\scratchpad\prerelease-logic-check.sh"`
Expected: every line prints `ok:`, exit code 0. Any `FAIL:` line means the corresponding workflow logic in Task 2 is wrong — fix ci.yml, not the check.

No commit for this task (script lives in the scratchpad only).

---

### Task 5: CI mirror, push, and PR

**Files:** none (verification + git only)

- [ ] **Step 1: Run the CI mirror (required before any PR)**

Run: `npm run ci:local`
Expected: passes. (A PreToolUse hook gates `gh pr create` on this — do not skip. If Prettier fails on `capabilities.json`/`pbiviz.json`/`config/features.json`, those are pre-existing uncommitted local edits, not this branch: stash them — `git stash push -- capabilities.json pbiviz.json config/features.json` — rerun, and pop the stash after the PR is created.)

- [ ] **Step 2: Push and open PR against `main`**

```bash
git push -u origin ci/beta-release-channel
gh pr create --base main --title "ci: publish beta channel builds with versioned beta tags" --body "Adds a beta release channel mirroring the alpha mechanism from #732: pushing the moving \`beta\` tag (accompanied by a versioned \`x.y.z.beta-n\` tag on the same commit) builds \`package-beta\` and publishes a rolling **Beta Channel: Latest Build** pre-release.

Rather than duplicating the ~120-line alpha job, the \`alpha-release\` job is generalized into a single channel-parameterized \`prerelease\` job — the channel (regex, package script, artifact prefix, release title/body) derives from the pushed tag. Alpha's observable behavior is unchanged, with one deliberate fix: the changelog baseline now positively matches pure 4-part numeric tags (\`x.y.z.n\`) instead of only excluding \`.alpha-\` tags, so prerelease tags from either channel can never become the baseline — the drift is always measured from the last regular build (currently 1.9.1.0). Without this, the first \`2.0.0.beta-n\` tag would have silently become the alpha changelog baseline.

Also fixes CI double-running: \`on.push.branches: '**'\` plus \`on.pull_request\` ran the full ci+bench cycle twice on every push to a branch with an open PR (e.g. runs #1251/#1252 on the same SHA, seconds apart). Push triggers are now restricted to \`main\` and \`certification\`; PR branches are covered by the \`pull_request\` runs alone. Tag pushes were already correct — run #1250 (the \`alpha\` tag) only ran the release job, with ci/bench skipped.

No npm-script or package-config changes: \`package-beta\` and the \`beta\` mode in \`config/package-custom.json\` (guid \`BETA{0}\`) already exist.

The full publishing process (tag convention, publish commands, what the job does) is now documented in docs/DEVELOPMENT.md §8 under 'Publishing prerelease builds'.

To publish a beta: tag the commit \`<major>.<minor>.<patch>.beta-<n>\`, then force-push the moving \`beta\` tag to the same commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected: PR created against `main`.

- [ ] **Step 3: Post-merge note (manual, for the maintainer)**

First beta release after merge: `git tag 2.0.0.beta-1 <sha> && git tag -f beta <sha> && git push origin 2.0.0.beta-1 && git push -f origin beta`. The pre-existing 1.9-era `beta` tag gets re-pointed by the `-f` push; the job deletes and recreates the rolling `beta` release automatically.
