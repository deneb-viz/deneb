---
title: Zoom-to-Fit produces tiny scale when computed against unhydrated preview viewport
date: 2026-05-20
category: logic-errors
module: app-core/lib/interface
problem_type: logic_error
component: tooling
symptoms:
  - "Editor `Fit` zoom (popover radio and `ctrl+alt+*` shortcut) snaps to 10% instead of fitting the visual"
  - "Bug reproduces when `Fit` is clicked before `useLayoutEffect` in `use-editor-pane-layout.ts` hydrates `previewAreaViewport` from its initial `{0, 0}` state"
  - "Expanding the debug pane (small preview height) makes the bug more reliable to reproduce"
  - "Keyboard shortcut path writes a raw negative zoom value to `editorZoomLevel` state; popover path silently clamps to the min (10%)"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - app-core/lib/commands/actions
  - app-core/app/editor/hooks/use-editor-pane-layout
  - app-core/state/editor
tags:
  - zoom
  - fit
  - viewport
  - editor
  - unhydrated-state
  - clamp
  - pure-helper
  - silent-clamp
---

# Zoom-to-Fit produces tiny scale when computed against unhydrated preview viewport

## Problem

In Deneb's advanced editor, invoking "Fit" zoom (popover Fit radio or `ctrl+alt+*` hotkey) before the editor pane layout had measured itself produced absurdly small zoom values — typically snapping the visual to 10% — instead of fitting the preview area. The same failure occurred with a fully-hydrated layout when the debug pane was expanded to consume most of the editor height.

> **Scope note.** This doc covers the `<= 0` / negative-scale failure mode in the pure math. A sibling failure mode — non-zero-but-stale `previewAreaViewport` inputs slipping past the guard because hydration captured a mid-iframe-expansion size — is covered separately in [`zoom-to-fit-stale-preview-area-after-iframe-expansion-2026-05-21.md`](zoom-to-fit-stale-preview-area-after-iframe-expansion-2026-05-21.md). Both fixes are needed to fully close the user-visible umbrella ("Fit shrinks the visual"); this one alone is necessary but not sufficient.

## Symptoms

- Open the advanced editor, immediately click the zoom popover and select "Fit": the visual collapses to ~10% instead of fitting.
- Expand the debug pane to dominate the editor height, then click Fit: same ~10% collapse.
- Trigger Fit via the `ctrl+alt+*` hotkey under the same conditions: zoom can land on a *negative* value because the hotkey path writes directly to state without the popover's downstream clamp.
- No console error, no diagnostic — the math silently produces nonsense and the UI accepts it.

## What Didn't Work

The original [`getZoomToFitScale()`](../../../packages/app-core/src/lib/interface/layout.ts) clamped only the upper bound at each return point (`Math.min(scaleFactorX, max)`) and had no input guard. The author had implicitly relied on the popover's downstream clamp (`Math.max(Math.min(value, max), min)` in `handleCustomZoomLevelChange`) to catch bad outputs. Two things broke that assumption:

1. **The downstream clamp masked the root cause.** When `previewAreaViewport` was the seed default `{width: 0, height: 0}`, `getAdjustedPreviewAreaWidthForPadding(0)` returned `-20`, `previewWidth - ZOOM_FIT_BUFFER` was `-35`, and the scale factor came out negative. The downstream `Math.max(value, min)` then silently transformed "fit couldn't compute" into "valid zoom of 10%". The bug felt mysterious rather than diagnostic.
2. **The hotkey path bypassed the clamp entirely.** [`handleZoomFit`](../../../packages/app-core/src/lib/commands/actions.ts) calls `updateEditorZoomLevel(rawValue)` directly, so a negative scale factor could land in persisted visual state.

A prior fix in this neighborhood ([`docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md`](focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md)) had already established the `> 0` dimension-guard pattern for viewport-consuming code. That pattern simply was not applied here — the fit calculation was an outlier.

## Solution

Three changes to [`packages/app-core/src/lib/interface/layout.ts`](../../../packages/app-core/src/lib/interface/layout.ts):

1. **Input guard** that returns `VISUAL_PREVIEW_ZOOM_CONFIGURATION.default` when any of `previewAreaWidth`, `previewAreaHeight`, `width`, or `height` is `<= 0`.
2. **Symmetric clamp** at each return point: `Math.max(min, Math.min(value, max))` instead of `Math.min(value, max)`.
3. **Pure-helper extraction**: split `getZoomToFitScale()` (which reads from `getDenebState()`) from `computeZoomToFitScale({ previewAreaViewport, embedViewport })` (pure math). The Zustand-bound wrapper stays trivial; the math becomes unit-testable without store-mocking infrastructure.

Before:

```typescript
scaleFactorWidth = Math.floor(100 / (width / (previewWidth - ZOOM_FIT_BUFFER))),
scaleFactorHeight = Math.floor(100 / (height / (previewHeight - ZOOM_FIT_BUFFER))),
// ...
return Math.min(scaleFactorWidth, max);  // clamps max only
```

After:

```typescript
if (
    previewAreaWidth <= 0 ||
    previewAreaHeight <= 0 ||
    width <= 0 ||
    height <= 0
) {
    return zDefault;
}
// ...
const clamp = (value: number) => Math.max(min, Math.min(value, max));
return clamp(scaleFactorWidth);
```

A 12-case unit suite in [`packages/app-core/src/lib/interface/__tests__/layout.test.ts`](../../../packages/app-core/src/lib/interface/__tests__/layout.test.ts) pins the behaviour: six input-guard cases (zero/null/negative dimensions return `DEFAULT_ZOOM`), three output-clamp cases (clamp to MIN below, MAX above, and the tiny-pane case pins to MIN), two happy paths (height-binding → 75, width-binding → 58), and one regression guard explicitly locking the `<= 0` check against future narrowing to `=== 0`.

## Why This Works

**Input guards beat output clamps for measurement-driven math.** An output clamp can only ask "is the result in range?" — it cannot distinguish "the inputs were valid and the math produced 10%" from "the inputs were garbage and the math produced -47, which we then clamped to 10%". Both look identical downstream. The user sees an in-range value and the system has no way to surface that the computation was meaningless. An input guard asks the *correct* question: "do I have enough information to do this math at all?" When the answer is no, returning `zDefault` (the current visual's zoom, falling through to 100%) makes the failure mode visible — the user sees Fit as a no-op rather than a destructive snap to 10% — without leaving broken state behind.

**Extracting a pure helper is the right shape here** because the math has no business knowing about Zustand. `getZoomToFitScale()` stays as the integration seam (one line: read state, delegate); `computeZoomToFitScale()` takes plain inputs and is trivial to test. Without this split, every test case would need a Zustand store mock just to exercise arithmetic. The split also documents intent: the wrapper exists only to bridge state to math. This is the same pattern the prior best-practice doc [`extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) prescribes for cases where multiple entry paths must agree.

## Prevention

- **The 12-test unit suite** locks every failure mode (zero/null/negative inputs, MIN/MAX clamp boundaries, both binding axes) and includes an explicit regression guard against narrowing the `<= 0` check to `=== 0`.
- **Rule:** any zoom or viewport calculation that consumes a measurement-driven dimension must check `> 0` on every input before running math on it. Negative or zero values are an "I don't know yet" signal, not a number.
- **Rule:** clamp at the source, not at the call site. Every entry path (popover, hotkey, future surfaces) should be able to consume the returned value verbatim. Defensive re-clamping at call sites is a smell — it means the producer is shipping out-of-contract values, and the silent transformation hides the real failure from anyone trying to diagnose it.

## Related Issues

- [`docs/solutions/logic-errors/zoom-to-fit-stale-preview-area-after-iframe-expansion-2026-05-21.md`](zoom-to-fit-stale-preview-area-after-iframe-expansion-2026-05-21.md) — sibling failure mode for the same user-visible umbrella. That fix handles the case where `previewAreaViewport` is non-zero but stuck at a partial-iframe-expansion size; this fix handles the case where it's `{0, 0}` or otherwise non-positive. Together they cover the full surface.
- [`docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md`](focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md) — establishes the `> 0` dimension-guard pattern that this fix re-applies. Both involve the `{0, 0}` unhydrated viewport shape; that doc is the write-time guard, this one is the read-time guard.
- [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — backs the pure-helper extraction pattern for cases where parallel entry paths (here: popover, hotkey, command bar) must agree on output semantics.
- [`docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md) — documents the host-paced iframe expansion that creates the unhydrated `previewAreaViewport` window in the first place. Upstream cause.
