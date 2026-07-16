---
title: 'Holistic multi-agent review before release promotion catches cross-PR interaction bugs per-PR review cannot see'
date: 2026-07-16
category: workflow-issues
module: 'release process (cross-cutting: app-core visual-viewer, rendering-lifecycle, dataset pipeline, slice sync, build/certification config)'
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
    - 'Promoting a long-lived integration branch (many individually-reviewed PRs) to a release/main branch'
    - 'The branch touches multiple subsystems whose interactions were never reviewed together (e.g. editor retention x gated viewer x incremental updates)'
    - 'Assembling a remediation plan from review findings that spans multiple work-package branches'
    - 'Delegating fixes to subagents where some fixes are mechanical and some are behavioral/design-bearing'
symptoms:
    - 'Individually-reviewed PRs merged cleanly, but combined behavior produced a last-bind-wins singleton conflict between two live Vega embeds'
    - 'A certification-relevant webpack override landed in the branch HEAD commit without triggering config validation'
    - 'Per-row formatter construction passed every individual PR review but was a hot-path regression only visible in aggregate'
    - 'A safety-net bound assertion used a regex loose enough to false-pass on a violating value'
root_cause: missing_workflow_step
resolution_type: workflow_improvement
related_components:
    - rendering-lifecycle coordinator
    - app-core visual-viewer
    - data-core support field processing
    - build/certification config validation
tags:
    [
        holistic-review,
        multi-agent-review,
        cross-pr-interaction,
        remediation-pipeline,
        design-checkpoint,
        subagent-driven-development,
        pre-release-review,
        ci-local-gating
    ]
---

# Holistic multi-agent review before release promotion catches cross-PR interaction bugs per-PR review cannot see

## Context

Every one of the 103 commits merged into `next` for the 2.0 release had passed
individual PR review, but nobody had reviewed the accumulated 684-file branch
as a whole before promoting it to `main` (an irreversible event for a certified
AppSource visual). Per-PR review is structurally local: it cannot see that
three separately merged, separately reviewed features — the retained hidden
editor tree, the gated viewer, and the incremental-update in-progress guard —
interact destructively only when combined. The 2026-07-15 holistic pass found
**3 Critical + 13 Important** issues in a branch where every constituent PR
was "clean", including one certification hole introduced by the branch's own
HEAD commit. All were remediated across PRs #709–#716 before promotion.

## Guidance

The workflow that produced and remediated the findings, in the shape that made
it work:

**1. Review the branch, not the diffs that built it.** Six scoped parallel
reviewer subagents split by module boundary (app-core UI; app-core state/lib;
root `src/`; vega-runtime + vega-react; data/json/util packages;
release/build/certification + cross-cutting), plus targeted sub-reviews where
risk density was highest (`src/` tests, persistence/migration, state-sync).
Scope is a pathspec over the whole range — not a PR list.

**2. Constraint-prime every reviewer.** Each prompt front-loads the project's
_deliberate_ decisions so they are not reported as findings: the 10s rendering
safety-net certification ceiling, the readers-stay-blank error policy, the
`powerbi-compat` singleton peerDependency+external pattern, alpha/beta builds
staying debug-capable, the vega-embed `actions: false` both-layers workaround.
Priming reviewers with known-intentional tradeoffs prevents review noise from
drowning real findings — and it is cheap, because these decisions are already
written down (CLAUDE.md, docs/solutions/, memory).

**3. Severity-gate the output.** Critical / Important / Minor with file:line
and a verify-before-report rule (a reviewer must confirm a suspected defect
against the actual code before reporting it). The result is a workable
remediation backlog, not a dump.

**4. Decompose remediation into work-package branches.** Each finding cluster
becomes its own branch off the integration branch and its own PR (#709–#716):
reviewable in isolation, revertable in isolation, and each gated on
`npm run ci:local` (see the ci-local discipline in
[local-green-is-not-ci-or-production-green](../best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md)).

**5. Assign models by task nature, and gate design-bearing work on a
checkpoint.** Mechanical fixes with exact prescribed code go to a cheaper
model. Behavioral fixes (the dual-embed invariant, the coordinator epoch
guard) go to a stronger model with a **mandatory design checkpoint**: the
agent proposes a ≤1-page design, the orchestrator reviews it, and only then
does implementation start. Checkpoints caught real design errors before any
code existed — and, symmetrically, gave the implementer standing to push back
on the approved design _with a failing test as evidence_ (see Why This
Matters, item 4).

**6. TDD, with the pure-function escape hatch for untestable layers.**
app-core has no jsdom, so component-tree behavior cannot be unit-tested. The
house pattern is extracting the _decision_ as a pure function and testing that
exhaustively: `computeEmbedActive` (truth table + mutual exclusion),
`resolveDataChangeGate`/`shouldAdvancePrevValues` (12 gate cases),
`shouldOpenEmbedWindow` (deep-equal no-open case).

**7. Orchestrator reviews every work package's diff before it ships.** Not
"tests pass" — whether the fix is actually correct. This loop caught four
defects the automated gates could not (below).

**8. Propagate hygiene rules forward as they are learned.** Two rules were
discovered mid-run and written into every subsequent agent brief: _no literal
control bytes in generated source_ (a NUL delimiter made a source file
git-binary) and _run `npx prettier --check` before committing_ (a skipped
check failed ci:local late). A remediation pipeline is also a feedback loop
for its own instructions.

## Why This Matters

Each of these would have shipped without the orchestrator review loop; none
were catchable by the automated suite:

1. **Identity-vs-deep-compare deadlock (PR #710).** The implementing agent
   keyed a `setViewReady(false)` effect on the spec memo's _identity_, but
   `useVegaEmbed` re-embeds only on _deep_ inequality — and the platform
   provider object is rebuilt every App render, so every update mints a
   new-identity, deep-equal spec. `viewReady` would park `false` forever and
   every data update would deadlock in `'defer'`. Fix: `shouldOpenEmbedWindow`,
   a pure deep-compare mirror of `useVegaEmbed`'s own semantics. The node-only
   suite structurally cannot see this class (component-tree behavior).

2. **A NUL byte made a source file binary to git (PR #713).** A literal NUL
   used as a cache-key delimiter turned diffs opaque. The reviewer's own first
   repair reintroduced the byte via the edit payload — this trap catches even
   people actively watching for it. Fix: a space delimiter (spaces cannot occur
   in BCP-47 locale tags) and a standing no-control-bytes rule.

3. **A skipped prettier check failed ci:local after implementation was
   "done" (PR #714).** Cheap to catch early, expensive late; the fix was
   procedural, not technical.

4. **The implementer refuted part of an approved design, with evidence
   (PR #712).** The design said to clear `inFlightEpoch` on the supersede
   path. The mandated failing-test-first cycle proved that clearing there
   defeats the guard's entire purpose — the superseded render's late callback
   is exactly what the guard exists to catch, so its epoch must survive the
   supersede. Design checkpoints plus TDD give pushback a standard of
   evidence: a failing test, not an opinion.

And the headline structural argument: the dual-embed Critical required three
separately merged, separately reviewed PRs to be live simultaneously before it
manifested. No per-PR review has the surface area to see that.

## When to Apply

- Before promoting any branch of accumulated, individually-reviewed PRs to a
  release/`main`/other irreversible target.
- When multiple PRs touch interacting subsystems: state sync, async
  lifecycles, view/embed ownership, anything with a singleton or shared
  mutable slot (`VegaViewServices`, `pendingRenderId`).
- When the artifact is certification-gated — a gap is a compliance risk, not
  just a bug (PR #709: an unvalidated `VEGA_LOCAL_PATH` webpack alias could
  have shipped a hand-built Vega inside a certified `.pbiviz`).
- Not warranted for a single feature branch reviewed once and merged in
  isolation; the fleet/work-package overhead pays for itself only at
  "many merged PRs, promoting as a unit" scale.

## Examples

Pure decision function enforcing a component-tree invariant jsdom cannot test
(`packages/app-core/src/features/visual-viewer/embed-active.ts`):

```typescript
export const computeEmbedActive = (
    interfaceType: InterfaceType,
    isEmbeddedInEditor: boolean
): boolean =>
    isEmbeddedInEditor
        ? interfaceType === 'editor'
        : interfaceType === 'viewer';
```

Deep equality selected per mapping for deserialized sync values
(`src/lib/state/create-slice-sync.ts`) — fixes an always-false `shallowEqual`
on fresh-`JSON.parse`'d config that re-synced state on every visual update:

```typescript
const areMappingValuesEqual = <TSliceKey extends string>(
    mapping: SliceSyncMapping<TSliceKey>,
    a: unknown,
    b: unknown
): boolean =>
    mapping.serializeForPersistence ? deepEqual(a, b) : shallowEqual(a, b);
```

Compiler-enforced precondition replacing a silent misclassification
(`src/lib/dataset/support-field-provider.ts` + `fields.ts`): the parameter
type requires pre-filtered source columns, and `isSourceField` is a type
predicate so the filter narrows — passing unfiltered columns is a compile
error, not a wrong-index lookup at runtime.

## Related

- [rendering-lifecycle-coordinator-single-owner-2026-07-03](../architecture-patterns/rendering-lifecycle-coordinator-single-owner-2026-07-03.md) — the coordinator this effort's epoch guard (PR #712) extends
- [module-level-singleton-escape-hatch-for-context-refs-2026-05-27](../design-patterns/module-level-singleton-escape-hatch-for-context-refs-2026-05-27.md) — the retention/singleton pattern under the dual-embed Critical
- [viewer-blank-on-spec-error-by-design-2026-07-12](../design-patterns/viewer-blank-on-spec-error-by-design-2026-07-12.md) — policy this effort enforced against a real leak (PR #716's error-boundary fix)
- [local-green-is-not-ci-or-production-green-2026-07-13](../best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md) — ci:local gate discipline each work package followed
- [freeze-on-viewer-editor-transition-2026-05-01](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md), [viewer-bounce-on-editor-exit-2026-05-04](../ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md) — prior bug family at the same editor↔viewer boundary
- PRs #709–#716 (remediation), review method described in PR bodies as "the 2.0 pre-merge review"
