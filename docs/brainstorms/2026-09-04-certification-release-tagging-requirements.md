# Certification submission tagging & gated release automation

- **Date:** 2026-09-04
- **Status:** Approved for planning
- **Context:** Cutting 2.0 for AppSource certification. We need CI-built, trackable
  submission artifacts without publishing a release until Microsoft approves, then a
  single published release mirroring our historical release format plus the
  automation used for alpha/beta channel builds.

## Problem

The historical flow published the GitHub release at submission time with a
"certification pending" placeholder (see the 1.9.1 release body). For 2.0 we want:

1. A reliable tag-per-submission record (`2.0.0.0`, `2.0.0.1`, … for remediations)
   with a CI-built certified package for each, but **no release objects** for these —
   they are throwaway.
2. When a submission is approved (e.g. `2.0.0.5`), publish one release titled with
   the three-digit convention (`2.0.0`), containing the full release copy, the
   auto-generated changelog (as per alpha/beta builds), and both the AppSource and
   standalone `.pbiviz` files as assets.
3. Release copy is reviewed by the maintainer before anything goes public.

## Decisions (settled during brainstorm)

| Decision | Choice |
| --- | --- |
| Submission tag builds | Certified build uploaded as a **workflow artifact** (90-day retention); no release object. Tags are the durable record. |
| Release tag | Reuse the **approved 4-part tag** (e.g. `2.0.0.5`) with title `2.0.0` — matches the historical `1.9.1.0`/`1.9.1` tag/title split. No new 3-part tag. |
| Publish flow | Manual `workflow_dispatch` → builds → creates a **draft** release → maintainer reviews/edits copy in GitHub UI → publishes manually. |
| Assets | **Rebuilt at the approved tag** by the release workflow (no artifact plumbing between runs). |
| Asset naming | `deneb.<tag>.pbiviz` (AppSource) and `deneb.standalone.<tag>.pbiviz` (standalone), matching the `deneb.2.0.0.beta-5.pbiviz` channel convention. Drops the old `Deneb_AppSource_<GUID>` / `Deneb_STANDALONE.<ver>.<date>.<sha>` names. |

## Design

### 1. Submission builds — new `submission` job in `.github/workflows/ci.yml`

- Add `'[0-9]*.[0-9]*.[0-9]*.[0-9]*'` to `on.push.tags`. Existing `ci`/`bench` jobs
  already skip tag refs (`if: !startsWith(github.ref, 'refs/tags/')`), so numeric
  tags run only the new job. The job's `if` positively matches numeric 4-part tags
  so alpha/beta tags never trigger it.
- Maintainer workflow per submission: bump the 4th digit of `visual.version` in
  `pbiviz.json`, commit, tag `2.0.0.N`, push the tag.
- Job steps mirror the `prerelease` job: checkout → `cp .env.ci .env` → Node 22 +
  turbo cache → `npm ci` → `npm run build` → `npm run validate-config-for-commit` →
  `npm run package` (certified build).
- **Guard:** fail before packaging if the pushed tag does not equal
  `pbiviz.json` `visual.version` (prevents a mislabeled submission artifact).
- Rename output to `deneb.<tag>.pbiviz` and upload via `actions/upload-artifact`
  (90-day retention). Maintainer downloads it from the run and submits to Partner
  Center.

### 2. Release publishing — new `.github/workflows/release.yml` (`workflow_dispatch`)

- Single input: the approved submission tag (e.g. `2.0.0.5`). The workflow derives
  the 3-part release title (`2.0.0`) by dropping the 4th component.
- Checks out the tag; validates it exists and matches `pbiviz.json` version (same
  guard as submission).
- Builds both packages: `npm run package` (AppSource) and
  `npm run package-standalone`.
- Renames assets: `deneb.<tag>.pbiviz` and `deneb.standalone.<tag>.pbiviz`.
- Changelog baseline = **tag of the latest published (non-draft, non-prerelease)
  GitHub release**, queried via `gh` — never inferred from tag shape, so failed
  submission tags can never become the baseline.
- Generates the changelog with `requarks/changelog-action@v1` (fromTag = approved
  tag, toTag = baseline), same as the alpha/beta flow.
- Creates a **draft** release via `softprops/action-gh-release@v2`: tag = approved
  4-part tag, name = 3-part version, `draft: true`, `make_latest` left for the
  manual publish step. Body template (in the workflow file, reviewed via PR)
  mirrors the 1.9.1 release copy:
  - Published-to-AppSource paragraph ("This is version `<3-part-version>` of Deneb,
    as published to AppSource") linking to
    `https://deneb.link/appsource?source=repo&mktcmpid=<approved-tag>` — the
    `mktcmpid` is the published (4-part) tag, e.g. `2.0.0.5`, for
    marketing/tracking.
  - Change log link (`https://deneb.guide/docs/changelog`).
  - Certified-build limitations note (external URI fetching disabled).
  - Standalone version explanation (uncertified, allows remote data).
  - `## Changes since <baseline>` — auto-generated changelog.
  - Full-changelog compare link `<baseline>...<approved-tag>`.
- Maintainer reviews/edits the draft body in the GitHub UI and clicks **Publish**
  (release becomes public and latest at that moment).

### 3. Explicit non-changes

- The `prerelease` job's changelog baseline regex (`^\d+\.\d+\.\d+\.\d+$`) will now
  also match submission tags. A beta cut during remediation therefore shows
  "changes since 2.0.0.N" (just the remediation commits) — accepted as more useful
  than noise since the last shipped release. No change.
- No artifact plumbing between submission and release runs (byte-identity to the
  submitted file is not required; add only if it ever matters).
- Alpha/beta channel flow is untouched.

### Housekeeping (opportunistic, same PR)

- Delete the stale `untagged-a218efa1d901295e739d` draft release.

## Success criteria

1. Pushing tag `2.0.0.N` produces a green run whose only output is a
   `deneb.2.0.0.N.pbiviz` workflow artifact built with certified config; no release
   is created or modified.
2. Pushing a tag that mismatches `pbiviz.json` fails fast with a clear error.
3. Dispatching the release workflow with an approved tag yields a draft release
   (tag `2.0.0.N`, title `2.0.0`) with both correctly-named assets and templated
   body + auto-changelog, visible only to maintainers until manually published.
4. Alpha/beta prerelease flow behaves exactly as before.
