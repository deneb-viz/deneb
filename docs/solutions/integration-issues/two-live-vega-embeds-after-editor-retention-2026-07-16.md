---
title: 'Two live Vega embeds after editor retention fight the last-bind-wins view singleton'
date: 2026-07-16
category: integration-issues
module: 'app-core visual-viewer (retained editor tree x gated viewer x incremental updates)'
problem_type: integration_issue
component: viewer
symptoms:
    - 'After opening the in-visual editor once, cross-filter/slicer updates stop reaching the visible viewer chart (or apply intermittently)'
    - 'Durable warning spam: every data update trips the incremental-update in-progress guard and forces a full recompile'
    - 'Two renderingStarted/renderingFinished host event pairs per compile'
    - 'Canvas DPR/scale nondeterminism: crispness differs run to run in the same mode'
root_cause: logic_error
resolution_type: code_fix
severity: critical
tags:
    [
        vega-embed,
        editor-retention,
        singleton,
        incremental-update,
        cross-filter,
        view-ownership,
        cross-pr-interaction
    ]
---

# Two live Vega embeds after editor retention fight the last-bind-wins view singleton

## Problem

Once the in-visual editor had been opened, returning to viewer mode left TWO
live `VisualViewer`/`VegaEmbed` instances mounted simultaneously: the retained
(hidden, `display:none`) editor tree keeps its `PreviewArea → VisualViewer`
subtree alive to keep Monaco warm, while `GatedDenebViewer` mounts a second
instance for readers. Both share the compilation Zustand slice and the
last-bind-wins `VegaViewServices` module singleton.

## Symptoms

- Every host data update ran both instances' data-change effects; the second
  `performIncrementalUpdate` call on the same view tripped the in-progress
  WeakSet guard → durable warning + forced full recompile (incremental
  updates effectively disabled).
- Two views raced to `VegaViewServices.bind()`; when the hidden editor's view
  bound last, cross-filter, scroll signals, and tooltips targeted the
  **hidden** view — the visible chart went stale.
- Doubled `onRenderingStarted`/`onRenderingFinished` host events per compile.
- Both instances wrote module-level `effectiveDevicePixelRatio` with different
  scale inputs — last-writer-wins canvas DPR.

## What Didn't Work

- Nothing was "tried and failed" at fix time, but the defect itself survived
  three separate PR reviews: editor retention, the gated viewer, and the
  incremental-update guard were each individually reviewed and merged. The
  interaction only exists when all three are live — no per-PR review had the
  surface area to see it (found by the 2026-07-15 holistic pre-merge review;
  see Related).
- During the fix, keying the embed-in-flight window (`setViewReady(false)`)
  on the spec memo's **identity** was rejected in review: `useVegaEmbed`
  re-embeds only on **deep** inequality, and the platform provider is rebuilt
  every App render, so identity churn without deep change would have parked
  `viewReady` false forever and deadlocked every data update in `'defer'`.

## Solution

Exactly one live embed at any time, selected by a pure decision from the
single `interface.type` store value — mount graph untouched (Monaco retention
and the viewport-match-gate machinery are preserved):

```typescript
// packages/app-core/src/features/visual-viewer/embed-active.ts
export const computeEmbedActive = (
    interfaceType: InterfaceType,
    isEmbeddedInEditor: boolean
): boolean =>
    isEmbeddedInEditor
        ? interfaceType === 'editor'
        : interfaceType === 'viewer';
```

- The inactive instance's `spec` memo returns `null` — `useVegaEmbed` already
  finalizes the view, clears the container, and bumps its generation token on
  null.
- The inactive instance runs **no side effects**: compile effect, data-change
  effect, and the DPR `useLayoutEffect` all early-return on `!isActive`
  (gates encoded as tested pure functions `resolveDataChangeGate` /
  `shouldAdvancePrevValues` in `incremental-update.ts`).
- Deactivation clears the singleton **only with an ownership guard**
  (`vega-embed.tsx`): clear only when `VegaViewServices.getView()` is the view
  THIS instance bound (`ownViewRef`), so an unmounting/inactive instance can
  never wipe the other instance's freshly-bound view.
- The embed-in-flight window opens via `shouldOpenEmbedWindow(prev, next)` —
  a deep-compare mirror of `useVegaEmbed`'s re-embed semantics — so
  `viewReady=false` is only ever set when a real re-embed (and its
  `setViewReady(true)`) is guaranteed to follow.

## Why This Works

Mutual exclusion is enforced by construction: both instances derive activity
from the same single store value with complementary predicates, so they can
never both be active (pinned by a truth-table + mutual-exclusion test). The
ownership guard makes deactivation safe under any effect ordering across the
two component trees. The deep-compare embed window means the
`viewReady` false→true transition spans exactly the real embed lifecycle.

## Prevention

- Any component that binds a shared module singleton must (a) record what it
  bound and (b) only clear what it owns — never clear unconditionally.
- When two mounted instances can exist by design (retention patterns), an
  explicit exactly-one-active invariant with a pure, truth-table-tested
  decision function beats implicit "only one should render" assumptions.
- Effects that set a flag another effect waits on must fire under the SAME
  change semantics as the effect that resets it (identity vs deep-compare
  mismatches deadlock).
- Schedule a holistic cross-PR review before promoting branches where
  retention/gating/guard features ship in separate PRs — this class is
  invisible per-PR (see the workflow doc in Related).

## Related Issues

- [cross-pr-holistic-review-and-remediation-pipeline-2026-07-16](../workflow-issues/cross-pr-holistic-review-and-remediation-pipeline-2026-07-16.md) — how this was found
- [module-level-singleton-escape-hatch-for-context-refs-2026-05-27](../design-patterns/module-level-singleton-escape-hatch-for-context-refs-2026-05-27.md) — the singleton/retention pattern this sits on
- [freeze-on-viewer-editor-transition-2026-05-01](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md), [viewer-bounce-on-editor-exit-2026-05-04](../ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md) — earlier bugs at the same boundary
- Fixed in PR #710 (`fix: single live Vega embed + in-flight update integrity`); review feedback follow-ups in the same PR
