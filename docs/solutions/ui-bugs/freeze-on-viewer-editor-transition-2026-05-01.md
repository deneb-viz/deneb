---
title: Editor freeze at compressed viewport during viewer↔editor transition
date: 2026-05-01
category: ui-bugs
module: app-core
problem_type: ui_bug
component: editor
symptoms:
  - Click "Edit" on the visual; the editor UI is visible at the report-view (compressed) size for ~1–2 seconds
  - "Preparing editor. Please wait..." or the editor itself appears at the wrong size and reflows when the iframe finally expands
  - On a fresh visual, the new-project ("Create") modal opens at the pre-expansion viewport and renders mis-sized
  - Same pattern on cold and warm opens, and across edit-mode entries (not just first-time)
  - Modal dialogs remain visible after exiting editor mode (Fluent v9 portals to document.body)
root_cause: host_paced_iframe_expansion
resolution_type: code_fix
severity: high
tags:
  - editor
  - viewport
  - retention
  - iframe
  - power-bi-host
  - modal-dialog
  - fluent-portal
---

# Editor freeze at compressed viewport during viewer↔editor transition

## Problem

Clicking **Edit** on the visual produced a visible "freeze" at the report-view size for ~1–2 seconds before the editor reflowed to the full edit-pane size. The "Preparing editor" placeholder, the editor's heavy content (Monaco, Allotment, Vega), and the auto-opened new-project modal all rendered at the pre-expansion size and reflowed when the iframe finally caught up. Subsequent re-opens showed the same compressed-then-reflow pattern.

## What didn't work — recorded so future investigations don't retread these

Three rounds of hypothesis-driven fixes were applied before the actual cause was measured. None of them moved the user-visible needle. They are recorded here as cautionary detail.

| Approach | Why rejected |
|---|---|
| `<ViewportSettleGate>` inside `<DenebEditor>` using `ResizeObserver` quiet-debounce | RO can detect "the size stopped changing" but not "the size matches the host's intent". During the iframe's pre-expansion period the size IS stable (at the wrong value), so RO falsely settled and the gate released early. |
| Per-toggle gate with `ResizeObserver` on an always-rendered probe element | Same fundamental issue — RO is the wrong signal for "host has applied its CSS resize". |
| Match on both width AND height | Power BI's host reports a `viewport.height` that is consistently ~36px less than `window.innerHeight` (host chrome offset). The height-equality check essentially never holds. |
| 500ms upper-bound timer | Cold-open iframe expansion was observed at ~1500ms. The timer fired far before the iframe expanded, mounting the editor at the wrong size. Raised to 3000ms in the final fix. |
| Signalling `renderingFinished` earlier to influence the host's expansion timing | Confirmed by traces: the Power BI host does NOT gate iframe expansion on our `renderingFinished` signal. Iframe expansion happened in cycles where no `renderingFinished` was fired. |

## Root cause

The Power BI host **paces the iframe's CSS resize on its own schedule**, independent of any signal we send. The iframe sits at the report-view size for hundreds of milliseconds (sometimes >1500ms cold) after the host has already reported the new `viewport` in `update()` calls, and only then physically jumps to the new size. Our visual cannot speed this up; what we can control is whether our content visibly renders during the host's expansion period.

The reliable positive signal that "the iframe has caught up" is **width equality**:

```ts
window.innerWidth === options.viewport.width
```

This compares the iframe's actual interior width against the host's reported viewport. When they match, the host has finished its CSS resize. (Height is not reliable — see chrome-offset note above.)

## Resolution

A per-toggle viewport-match gate plus retention of the editor tree across viewer↔editor cycles. Specifically:

1. **`<RetainedDenebEditor>`** ([packages/app-core/src/app/retained-deneb-editor.tsx](../../../packages/app-core/src/app/retained-deneb-editor.tsx)) holds the editor wrapper at `display: none` until ALL of:
   - `window.innerWidth === options.viewport.width` (iframe has caught up)
   - `options.viewport.width` has changed since the gate engaged (protects against stale match where the iframe is at viewer-mode size and the host has not yet sent the edit-mode viewport)
   - OR `VIEWPORT_SETTLE_TIMEOUT_MS` (3000ms) elapses (safety net)

2. **Retention via `display: none`** — `<DenebEditor>` mounts once on the first open and stays mounted for the lifetime of the visual instance. The outer shell uses `display: none` when not in editor mode so the viewer's main component fills the pane normally; the inner wrapper toggles `visibility` during the gate-pending window so children measurements stay live.

3. **Sticky-render** in [editor-content.tsx](../../../packages/app-core/src/app/editor/components/editor-content.tsx) — the inner pane layout uses a `useState` latch so it doesn't unmount when retention briefly drops the outer shell to `display: none`. Preserves Monaco state (cursor, scroll, view state) and Allotment splitter positions across reopens.

4. **Modal close on exit** — Fluent v9 dialogs portal to `document.body` and bypass the wrapper's `display: none`. `RetainedDenebEditor` dispatches `setModalDialogRole('None')` when leaving editor mode to unmount the portal cleanly.

5. **Auto-open of the `Create` modal deferred to gate release** — `interface.setType` no longer auto-computes `modalDialogRole`; the auto-open dispatch lives in `RetainedDenebEditor` and fires only after the gate has released. Without this, the new-project picker opened at the iframe's pre-expansion size and rendered mis-sized.

6. **Focus restoration** — without retention's mount-time auto-focus, the Power BI chrome ("Back to report") kept focus from the click that opened editor mode. An `editorFocusTick` Zustand action increments on gate release; `<SpecificationJsonEditor>` listens and re-focuses the active Monaco.

## Diagnosis methodology

The breakthrough came from instrumenting the actual visual properties (not just internal markers). A temporary diagnostic in [src/lib/diagnostics/edit-transition-trace.ts](https://github.com/deneb-viz/deneb) (since removed) sampled `window.innerWidth/Height` and `options.viewport.width/Height` once per animation frame for 2 seconds after every edit-path mode transition, and logged the timeline as a single batched `console.log`. Cross-referencing against the host events (`renderingStarted`, `renderingFinished`, `update()` viewports) showed unambiguously:

- The iframe's `iw` was binary — at the report-view size, then jumped to the full-pane size — with no animation.
- The host reported the new `vw` typically 100–500ms BEFORE the iframe physically resized.
- `renderingFinished` and the iframe expansion did not correlate.

Future similar investigations: when an internal-metric fix (markers, React lifecycle hooks) doesn't move the user-visible symptom, instrument the actual visible properties (`getBoundingClientRect`, `window.innerWidth`, paint events) before designing more fixes. See also [feedback_validate-root-cause.md](../../../C:/Users/.../memory/feedback_validate-root-cause.md) (private memory — won't be in repo) for the broader lesson.

## Related

- Plan: [docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md](../../plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md)
- Branch: `perf/resolve-freeze-on-transition`
- Out-of-scope but related: the `renderingStarted`/`renderingFinished` contract concerns are tracked separately based on correspondence with the Power BI visuals team.
