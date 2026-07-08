---
title: 'Rendering Lifecycle Coordinator — single-owner host-event pattern for Power BI custom visuals'
date: 2026-07-03
category: architecture-patterns
module: rendering-lifecycle
problem_type: architecture_pattern
component: tooling
severity: critical
applies_when:
    - 'Building a Power BI custom visual that must emit strict 1:1 host.eventService.rendering* events for Microsoft certification'
    - 'Any host-driven visual where update() may or may not produce a paint (skip / fetch-more / persist-only / incremental-data / renderless paths)'
    - 'Coordinating async render callbacks with a synchronous update() entry point under coalesced updates'
    - 'A host lifecycle event has multiple candidate closers (async render callback, sync dispatch path, error catch, safety-net) and attribution must be correct'
    - 'Certified builds forbid console.error and the host reason string is a write-only sink — error observability requires a dedicated in-app channel'
tags:
    - power-bi
    - rendering-lifecycle
    - certification
    - coordinator-pattern
    - single-owner
    - single-writer
    - update-identity
    - exactly-once
    - safety-net
    - supersede
    - dependency-injection
    - dev-overlay
    - observability
    - power-bi-host
related_components:
    - src/lib/rendering-lifecycle/coordinator.ts
    - src/lib/rendering-lifecycle/types.ts
    - src/index.ts
    - src/app/app.tsx
    - packages/app-core/src/features/visual-viewer/components/vega-embed.tsx
    - packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx
    - src/features/visual-update-history-overlay
    - src/features/dev-overlay-shell
---

# Rendering Lifecycle Coordinator — single-owner host-event pattern for Power BI custom visuals

## Context

Power BI custom visuals get a single lifecycle contract from the host: for every `update(options)` the visual receives, the host expects exactly one matching terminal — `renderingFinished(options)` or `renderingFailed(options, reason)`. That contract underpins the snapshot/export service: PDF export and image snapshots are captured on `renderingFinished`. An orphaned `renderingStarted` breaks export in ways that are cert-blocking during Microsoft's AppSource review.

Deneb's `update()` has more than one dispatch shape:

- **Non-rendering paths** — skip (no data change), fetch-more (host accepted the segment; the next segment will arrive as its own `update()`), recover-interrupted-fetch (viewer↔editor transition aborted a segmented fetch).
- **Rendering paths** — normal finalise, fetch-more where the host declined further segments. React re-renders, Vega embeds, and the completion signal arrives async through `vega-embed`'s `onRendering*` callbacks.
- **Renderless modes** — landing, no-project, initializing, fetching, viewer↔editor transitions. React mounts a status component; Vega never embeds; `vega-embed`'s callbacks never fire.
- **Rendering-mode-without-Vega-change** — a formatting property (editor theme, log level) changes; `handleNormalFinalise` runs but Vega's input deps are unchanged, so `vega-embed`'s effect never re-fires.
- **Incremental data-update path** — Vega view is patched in place via `view.data()`; `vega-embed`'s `onRendering*` callbacks are tied to a full embed, not to in-place updates, so they never fire.

Before this pattern, `renderingStarted` was fired eagerly at the top of `update()` and the terminal was scattered — some paths hit `renderingFinished` via `vega-embed`'s callback, several never did. Attribution was also broken: the async React callback that eventually did close would capture the wrong `visualUpdateOptions` if a newer `update()` had arrived in the meantime.

There is a second constraint that shapes the design: in certified builds `console.error` is forbidden, and the host's `renderingFailed` `reason` parameter is write-only from the visual's perspective. There is no cert-permitted channel for surfacing error context to a developer during a certified build unless the visual builds its own.

## Guidance

The pattern is a **single-owner lifecycle coordinator** — one module owns every `host.eventService.rendering*` call, and everything else in the visual routes through its API. In Deneb it lives at `src/lib/rendering-lifecycle/coordinator.ts` with types at `src/lib/rendering-lifecycle/types.ts`, and it holds seven properties:

### 1. Per-update identity, exactly-once terminal

Every `open()` mints an opaque branded id and records it in a `Map<Id, OpenIdState>`. Terminal paths **delete the entry from the map before emitting to the host**. Map presence _is_ the exactly-once guard — no separate `closed` flag:

```ts
const closeInternal = (id, via) => {
    const state = openIds.get(id);
    if (!state) return; // exactly-once: no-op if already closed
    if (state.safetyNet) state.safetyNet.cancel();
    openIds.delete(id); // delete BEFORE host emission
    observe({ kind: 'closed', id, via });
    emitter.renderingFinished(state.options);
};
```

Ordering matters: if the host throws on emission, the id is already gone. Any follow-up attempt (`update()`'s catch routing to `failCurrent`) finds nothing and no-ops — no half-closed limbo. The doc-comment calls this the "truthful-or-loud" invariant.

### 2. At-most-one open id — supersede as failed

A new `open()` walks the map first and supersede-fails any prior open id with a synthetic `SUPERSEDED_FAILURE_REASON = 'superseded'` marker before minting the new id. Every prior id has a terminal; the marker is distinct from a real render error so diagnostics can separate the two.

### 3. Two dispatch surfaces: `*Current` (sync) vs `*PendingRender` (async)

Synchronous dispatch handlers in `update()` don't know the minted id — it's created inside `update()`'s `try` after `open()`. Threading it through `resolveUpdateOptions → resolveDataset → each handler` would require an optional-id parameter chain. Instead the coordinator exposes **no-arg variants that look up "the currently open id"** (invariant #1 guarantees at most one):

```ts
const closeCurrent = () => {
    const id = currentOpenId();
    if (id === null) return;
    closeInternal(id, 'sync-current');
};
```

Async React callbacks route to `*PendingRender` variants. Dispatch handlers that will render bind the current open id to `pendingRenderId` **synchronously before returning**:

```ts
// handleNormalFinalise, at the end:
this.#coordinator.bindPendingRenderCurrent();
```

By the time React's callback fires, `pendingRenderId` already targets the right id — the async callback needs no arguments and cannot mis-attribute.

### 4. Split type: production API vs test surface

The factory returns a `RenderingLifecycleCoordinatorTestSurface` that adds id-bearing variants (`close(id)`, `fail(id, error)`, `markRenderStarted(id)`) for deterministic test orderings. Production callers narrow at the field declaration:

```ts
#coordinator: RenderingLifecycleCoordinator;
```

The narrower type omits the id-bearing methods, so the type system rejects production code that would hard-code a misleading `via: 'sync-current'` discriminator. Test determinism is preserved without polluting the production API.

### 5. Bounded safety-net — cert ceiling, not a tuning knob

The coordinator can arm a bounded timer per id. It is a **true backstop**: reaching the bound while the id is still open means no other terminal fired, so the safety-net closes it. When it fires:

- If the id already closed normally, the map lookup misses — inert (the normal close cancelled the armed handle).
- Otherwise the id is still open — close it terminally (`renderingFinished`, `via: 'safety-net'`), whether the render never began (orphan) or began but never signalled completion (started-but-stuck).

An earlier iteration **deferred** an in-flight (`renderStarted === true`) render here — "trust it, don't close". That was safe only by accident: `app.tsx`'s 500 ms settle timer was the sole terminal for a started-but-stuck render. Once the settle timer correctly defers on an in-flight render (the H2 fix — see the settle-timer note under _App-side adapters_ below), deferring here too would leave a stuck render's `renderingStarted` orphaned forever — cert-blocking. So the tick now closes terminally at the bound instead of deferring. `renderStarted` is still tracked, but the safety-net no longer branches on it; it is consumed by the settle-close variant (`closePendingRenderSettle`).

The bound in `src/index.ts` is `SAFETY_NET_BOUND_MS = 10_000`. **This is the Power BI certification ceiling, not a tunable.** The H2 fix changed the tick's _decision_ (defer → terminal close), not the bound, and added no re-arm or longer wait. If a legitimate path is exceeding the bound, the fix is to wire that path through the coordinator, not to raise the constant.

### 6. Dependency injection at the seams

The factory takes `{ emitter, scheduler, logger?, observer? }`. Production wires the real host event service and `setTimeout`; unit tests inject a synthetic scheduler that exposes the pending callback for deterministic ticks and a plain mock emitter — no need to instantiate a full `IVisualHost`.

### 7. Observer as the cert-permitted diagnostic channel

Every state transition emits a structured event into an optional observer:

```ts
type RenderingLifecycleEvent =
    | { kind: 'opened'; id; options }
    | { kind: 'render-started'; id }
    | {
          kind: 'closed';
          id;
          via: 'sync-current' | 'async-pending-render' | 'safety-net';
      }
    | {
          kind: 'failed';
          id;
          reason;
          error?;
          via: 'sync-current' | 'async-pending-render' | 'superseded';
      }
    | { kind: 'safety-net-armed'; id }
    | {
          kind: 'safety-net-tick';
          id;
          result: 'closed' | 'deferred' | 'inert';
      };
```

In production `PBIVIZ_DEV_OVERLAY=true` wires the observer to a bounded ring in the visual's Zustand store; a dev overlay computes a live start-vs-close tally by `via` discriminator. Because the event carries the _original_ error value (not just the stringified `reason` the host receives), it's the only channel that can surface real error context in certified builds where `console.error` is banned.

### Visual `update()` wiring

`open()` is the first statement in the `try`; the `finally` arms the safety-net for whichever id was minted:

```ts
public update(options: VisualUpdateOptions) {
    let openId: RenderingLifecycleId | undefined;
    try {
        openId = this.#coordinator.open(options);
        // ... resolveUpdateOptions runs; dispatch handlers call
        // closeCurrent() (non-rendering) or bindPendingRenderCurrent()
        // (rendering)
    } catch (e) {
        this.#coordinator.failCurrent(e);
    } finally {
        if (openId !== undefined) this.#coordinator.armSafetyNet(openId);
    }
}
```

If `open()` itself throws (host rejected the `renderingStarted` emission), `openId` stays `undefined` — the safety-net is never armed for a never-opened id, and `failCurrent()` in the catch finds nothing and no-ops.

### App-side adapters

The React app never imports the coordinator. `src/index.ts` builds four no-arg / one-arg adapters in the constructor and hands them to `<App>` as props:

```ts
this.#onRenderingStartedAdapter = () =>
    this.#coordinator.markPendingRenderStarted();
// Embed-path REAL render-complete close — terminal.
this.#onRenderingFinishedAdapter = () => this.#coordinator.closePendingRender();
// Settle-timer close (app.tsx) — DEFERS to the real close / safety-net
// when a render is in flight (H2). MUST be a distinct reference.
this.#onSettleCloseAdapter = () =>
    this.#coordinator.closePendingRenderSettle();
this.#onRenderingErrorAdapter = (error) =>
    this.#coordinator.failPendingRender(error);
```

`app.tsx` threads `onRenderingStarted` / `onRenderingFinished` / `onRenderingError` unchanged through the platform provider's `onRendering*` slots (the embed path). There's no `visualUpdateOptions` capture and no risk of stale attribution — the id was bound before `update()` returned. `onSettleClose` is used only by the settle timer below; it is **not** threaded to the embed path.

**Why the settle-close adapter is a distinct reference (H2).** A single `onRenderingFinished` adapter used to serve _both_ the embed-path real close and `app.tsx`'s settle timer. Pointing that shared reference at the deferring variant would make _every_ real render close defer to the 10 s safety-net — a severe regression. So the settle timer gets its own `onSettleClose` adapter routed to `closePendingRenderSettle`, while the embed path keeps the terminal `closePendingRender`.

A companion `useEffect` in `app.tsx` handles the two paths Vega's callbacks can't cover:

- **Renderless modes** close synchronously via the terminal `onRenderingFinished()` when the effect runs — Vega never embeds in these modes, so there is never an in-flight render to protect and the close is unambiguously correct.
- **Rendering modes with no Vega-affecting change** get a 500 ms settle timer that closes via `onSettleClose()` — the **deferring** variant. The earlier claim that "when Vega does close first, the timer fires against an already-deleted id so the exactly-once guard makes it a no-op" is only true for a _fast_ render; it is **false for a slow render**, where at the 500 ms mark Vega has _not_ finished (`renderStarted === true`). Closing there would emit `renderingFinished` mid-render and let Power BI's export/snapshot service capture pre-render content (audit finding H2). The deferring variant fixes this: if a render is in flight the settle close **defers** (no-op, no emission), and the terminal belongs to Vega's own `onRenderingFinished` when the embed completes — or the safety-net at its bound if it never does. When _no_ Vega render starts for the update (the non-Vega-affecting formatting-change case this timer targets, `renderStarted === false`), the settle close closes terminally, as designed. React's built-in effect cleanup still caps in-flight timers at one regardless of update-storm size.

## Why This Matters

Each property protects against a specific failure mode observed in Deneb:

| Property | Failure mode when absent |
|---|---|
| Single owner of `rendering*` | Modules drift; some paths emit `renderingStarted` without any matching terminal. PDF export breaks. |
| Delete before host emission | Host throws on emission → visual believes id is still open → follow-up `failCurrent` also emits → host contract violated twice. |
| Supersede as failed | Prior orphan never closes; a burst of resize updates leaves one dangling `renderingStarted` per burst. |
| `*Current` no-arg surface | Handlers need the id threaded through every call site; refactor pressure to route the id via globals or captured locals; attribution drift. |
| `*PendingRender` no-arg surface | React callback captures a `visualUpdateOptions` from N updates ago and emits `renderingFinished(stale)`. Host sees terminal for the wrong id. |
| Split test-surface type | Production code hard-codes `via: 'sync-current'` observer events from an async context; dev-overlay tally becomes actively misleading. |
| Dep injection | Unit tests can't drive supersede/race/safety-net orderings deterministically; test complexity forces the coordinator to grow test-only branches. |
| Safety-net at cert ceiling | If bound > 10s, cert reviewers observe an orphan window; if the bound is tuned per-path, the "raise the number" fix hides genuine wiring bugs. |
| Observer | No cert-permitted way to surface `renderingFailed` error context during a certified build (host `reason` is write-only; `console.error` forbidden). |

## When to Apply

- Any Power BI custom visual whose `update()` has more than one dispatch shape (skip, fetch-more, incremental, renderless landing, transition modes).
- React-in-async-host situations where a synchronous host call triggers async work (embed, fetch, render) whose completion the host cares about, and the async completion callback needs to identify _which_ prior host call it terminates.
- Any visual where certified builds forbid `console.error` and error-context observability requires a dedicated in-app channel.

The pattern is more general than Power BI: read `rendering*` as "host-facing lifecycle events" and it applies to any embedded-widget host contract with the same shape (Office add-ins, Looker Custom Vis, Tableau Extensions).

## Examples

### (a) Old direct-emission (broken attribution) vs coordinator adapters

Before — `app.tsx` captured `visualUpdateOptions` from the store to satisfy the `renderingFinished(options)` signature. By the time the async render callback fired, `visualUpdateOptions` had rolled forward to a newer update and the host received a terminal for the wrong id:

```tsx
// Antipattern (representative of pre-coordinator code)
const options = useDenebVisualState((s) => s.updates.options);
// ... passed down to vega-embed:
onRenderingFinished={() => host.eventService.renderingFinished(options)}
// options may already reference a later update()
```

After — no options capture; the coordinator remembers the id:

```tsx
// src/index.ts constructor
this.#onRenderingFinishedAdapter = () =>
    this.#coordinator.closePendingRender();
// app.tsx: passed as prop, threaded through provider unchanged
```

### (b) Skip-close on a non-rendering dispatch

```ts
if (action.kind === 'skip') {
    logDebug('Visual dataset has not changed. No need to process.');
    // Skip is non-rendering — no async callback will follow.
    // Close synchronously so the host sees a balanced pair.
    this.#coordinator.closeCurrent();
    return;
}
```

### (c) Observer-fed dev-overlay tally

```ts
// src/index.ts constructor — observer wired only when the env gate is on
this.#coordinator = createRenderingLifecycleCoordinator({
    emitter: host.eventService,
    scheduler: renderingLifecycleScheduler,
    logger: logHost,
    observer: IS_LIFECYCLE_OBSERVER_ENABLED
        ? useDenebVisualState.getState().updates.recordLifecycleEvent
        : undefined
});
```

The observer receives events tagged with `via: 'sync-current' | 'async-pending-render' | 'safety-net' | 'superseded'`; the `VisualUpdateHistoryOverlay` reads the ring and tallies close paths per discriminator. Failed events carry the original `error` object, not just the stringified `reason`, so a developer running a certified build can still see the actual error context that the host's write-only `reason` slot swallows.

## Related

- [freeze-on-viewer-editor-transition-2026-05-01.md](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md) — the deferred `renderingStarted`/`renderingFinished` contract mismatch flagged as a "Known follow-up" is **resolved by the pattern in this doc**. The follow-up bullet in that doc can be struck through and replaced with a link here.
- [lifecycle-owns-effect-rebind-identity-token-2026-04-28.md](../best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — the React-side sibling: single-owner identity token for effect rebinds. Same "single-writer of a lifecycle-scoped identity" pattern shape applied to a different scope.
- [segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md](../logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md) — the dataset-lifecycle counterpart. The dispatch actions (`fetch-more`, `recover-interrupted-fetch`) that this coordinator's `closeCurrent()` binds to are defined and defended in that doc.
- [dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md](../best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md) — sibling "don't-saturate-downstream" pattern; different mechanism (dedup guard) but same target (prevent multi-writer noise on a lifecycle-owned signal).
- Originating plan: [`docs/plans/2026-05-28-001-refactor-simplify-deneb-resolve-dataset-plan.md`](../../plans/2026-05-28-001-refactor-simplify-deneb-resolve-dataset-plan.md) — U5–U12 with per-unit rationale.
- Verification checklist: [`docs/plans/2026-06-10-001-u12-lifecycle-compliance-verification.md`](../../plans/2026-06-10-001-u12-lifecycle-compliance-verification.md).
- GitHub issue: [deneb-viz/deneb#553](https://github.com/deneb-viz/deneb/issues/553) — the PDF-export-blank symptom class the coordinator addresses.

**Primary source files:**

- `src/lib/rendering-lifecycle/coordinator.ts` — implementation
- `src/lib/rendering-lifecycle/types.ts` — public API contract, split test-surface type, `RenderingLifecycleEvent` union
- `src/index.ts` — `Deneb.update()` wiring, adapter construction, `SAFETY_NET_BOUND_MS` rationale
- `src/app/app.tsx` — adapter forwarding, renderless-mode close, 500 ms settle timer
- `src/features/visual-update-history-overlay/` — observer consumer + tally
- `src/features/dev-overlay-shell/` — shared shell for dev overlays
