# Certification Submission Tagging & Gated Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CI builds a certified `.pbiviz` workflow artifact for every 4-part numeric submission tag (no release), and a manually dispatched workflow turns the approved tag into a reviewable draft GitHub release with AppSource + standalone assets.

**Architecture:** A new `submission` job in the existing `ci.yml` triggers on fully numeric 4-part tags (`2.0.0.N`) and mirrors the `prerelease` job's build steps, uploading `deneb.<tag>.pbiviz` as a workflow artifact only. A new `release.yml` (`workflow_dispatch`) checks out the approved tag, builds both certified and standalone packages, and creates a **draft** release (tag `2.0.0.N`, title `2.0.0`) with templated copy plus an auto-changelog baselined on the latest *published* release. Spec: [docs/brainstorms/2026-09-04-certification-release-tagging-requirements.md](../brainstorms/2026-09-04-certification-release-tagging-requirements.md).

**Tech Stack:** GitHub Actions, `requarks/changelog-action@v1`, `softprops/action-gh-release@v2`, existing npm scripts (`package`, `package-standalone`).

**Facts the engineer needs (verified against this repo):**

- `ci.yml` jobs `ci` and `bench` already skip all tag refs via `if: ${{ !startsWith(github.ref, 'refs/tags/') }}` — numeric tags will not run them.
- The certified build (`npm run package`) writes a `.pbiviz` starting with the visual GUID `deneb7E15AEF80B9E4D4F8E12924291ECE89A` into `dist/`; the standalone build's file starts with `STANDALONE` (GUID prefixing per `config/package-custom.json`). Webpack does **not** clean `dist/`, so renamed assets are staged into a separate `release-assets/` directory in the release workflow.
- `pbiviz.json` `visual.version` is the source of truth (currently `2.0.0.0`); submission tags must equal it.
- Shell scripts in these workflows must reference tag/input values via **env vars, not `${{ }}` interpolation** — see the injection-hardening comment on the existing "Delete existing channel release" step in `ci.yml`.
- `gh api repos/<repo>/releases/latest` returns the latest release **excluding drafts and prereleases** — that is exactly the changelog baseline rule from the spec.
- There is no test framework for workflows in this repo. Each task's "test" is a YAML parse (`npx --yes js-yaml <file>`) plus a local shell check of any non-trivial logic. Real end-to-end verification happens on GitHub after merge (Task 4 checklist).

---

### Task 1: `submission` job in `ci.yml`

**Files:**

- Modify: `.github/workflows/ci.yml` (trigger block at lines 16–20; new job appended after `prerelease`)

- [ ] **Step 1: Add the numeric tag pattern to the push trigger**

In `.github/workflows/ci.yml`, change the `tags:` list under `on.push`:

```yaml
        tags:
            - 'alpha'
            - 'alpha-*'
            - 'beta'
            - 'beta-*'
            # Certification submission tags (fully numeric 4-part, e.g.
            # 2.0.0.1). Actions glob syntax cannot express "exactly four
            # numeric parts", so the `submission` job re-validates the
            # shape and fails fast on anything else.
            - '[0-9]*.[0-9]*.[0-9]*.[0-9]*'
```

- [ ] **Step 2: Append the `submission` job at the end of `ci.yml`**

```yaml
    submission:
        # Certified AppSource build for a certification submission tag.
        # Uploads the .pbiviz as a workflow artifact only — deliberately
        # no release object: submission tags are throwaway remediation
        # iterations and the tag itself is the durable record. The
        # approved tag is later published via the Release workflow.
        if: ${{ startsWith(github.ref, 'refs/tags/') && !startsWith(github.ref, 'refs/tags/alpha') && !startsWith(github.ref, 'refs/tags/beta') }}
        runs-on: ubuntu-latest
        steps:
            - name: Check out code
              uses: actions/checkout@v4
            # The tag names the artifact that gets submitted to Partner
            # Center, so it must be the exact version baked into the
            # package. Fail fast (before install/build) on a shape or
            # version mismatch.
            - name: Validate submission tag against pbiviz.json
              run: |
                  if ! echo "$GITHUB_REF_NAME" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
                      echo "::error::Tag '$GITHUB_REF_NAME' is not a 4-part numeric submission tag (e.g. 2.0.0.1)."
                      exit 1
                  fi
                  PBIVIZ_VERSION=$(node -p "require('./pbiviz.json').visual.version")
                  if [ "$GITHUB_REF_NAME" != "$PBIVIZ_VERSION" ]; then
                      echo "::error::Tag '$GITHUB_REF_NAME' does not match pbiviz.json visual.version '$PBIVIZ_VERSION'. Bump pbiviz.json, commit, and re-tag."
                      exit 1
                  fi
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
            # `npm run package` runs validate-config-for-commit itself,
            # so the tampered-.env.ci guard from the prerelease job is
            # inherent here.
            - name: Build certified (AppSource) package
              run: npm run package
            # mv fails the job if the glob matches zero or multiple
            # files, so a missing/ambiguous build artifact is caught here
            # rather than uploading a mis-named artifact.
            - name: Rename package to submission filename
              run: mv dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A*.pbiviz "dist/deneb.${GITHUB_REF_NAME}.pbiviz"
            - name: Upload submission artifact
              uses: actions/upload-artifact@v4
              with:
                  name: deneb.${{ github.ref_name }}
                  path: dist/deneb.${{ github.ref_name }}.pbiviz
                  retention-days: 90
                  if-no-files-found: error
```

- [ ] **Step 3: Verify the YAML parses**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: `OK` (any parse error prints instead)

- [ ] **Step 4: Verify the guard logic locally**

Run (Bash):

```bash
check() {
  GITHUB_REF_NAME="$1"
  if ! echo "$GITHUB_REF_NAME" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then echo "$1: shape-fail"; return; fi
  PBIVIZ_VERSION=$(node -p "require('./pbiviz.json').visual.version")
  if [ "$GITHUB_REF_NAME" != "$PBIVIZ_VERSION" ]; then echo "$1: version-fail (pbiviz=$PBIVIZ_VERSION)"; else echo "$1: pass"; fi
}
check 2.0.0.0; check 2.0.0.1; check 2.0.0.beta-1; check 1.2.3.4.5
```

Expected: `2.0.0.0: pass`, `2.0.0.1: version-fail (pbiviz=2.0.0.0)`, `2.0.0.beta-1: shape-fail`, `1.2.3.4.5: shape-fail`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build certified artifact for numeric submission tags"
```

---

### Task 2: `release.yml` — dispatch-to-draft release workflow

**Files:**

- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the workflow**

Write `.github/workflows/release.yml` with exactly this content:

```yaml
name: Release

# Publishes an APPROVED certification submission tag as a draft GitHub
# release for maintainer review. Flow:
#   1. Submission tags (2.0.0.N) are built by the `submission` job in
#      ci.yml as workflow artifacts only (no releases).
#   2. When Microsoft approves a submission, dispatch this workflow with
#      that tag. It rebuilds both packages at the tag and creates a
#      DRAFT release titled with the 3-part version (e.g. 2.0.0).
#   3. The maintainer reviews/edits the draft body in the GitHub UI and
#      publishes it manually.
permissions:
    contents: read

on:
    workflow_dispatch:
        inputs:
            tag:
                description: 'Approved submission tag to publish (e.g. 2.0.0.5)'
                required: true
                type: string

jobs:
    release:
        runs-on: ubuntu-latest
        permissions:
            contents: write
        env:
            # Shell steps read the tag from env, never via ${{ }}
            # interpolation inside `run:` — expression interpolation
            # pastes the value into the script as shell source (see the
            # injection note on the channel-release deletion step in
            # ci.yml). `with:` blocks may use the expression form safely.
            RELEASE_TAG: ${{ inputs.tag }}
        steps:
            - name: Check out approved tag
              uses: actions/checkout@v4
              with:
                  ref: ${{ inputs.tag }}
                  # Full history + tags: the changelog action walks
                  # commits between the baseline tag and this tag.
                  fetch-depth: 0
            - name: Validate tag against pbiviz.json and derive title
              id: meta
              run: |
                  if ! echo "$RELEASE_TAG" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
                      echo "::error::'$RELEASE_TAG' is not a 4-part numeric submission tag (e.g. 2.0.0.5)."
                      exit 1
                  fi
                  PBIVIZ_VERSION=$(node -p "require('./pbiviz.json').visual.version")
                  if [ "$RELEASE_TAG" != "$PBIVIZ_VERSION" ]; then
                      echo "::error::Tag '$RELEASE_TAG' does not match pbiviz.json visual.version '$PBIVIZ_VERSION' at that commit."
                      exit 1
                  fi
                  # 3-part release title per repo convention (tag
                  # 1.9.1.0 → title 1.9.1).
                  echo "title=${RELEASE_TAG%.*}" >> $GITHUB_OUTPUT
            # Changelog baseline = latest PUBLISHED release. The
            # /releases/latest endpoint excludes drafts and prereleases
            # by definition, so failed submission tags and channel
            # prereleases can never become the baseline.
            - name: Resolve changelog baseline
              id: baseline
              run: |
                  BASELINE=$(gh api "repos/$GITHUB_REPOSITORY/releases/latest" --jq .tag_name)
                  if [ -z "$BASELINE" ]; then
                      echo "::error::Could not resolve the latest published release."
                      exit 1
                  fi
                  echo "tag=$BASELINE" >> $GITHUB_OUTPUT
                  echo "Baseline release tag: $BASELINE"
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
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
            # Both builds write to dist/, which webpack does not clean —
            # stage each renamed asset into release-assets/ so the
            # second build cannot interfere with the first. mv fails on
            # zero/multiple glob matches, catching missing/ambiguous
            # artifacts before a mis-named release asset is published.
            - name: Build certified (AppSource) package
              run: npm run package
            - name: Stage AppSource asset
              run: |
                  mkdir -p release-assets
                  mv dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A*.pbiviz "release-assets/deneb.${RELEASE_TAG}.pbiviz"
            - name: Build standalone package
              run: npm run package-standalone
            - name: Stage standalone asset
              run: mv dist/STANDALONE*.pbiviz "release-assets/deneb.standalone.${RELEASE_TAG}.pbiviz"
            - name: Generate changelog
              id: changelog
              uses: requarks/changelog-action@v1
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  fromTag: ${{ inputs.tag }}
                  toTag: ${{ steps.baseline.outputs.tag }}
                  excludeTypes: ''
                  writeToFile: false
            - name: Create draft release
              uses: softprops/action-gh-release@v2
              with:
                  draft: true
                  tag_name: ${{ inputs.tag }}
                  name: ${{ steps.meta.outputs.title }}
                  body: |
                      This is version ${{ steps.meta.outputs.title }} of Deneb, as [published to AppSource](https://deneb.link/appsource?source=repo&mktcmpid=${{ inputs.tag }}).

                      Please review the [change log](https://deneb.guide/docs/changelog) for an overview of what's new in this release.

                      Note that the AppSource version has features disabled that would prevent it from being certified. Currently, this feature is limited to fetching remote data (such as images or external datasets) via URLs.

                      If you need these features, you can download a standalone version from the assets below that is not tied to AppSource and will allow you to fetch remote data, provided that an external endpoint enables cross-domain requests from sandboxed iframes (which is how custom visuals are displayed in a report). Because this is not tied to AppSource, it is uncertified.

                      ---

                      ## Changes since ${{ steps.baseline.outputs.tag }}

                      ${{ steps.changelog.outputs.changes }}

                      **Full Changelog**: https://github.com/${{ github.repository }}/compare/${{ steps.baseline.outputs.tag }}...${{ inputs.tag }}
                  files: |
                      release-assets/deneb.${{ inputs.tag }}.pbiviz
                      release-assets/deneb.standalone.${{ inputs.tag }}.pbiviz
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Verify the YAML parses**

Run: `npx --yes js-yaml .github/workflows/release.yml > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Verify the title derivation locally**

Run (Bash): `RELEASE_TAG=2.0.0.5; echo "${RELEASE_TAG%.*}"`
Expected: `2.0.0`

- [ ] **Step 4: Verify the baseline endpoint returns the right tag**

Run: `gh api repos/deneb-viz/deneb/releases/latest --jq .tag_name`
Expected: `1.9.1.0` (latest published release; drafts/prereleases excluded)

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add dispatch-to-draft release workflow for approved submissions"
```

---

### Task 3: Housekeeping — delete stale draft release

**Files:** none (GitHub state only)

- [ ] **Step 1: Confirm the stale draft is what we think it is**

Run: `gh api repos/deneb-viz/deneb/releases --jq '.[] | select(.draft) | {id, tag_name, name, created_at}'`
Expected: one entry with `tag_name: untagged-a218efa1d901295e739d`. If anything else appears, stop and ask the maintainer.

- [ ] **Step 2: Delete it by id**

Run: `gh api -X DELETE repos/deneb-viz/deneb/releases/<id-from-step-1>`
Expected: no output, exit 0.

- [ ] **Step 3: Verify no drafts remain**

Run: `gh api repos/deneb-viz/deneb/releases --jq '[.[] | select(.draft)] | length'`
Expected: `0`

---

### Task 4: PR + post-merge verification checklist

- [ ] **Step 1: Run the local CI mirror** (required by the repo's PR gate)

Run: `npm run ci:local`
Expected: passes (workflow-only changes should not affect it, but the `gh pr create` hook requires it).

- [ ] **Step 2: Open the PR**

```bash
git push -u origin HEAD
gh pr create --base main --title "ci: certification submission tags and gated release workflow" --body "Implements docs/brainstorms/2026-09-04-certification-release-tagging-requirements.md:

- \`submission\` job in ci.yml: numeric 4-part tags (e.g. \`2.0.0.1\`) build the certified package and upload \`deneb.<tag>.pbiviz\` as a 90-day workflow artifact — no release objects for submission iterations.
- \`release.yml\` (manual dispatch with the approved tag): rebuilds AppSource + standalone packages, creates a **draft** release (tag \`2.0.0.N\`, title \`2.0.0\`) with the historical release copy, \`mktcmpid=<tag>\`, auto-changelog baselined on the latest published release, and \`deneb.<tag>.pbiviz\` / \`deneb.standalone.<tag>.pbiviz\` assets. Maintainer reviews and publishes from the GitHub UI.
- Alpha/beta channel flow untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Review the release body template in the PR diff — this is the copy-review gate from the spec.

- [ ] **Step 3: Post-merge, first real submission verifies end-to-end**

Manual checklist for the maintainer (2.0.0.0 cut):

1. Confirm `pbiviz.json` `visual.version` is `2.0.0.0` on the release commit; `git tag 2.0.0.0 && git push origin 2.0.0.0`.
2. Confirm the CI run for the tag runs **only** the `submission` job, goes green, and its sole output is the `deneb.2.0.0.0` artifact.
3. Download the artifact and submit to Partner Center.
4. (Negative check, optional) Push a deliberately mismatched tag such as `9.9.9.9` on the same commit and confirm the run fails at the validation step with the mismatch error; delete the tag afterwards (`git push origin :9.9.9.9`).
5. On approval, dispatch **Release** with the approved tag; confirm a draft release appears with title `2.0.0`, both assets, and correct body; review copy; publish.
6. Confirm the published release shows as **Latest** and the alpha/beta channel prereleases are unaffected.
