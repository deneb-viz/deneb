# Issue #773 — enter-encoded sizing fix and the 2.0.1 patch release

**Branch:** `fix/773-enter-encoding-sizing`, cut from `certification`.
**Root cause analysis:** [docs/audits/2026-09-25-issue-773-sizing-regression/](../audits/2026-09-25-issue-773-sizing-regression/README.md)

This is the first patch release cut away from `main`. `main` is heading to
2.1 and carries nine commits of in-flight refactoring, so the 2.0.1 line is
based on `certification` — which is both what was submitted to Microsoft for
2.0.0 and the branch AppSource releases are expected to come from.

The spec therefore covers two things: the fix itself, and the release path for
a version that does not exist on `main`.

## Problem

A Vega spec whose marks overflow the data rectangle and are positioned in
`encode.enter` renders with the overflow clipped after upgrading to 2.0. The
reporter's axis labels, at `yscale(0)` with `dy: 15`, disappear entirely.

2.0 binds a patched spec's `width`/`height` to `denebContainer.width` and
`denebContainer.height`, so the `height` signal carries an update expression
over the same object the runtime writes. Under `autosize: fit` — the config
Deneb stamps into every new Vega spec — Vega writes its fitted value into
`height`; any subsequent `denebContainer` write clobbers it and re-fits
against a scenegraph whose enter-encoded marks never moved. The layout lands
on a wrong fixed point roughly 20px too tall and stays there.

The trigger fires on every view: the post-embed reconcile always writes
`denebContainer` once to seed `scrollWidth`/`scrollHeight`, which the
compile-time init leaves at 0. No resize or scroll is needed.

1.9 sized from separate `pbiContainerWidth`/`pbiContainerHeight` signals, so
writes to the container object could not perturb the layout.

## Goals

- Enter-encoded Vega geometry survives a `denebContainer` signal write.
- The fix is the smallest change that holds, because it goes to certification.
- A 2.0.1 release can be tagged, submitted and published from `certification`
  without hand-editing workflows.
- `main` keeps a coherent history so the eventual 2.1 changelog is correct.

## Non-goals

- Reworking the container-signal architecture. The
  [Revision 2 design](../plans/2026-07-23-001-container-signal-consolidation-design.md)
  stands; this closes a hole in it.
- The secondary finding in the audit — `refreshScrollSignal` writing box
  dimensions through the scroll channel, against its own documented contract.
  Neither candidate fix depends on it. It belongs to 2.1 on `main`.
- Any change to Vega-Lite sizing. Vega-Lite uses `'container'` and never binds
  `width`/`height` to `denebContainer`; it is not affected.

## The fix

`patchVegaSpec` stamps `width` and `height` as **literal numbers** rather than
signal references:

```jsonc
// before
"width":  { "signal": "denebContainer.width" },
"height": { "signal": "denebContainer.height" }

// after
"width": 267,
"height": 283
```

The `denebContainer` signal stays exactly as it is, so specs that read
`denebContainer.height` keep working and nothing is removed from the public
signal surface.

This is correct because geometry no longer travels on the signal path.
Revision 2 of the container-signal design already routes container changes
through a cheap re-embed — `refreshContainerDimensions` rewrites the stored
compilation result and the view is rebuilt — so the patched dimensions do not
need to be reactive. Making them inert is what lets `autosize: fit`'s
write-back survive, which is the actual defect.

### Dimension ownership

`patchVegaSpec` only stamps `width`/`height` when the user has not supplied
them (`spec.width == null && !hasSignalNamed(spec, 'width')`). Once stamped as
literals, `updateContainerInitDimensions` can no longer tell a Deneb-owned
literal from a user-authored one, and must not overwrite the latter.

The patch step reports which dimensions it stamped, and the parse step carries
that onto the compilation result's `parsed` object — Deneb's own structure, not
the user's spec, so nothing leaks into what the editor shows.
`refreshContainerDimensions` passes it to `updateContainerInitDimensions`,
which re-stamps only owned dimensions alongside the `denebContainer` init it
already rewrites.

Inferring ownership by comparing the literal against the current init value was
rejected: a user who writes `"width": 400` into a 400px-wide container would
have it silently rewritten on the next resize.

### Rejected alternative

Dedicated scalar signals (`denebContainerWidth` / `denebContainerHeight`) also
hold the layout stable and restore 1.9's exact topology with no ownership
ambiguity. Rejected because it re-adds to the user-visible signal namespace the
names 2.0 deprecated away — `migration.ts` maps `pbiContainerWidth` to
`denebContainer.width` — and a patch release should not leave permanent API
residue. Kept as the fallback if the ownership plumbing proves awkward.

## Testing

**Unit.** `patch-vega.test.ts` currently asserts the signal-reference form and
must be updated to the literal form, including the cases where a user-supplied
`width`/`height` or a user-defined `width`/`height` signal suppresses the patch.
`deneb-container.test.ts` gains coverage for `updateContainerInitDimensions`
re-stamping owned literals and leaving unowned ones alone.

**Regression.** A test pinning the defect itself: build a patched Vega spec with
`autosize: fit` and an enter-encoded mark that overflows the data rectangle,
run the view, write `denebContainer` with an identical box and changed scroll
extents, and assert the `height` signal and mark positions are unchanged. This
is the assertion the existing suite lacks — the defect is invisible to any test
that does not write the signal after the first run.

`docs/audits/2026-09-25-issue-773-sizing-regression/repro.mjs` is the
standalone version of that check and stays as the narrative artefact.

**Local.** `npm run ci:local` before anything is proposed.

## Validation gates

Both gates clear before any PR is opened.

1. **Desktop.** A local build tested against Power BI Desktop by the maintainer,
   using the report attached to the issue.
2. **Reporter.** A local build sent to the reporter (PBI-David) via issue #773,
   and their confirmation received.

Build the gate packages with `npm run package` after the version bump, so they
carry the production GUID and version `2.0.1.0`. The production GUID means the
build drops into the reporter's existing report and picks up its persisted
`vega` and `stateManagement` properties unchanged — no cross-GUID translation,
and no need to re-paste the spec. It is also exactly the artefact shape that
will be submitted.

The certified build has `LOG_LEVEL=0` and no debug flags. If either gate turns
up something needing diagnosis rather than a yes/no, follow up with an ad hoc
`package-standalone` or alpha build; do not move the channel tags, which are
reserved for the 2.1 line on `main`.

## Release path

`pbiviz.json` `visual.version` is the only version to bump — the workspace root
`package.json` has no `version` field, and `.syncpackrc` governs dependency
ranges only, so `validate-packages-sync` is unaffected.

```
 1. fix + tests + pbiviz.json 2.0.0.0 -> 2.0.1.0   (this branch)
 2. npm run ci:local
 3. GATE: Desktop test
 4. GATE: build to the reporter via #773, await confirmation
 5. PR --base certification, team review, merge
 6. git tag 2.0.1.0 && git push origin 2.0.1.0
       -> ci.yml `submission` job -> certified artifact, 90-day retention
 7. smoke the CI artifact in Desktop, then submit it to Partner Center
 8. Microsoft approves
 9. Actions -> Release -> Use workflow from: certification -> tag: 2.0.1.0
       -> draft release, review body, publish
10. merge certification into main
```

Step 7 exists because the artefact tested at the gates is a local build, not
the one that gets submitted. A quick Desktop smoke of the CI output catches
environment or config drift between the two.

### Dispatching the release from `certification`

`release.yml` pins its checkout to `refs/tags/<input>`, so the code always comes
from the tag. The dispatch ref decides only **which copy of the workflow file
runs**, and the two branches' copies differ: `certification` reads
`./pbiviz.json` and `dist/`, `main` reads `./apps/deneb/pbiviz.json` and
`apps/deneb/dist/`, because the `apps/deneb` move landed on `main` after 2.0.0.

The selector must therefore match the tag's line. For a 2.0.x tag, **Use
workflow from: `certification`**. The workflow still appears in the Actions UI
because the file exists on the default branch, and `certification` appears in
the dropdown because it exists there too. Draft and published releases do not
require their tag to be on the default branch.

The changelog needs nothing special. The baseline resolves to the latest
published release, `2.0.0.0`, which is `certification` HEAD — so the walk
`2.0.0.0...2.0.1.0` contains exactly the fix commits.

### Forward-merge, not cherry-pick

`certification` is currently a strict ancestor of `main`; committing the fix
diverges it. Step 10 must be a **merge**, so `2.0.1.0` remains an ancestor of
`main`.

A cherry-pick leaves `2.0.1.0` off `main`'s history. The next release's
changelog baseline is `2.0.1.0`, so its walk would straddle unrelated histories
and its `compare/2.0.1.0...2.1.0.0` link would present the fix as removed.

The merge itself is trivial: `patch-vega.ts` and `deneb-container.ts` are
byte-identical across both branches, and the version bump touches
`pbiviz.json`, which git treats as unrelated to `main`'s
`apps/deneb/pbiviz.json` — so `main` keeps its own version untouched.

## Repeatability changes

Small, and they land with this work rather than waiting for the next patch to
rediscover the problem.

1. **Correct the `release.yml` header comment on both branches.** It currently
   says to leave the selector on `main`, which was true when every tag came off
   `main` and now routes a 2.0.x release into a failing
   `require('./apps/deneb/pbiviz.json')`. It should say the selector must match
   the tag's line.
2. **Add a layout guard to `release.yml`.** Fail fast, with an error naming the
   correct dispatch ref, when the `pbiviz.json` the workflow expects is absent
   but the other location is present. Converts a confusing mid-job failure into
   a one-line diagnosis.
3. **Document the patch-release flow in `CLAUDE.md`.** The branching model
   already says hotfixes branch from `certification` and forward-merge; it does
   not say that the release dispatch ref has to follow, or that the reconcile
   must be a merge.

Items 1 and 2 are workflow edits that must exist on both `certification` and
`main`. They arrive on `main` via the step 10 merge.

## Risks

- **`main` version drift.** After the merge, `main`'s
  `apps/deneb/pbiviz.json` still reads `2.0.0.0`. Bumping it is 2.1 release
  prep, not part of this work, but it is now stale relative to what AppSource
  serves.
- **`fit` behaviour breadth.** The audit measured drift only for `fit`,
  `fit` with `contains: content`, and `fit-y`. `fit-x` showed none at the
  reporter's geometry because that spec has no horizontal overflow; it would
  drift on a spec that does. The fix covers both axes regardless.
- **Repeated gate builds share a version.** Every build during the gate loop
  reports `2.0.1.0`. For a two-person loop, filenames and issue comments are
  enough; a versioned channel tag would be overkill.
