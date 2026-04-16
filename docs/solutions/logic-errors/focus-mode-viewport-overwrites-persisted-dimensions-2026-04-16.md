---
title: Focus mode viewport overwrites persisted view-mode dimensions
date: 2026-04-16
category: logic-errors
module: visual state, powerbi-compat
problem_type: logic_error
component: tooling
symptoms:
  - Opening the editor shows the visual at full-screen (focus mode) dimensions instead of the view-mode layout size
  - stateManagement.viewportHeight/Width contains focus-mode values after entering and exiting focus mode
  - Editor canvas renders oversized relative to the editor panel area
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - viewport
  - focus-mode
  - state-management
  - zustand
  - power-bi-host
  - editor-transition
  - isInFocus
  - regression
---

# Focus mode viewport overwrites persisted view-mode dimensions

## Problem

After entering and exiting Power BI focus mode, the persisted viewport dimensions (`stateManagement.viewportHeight/Width`) were overwritten with full-screen values. When the editor was later opened, the visual rendered at focus-mode size instead of the correct view-mode layout size.

## Symptoms

- Visual renders at ~1400x1119 (full screen) inside the editor panel, instead of ~426x205 (view-mode layout size)
- `stateManagement.viewportHeight/Width` in the visual's persisted properties contains focus-mode dimensions
- Only manifests after the user has entered focus mode at least once in the visual's lifetime
- Reported as [#620](https://github.com/deneb-viz/deneb/issues/620)

## What Didn't Work

- **H1: Focus-mode persistence leak via `sync.ts`** — Initial hypothesis was that `sync.ts` persisted focus-mode dimensions because `mode === 'viewer'` passes for focus mode. While true, fixing the persistence guard alone was insufficient because the embed viewport in state was still set to focus-mode values.
- **H2: Blocking embed viewport set via `doesModeAllowEmbedViewportSet`** — Restoring the `isInFocus` parameter (removed in `daef8888`) initially seemed correct, but Power BI's `options.isInFocus` flag is unreliable — it arrives as `undefined` on many resize events during focus mode. `!undefined === true`, so the guard passed. Making the value "sticky" in state caused the opposite problem: once `isInFocus` became `true`, it never unstuck because Power BI sent `undefined` (not `false`) on subsequent events, blocking ALL viewport sets including initial load.
- **H3: Guarding the fallback path** — Adding `!isInFocus` to the "no viewport" fallback (`if (!embedViewport)`) broke initial load — the visual rendered as a tiny grey square because the embed viewport was never set.

## Solution

Two-part fix across three files:

### 1. Track `isInFocus` as sticky state for persistence guard only

Added `isInFocus: boolean` to `InterfaceSlice` (`src/state/interface.ts`). Computed stickily in the update handler — uses `options.isInFocus` when Power BI provides it, keeps the previous value when `undefined`:

```typescript
// src/state/updates.ts — inside the set() callback
const isInFocus = options.isInFocus ?? state.interface.isInFocus;
return {
    interface: { ...state.interface, isInFocus, mode },
    // ...
};
```

### 2. Guard viewport persistence in sync.ts

The Zustand subscription that persists viewport to `stateManagement` now checks `isInFocus`:

```typescript
// src/lib/state/sync.ts
(state) => ({
    embedViewport: state.interface.embedViewport,
    mode: state.interface.mode,
    hasHydrated: state.updates.__hydrated__,
    isInFocus: state.interface.isInFocus   // sticky value
}),
({ embedViewport: newEmbedViewport, mode, hasHydrated, isInFocus }) => {
    // ...
    if (hasHydrated && mode === 'viewer' && !isInFocus && newEmbedViewport) {
        // persist viewport — blocked during focus mode
    }
}
```

### 3. Fallback uses persisted viewport in editor mode

When the editor opens and `embedViewport` is undefined, the fallback now prefers persisted dimensions over the live viewport (which Power BI reports as full-screen during editor open):

```typescript
// src/state/updates.ts — fallback path
if (!get().interface.embedViewport) {
    const usePersistedDimensions =
        !doesModeAllowEmbedViewportSet(mode) &&
        persistedViewport.height > 0 &&
        persistedViewport.width > 0;
    setEmbedViewport(
        usePersistedDimensions
            ? { height: persistedViewport.height,
                width: persistedViewport.width,
                scale: targetViewport.scale }
            : targetViewport
    );
}
```

The embed viewport itself is NOT blocked during focus mode — it follows reality. Only persistence and the editor-open fallback are guarded.

## Why This Works

The root cause was a combination of two gaps introduced during the 1.9→2.0 port:

1. **`doesModeAllowEmbedViewportSet` lost its `isInFocus` parameter** in commit `daef8888` when porting 1.9.1 focus-mode detection to 2.0. The original guard (added in `15f322f3`) had `!isInFocus` — the port dropped it.

2. **`sync.ts` never had the guard** — created in `fd3bb6a4` before the `isInFocus` guard existed, and never updated.

3. **Power BI reports full-screen dimensions during editor open** — when the fallback fires with no embed viewport, using the live viewport captures the wrong dimensions. The persisted values (written during normal viewer mode) are the correct fallback.

The solution separates concerns:
- **Embed viewport** follows whatever Power BI reports (including focus-mode dimensions) — this is the live state
- **Persistence** is guarded by sticky `isInFocus` — focus-mode dimensions never leak into `stateManagement`
- **Editor fallback** prefers persisted dimensions — immune to Power BI's full-screen reporting during editor transitions

## Prevention

- When porting viewport-related changes across branches, audit ALL guard parameters — a dropped parameter compiles cleanly but silently removes a behavioral guard
- Power BI's `options.isInFocus` is unreliable (`undefined` on many events). Never use it as the sole guard for per-update decisions. Track it as sticky state (update only when explicitly `true`/`false`, keep previous on `undefined`)
- Test viewport behavior across ALL Power BI modes (view, focus, editor, and transitions between them) — not just the happy path

## Related Issues

- [#620](https://github.com/deneb-viz/deneb/issues/620) — the reported bug
- [#603](https://github.com/deneb-viz/deneb/issues/603) — related focus-mode sizing issue (visuals not expanding), fixed in `daef8888`
- [PR #565](https://github.com/deneb-viz/deneb/pull/565) — 1.9.0 milestone that introduced the viewport rework
- [PR #583](https://github.com/deneb-viz/deneb/pull/583) — fix/viewport-persistence follow-up
- [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](../best-practices/type-widening-requires-call-site-audit-2026-04-16.md) — related: the multi-dataset refactor also found state-write gaps via code review
