---
title: 'fix: Deneb rendering lifecycle certification compliance + resolveDataset refactor'
type: fix
status: active
date: 2026-05-28
origin: docs/brainstorms/2026-05-28-rendering-lifecycle-compliance-requirements.md
---

# fix: Deneb rendering lifecycle certification compliance + resolveDataset refactor

> Filename retains the original `refactor-simplify-deneb-resolve-dataset` slug for continuity; the `resolveDataset` structural split is now the foundation for the broader lifecycle-compliance work this plan absorbs (see origin requirements R11).

## Summary

Make Deneb emit a strict 1:1 Power BI rendering lifecycle by centralising all `host.eventService.rendering*` calls in a single coordinator that opens exactly one close per `update()` (keyed by update identity) and lets exactly one path close it — the async Vega render callback, a synchronous dispatch-path close, or a bounded safety-net. The existing `resolveDataset` structural split lands first as a behavior-preserving foundation; the synchronous closes then attach to its extracted handlers. Also gates property-migration persistence to edit mode, raises the row-window limit to 30,000, and surfaces a per-update start-vs-close tally in the dev overlay.

---

## Problem Frame

`renderingStarted` fires on every `update()` from [src/index.ts](src/index.ts) (currently inside `resolveUpdateOptions`), but the matching close (`renderingFinished`) fires only when the Vega view **re-embeds** — `handleEmbed` in [packages/app-core/src/features/visual-viewer/components/vega-embed.tsx](packages/app-core/src/features/visual-viewer/components/vega-embed.tsx) calls `onRenderingFinished` only on a compilation change. Data-only updates (incremental `view.data()` in [packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx](packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx)), skips, fetch-more dispatches, recover-interrupted-fetch, viewport changes, and property persists therefore emit a start with no close — orphaned starts that hang the snapshot/export service until timeout. Host lifecycle events are also emitted from two places (the `index.ts` `update()` catch and the React callbacks in [src/app/app.tsx](src/app/app.tsx)), and the React callbacks close over `visualUpdateOptions` from state, so under rapid updates a close can be attributed to the wrong update.

The origin requirements doc establishes the full WHAT and the product constraints. This plan defines HOW, building on the in-progress `resolveDataset` refactor rather than running it separately (origin R11).

---

## Requirements

Traced to the origin requirements doc (`docs/brainstorms/2026-05-28-rendering-lifecycle-compliance-requirements.md`):

- R1. `renderingStarted` once, at the very start of every `update()`, before anything that can throw.
- R2. Exactly one terminal event per `update()` on every path (skip, fetch-more, recover, persist/migration-triggered, incremental data, normal render, error).
- R3. No path emits a terminal event twice or emits both finished and failed.
- R4. Hybrid close: render-producing updates close via the async render callback; non-rendering updates close synchronously.
- R5. Every non-rendering dispatch path closes synchronously.
- R6. No update leaves the lifecycle open indefinitely; closes land within the snapshot window.
- R7. Errors yield a clean started→failed pair, never an orphaned start or a finished.
- R8. Proactive segmented fetch retained; each segment update closes 1:1.
- R9. Row-window limit raised 10,000 → 30,000.
- R10. No property-migration persistence in read/`View` mode.
- R11. Coordinated single effort with the `resolveDataset` refactor (this plan).
- R12. Exactly one closer per update; correct under coalesced and stale updates.
- R13. Per-update start-vs-close tally instrumented.
- R14. Tally surfaced in the `PBIVIZ_DEV_OVERLAY` overlay.

**Origin actors:** A1 (report consumer / reader), A2 (report author / editor), A3 (snapshot/export service), A4 (Deneb visual instance)
**Origin flows:** F1 (render lifecycle), F2 (non-rendering lifecycle), F3 (segmented fetch), F4 (migration read vs edit), F5 (snapshot capture & verification)
**Origin acceptance examples:** AE1 (skip closes sync), AE2 (fetch segments close), AE3 (error→failed), AE4 (read-mode no persist), AE5 (edit-mode persist closes sync + follow-up), AE6 (no double-close across closers), AE7 (coalesced-update attribution)

---

## Scope Boundaries

- No conversion of proactive fetch to user-interaction-only; no removal of the fetch feature; no all-synchronous close model (async render close is retained).
- No changes to the `resolveDatasetUpdateAction` decision logic in [src/lib/dataset/data-view.ts](src/lib/dataset/data-view.ts); only the side-effecting dispatch gains lifecycle calls.
- No semantic-model/DAX aggregation work inside the visual.
- No guarantee the snapshot captures fully-painted Vega output (uncontrollable; export captures whatever is painted at capture time).
- The diagnostic tally rides the existing `PBIVIZ_DEV_OVERLAY` dev gate and stays off in certified builds — not a user-facing production feature.

### Deferred to Follow-Up Work

- End-user documentation (export limitations for over-window datasets, DAX-aggregation guidance): handled separately in the documentation repository by the maintainer.
- Full orchestrator-level integration harness (mocked state slices + fake `#host`) for automated 1:1 verification: no such harness exists in this repo today (flagged in the segmented-fetch learning). Lifecycle correctness is unit-tested at the coordinator seam and verified manually via the dev-overlay tally; a dedicated harness is a separate effort.
- Structural migration descriptor for runtime-affecting migrations: AE4's "runtime-affecting migrations applied in-memory" is currently a documented expectation honored by convention (one migration today — the context-menu split). A typed descriptor `{ persistedProperties, applyToModel?(settings) }` consumed by both the persist and read-mode paths would make the contract structural — a future runtime-affecting migration would have to declare its in-memory variant at definition time. Worth doing as a separate refactor PR when a second runtime-affecting migration arrives. The current U5 implementation should add a code comment in `migration.ts` flagging this convention for future contributors.

---

## Context & Research

### Relevant Code and Patterns

- [src/index.ts](src/index.ts) — `Deneb.update`, `resolveUpdateOptions` (fires `renderingStarted` at line ~153, `renderingFailed` in the `update()` catch at line ~137), `resolveDataset` (the dispatch being refactored), `handlePropertyMigration` call site (~line 155).
- [src/lib/dataset/data-view.ts](src/lib/dataset/data-view.ts) — `resolveDatasetUpdateAction` and the `DatasetUpdateAction` union (the seam the dispatch splits along). Unchanged by this plan.
- [src/app/app.tsx](src/app/app.tsx) — `onRenderingFinished` / `onRenderingError` (~lines 154-167) close over `visualUpdateOptions` from state and call `host.eventService` directly; passed down to the platform editor.
- [packages/app-core/src/features/visual-viewer/components/vega-embed.tsx](packages/app-core/src/features/visual-viewer/components/vega-embed.tsx) — `handleEmbed` fires `onRenderingStarted`/`onRenderingFinished` on re-embed only; `handleError` fires `onRenderingError`.
- [packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx](packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx) — incremental `view.data()` path via `performIncrementalUpdate`; `onSuccess` currently only logs (no close).
- [src/state/updates.ts](src/state/updates.ts) — `UpdatesSlice` with `count` (increments per update), `history`, `options`; `setVisualUpdateOptions`. `count` is the natural update-identity seed.
- [src/lib/state/display-mode.ts](src/lib/state/display-mode.ts) — display-mode resolution; note `isEditMode` keys off the `EditMode` enum, which is a **different axis** from `ViewMode`.
- [src/lib/persistence/migration.ts](src/lib/persistence/migration.ts) — `handlePropertyMigration` → `persistProperties`; currently no mode awareness.
- [src/features/visual-update-history-overlay/components/visual-update-history-overlay.tsx](src/features/visual-update-history-overlay/components/visual-update-history-overlay.tsx) and [src/features/viewport-gate-debug-overlay/](src/features/viewport-gate-debug-overlay/) — existing dev-overlay HUD patterns to reuse for the tally.
- [capabilities.json](capabilities.json) — `dataReductionAlgorithm.window.count` (~line 362), currently `10000`.

### Institutional Learnings

- [docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md](docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md) — **primary regression surface.** The four host-quirk fixes that shaped `resolveDataset`; its code-review checklist is the regression contract (preserve the `never` exhaustiveness assertion, the `fetchMoreData` try/catch cleanup, the recover-path slice preservation with `Math.max`, and the bounded cache/slice divergence).
- [docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — **canonical pattern for R12.** Identity tokens must have a single owner (the lifecycle that produces the resource), never a second writer. Drives the "one coordinator owns the token" design.
- [docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md](docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md) — dedup the token against the upstream event stream so coalesced/repeated updates don't double-fire.
- [docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md](docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — pending-map + timeout-prune pattern for async stale-echo races; shape precedent for the pending-close registry; its persist path intersects the migration-gating work.
- [docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md](docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md) — **regression risk for the migration gate.** Raw host mode flags (`isInFocus`) are unreliable; prefer the established, reliable mode signal and don't trust transient flags.
- [docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — extracted units must read identically to their inline originals (the structural-refactor discipline).

### External References

- None. Single-codebase work following established in-repo patterns; the certification contract is captured in the origin doc.

---

## Key Technical Decisions

- **One coordinator owns all `host.eventService.rendering*` calls.** `update()` tells it "started (update N)"; render paths tell it "rendered (update N)"; dispatch paths tell it "no render coming (update N)"; the `update()` catch tells it "failed (update N)". The coordinator enforces exactly-once start and exactly-once close per N. This removes the dual-emitter problem by construction and gives R12 a single owner (per the lifecycle-owns-token learning). React/Vega callbacks stop calling `host.eventService` directly and instead signal the coordinator.
- **Coordinator lives in root `src/`; reached from app-core via the existing injected-callback chain — never via a direct import.** `@deneb-viz/app-core` cannot import the root visual package (the root depends on app-core; a reverse import would invert the package graph). `src/app/app.tsx` is the sole forwarder: it adapts the existing `onRenderingStarted`/`onRenderingFinished`/`onRenderingError` props (already injected down through `DenebPlatformProvider` into `vega-embed.tsx` and `visual-viewer.tsx`) into coordinator calls bound to the current update's id. This preserves the origin doc's "retain the injectable rendering-callback dependency design" decision and keeps the React app decoupled from the host.
- **Update identity is owned by the coordinator, not seeded from `updates.count`.** The coordinator mints its own monotonic id at `open()`. Reaching into `updates.count` was tempting, but `count` is incremented inside `setVisualUpdateOptions` — which runs *after* the relocated `renderingStarted`/open point — so at open time `count` still holds the previous update's value. Coordinator-owned ids preserve the single-owner discipline from the lifecycle-owns-token learning and avoid the chicken-and-egg with the count bump.
- **Coalesced opens supersede-FAIL the prior id (not finish).** When `open(B)` arrives while a prior id A is still open, the coordinator emits `renderingFailed(A.options)` with a synthetic "superseded" reason. Without supersede, A would orphan; using `renderingFinished` would satisfy 1:1 counting but lie to the snapshot service ("page ready for A") for a render that never painted. `renderingFailed` is truthful — the host's snapshot service treats it as "A was abandoned, do not capture this update." The coordinator marks `A.closed = true` *before* the host call so a host-emission throw cannot leave A half-closed. If the host emission throws, the throw **propagates out** of `open(B)` (not swallowed) — `update()`'s catch then routes to `failCurrent(e)`, which finds no successfully-minted B id and no-ops. This preserves the truthful-terminal-or-loud-failure invariant: either the host saw A's terminal, or the visual loudly failed. Swallowing the throw would silently violate AE7 under exactly the host-state conditions where the robustness guarantee was supposed to matter.
- **`handleEmbed`'s `onRenderingStarted` routes to `markPendingRenderStarted()`, not a second `renderingStarted`.** The no-arg coordinator call looks up `pendingRenderId` and flips that id's `renderStarted` flag idempotently. The host does not see a second `renderingStarted`.
- **Pending-render binding is synchronous inside `update()`, not deferred to a React effect.** When a rendering update has set its dataset/compilation, `coordinator.bindPendingRender(id)` is called *immediately* before `update()` returns. This is the central fix for the round-2 race: React effects fire post-commit, by which time a newer `open(B)` may already have arrived; binding inside `update()` captures the correct id at the moment the render is dispatched. When `vega-embed.tsx`'s eventual async embed callbacks fire, they call no-arg coordinator methods (`closePendingRender()` etc.) which use `pendingRenderId` — guaranteed correct because supersede atomically rebinds it when the next render is dispatched. No React layer ever sees or threads an update id; no prop signature changes; no platform-provider extension; no `getCurrentRenderingId` exposure. Single-owner discipline is preserved by the coordinator owning the binding moment.
- **React layer carries zero update-identity state.** Synchronous paths (the `update()` catch, dispatch handler sync closes) use no-arg `*Current` variants. Asynchronous render-path callbacks (`handleEmbed`, `handleError`, incremental success/failure) use no-arg `*PendingRender` variants. `vega-embed.tsx` and the existing `() => void` injected callbacks are unchanged. The whole prop-signature-change ripple the round-2 fix would have caused (touching `VegaEmbedProps`, `DenebPlatformProviderProps`, `DenebPlatformProviderContextProps`, the context object, the hook return type, and the web-client-sample app) is eliminated.
- **`coordinator.open()` sits as the first statement *inside* `update()`'s try/catch.** A throw from the host's `renderingStarted` emission is caught and routed to `failCurrent()`, which no-ops gracefully when no id was minted. This satisfies R1 (start fires before anything that can throw in the update body) without exposing the visual to a crash when the host event service throws.
- **Bounded safety-net closes orphans only, never in-flight renders.** The safety-net checks each id's `renderStarted` flag: if `false` after the bound, the start was orphaned (no render ever began) → close. If `true`, a render is genuinely in flight → extend wait. This prevents the safety-net from re-introducing the premature-finish-before-paint defect under slow renders. Exact bound and trigger (post-commit microtask vs. timer, duration) remain deferred to implementation against observed render timing.
- **Migration gate keys off `viewMode === ViewMode.View`** via a new `isReportInReadMode(options)` helper in `src/lib/state/display-mode.ts`. `ViewMode.View` and `EditMode.Advanced` answer different questions and coexist without conflict: `viewMode === View` answers "is the report being consumed in read mode?" (drives the migration-persist gate); the existing `isEditMode = editMode === 1` answers "is this visual in its own advanced edit mode?" (drives Deneb's editor UI). The reviewer's concern (display-mode tables show `viewMode` pinned at `Edit`) reflected the scope of those tables — they document Desktop editor flows, not published-service consumption. The implementer should still add a one-time diagnostic log at the gate point to verify `viewMode === View(0)` in published read mode and `viewMode === Edit(1)` in editing scenarios; the helper makes that confirmation easy.
- **Read-mode migration uses Path A (in-memory application) for runtime-affecting remaps only.** Auditing `src/lib/persistence/migration.ts`, exactly one existing migration affects read-time behavior: the context-menu split in `getContextMenuMigrationProperties` (pre-2.0 `enableContextMenu: false` → `enableContextMenu: true, enableContextMenuSelector: false`). U5 adds an in-memory version of this remap that mutates the `VisualFormattingSettingsModel` directly in read mode (when persist is suppressed) so the render honors migrated context-menu semantics without a persist. Version-stamp migrations (`developer.version`, `vega.version`) are read-time-invariant and do not need in-memory application — they only matter for cross-session drift detection. Future migrations that change runtime behavior follow this pattern; pure version-stamp migrations do not.
- **Structural refactor lands first, behavior-preserving.** U1-U4 extract the dispatch handlers with no behavior change; the synchronous closes attach to those handlers afterward. Each unit is an atomic commit; the file stays working at every step.
- **Row-window bump is an isolated config change** (U6), independent of the lifecycle work, so it can land and be validated on its own.

---

## Open Questions

### Resolved During Planning

- Keep or remove the async render close? **Keep** for render-producing updates; add synchronous closes only for non-rendering paths (origin decision).
- Where do handlers live? **Private methods on `Deneb`** for the dispatch handlers; the coordinator is a small dedicated module owning host-event emission.
- Is the incremental `view.data()` path in scope? **Yes**, but lower priority — it is not on the export critical path (export sends a single `update()`), yet it must reconcile for 1:1 correctness during interactive use (U10).
- Where does the coordinator live, and how does app-core reach it? **Coordinator lives in root `src/lib/`** (host-coupled). App-core never imports it — `src/app/app.tsx` is the sole adapter that forwards the existing `DenebPlatformProvider`-injected callbacks into coordinator calls bound to the current id. The established package dependency direction (root → app-core) is preserved.
- What is the update-identity seed? **Coordinator-owned monotonic counter**, minted at `open()`. Not seeded from `updates.count` (which is incremented downstream of the relocated `renderingStarted` point and would be stale at open).
- What happens on coalesced opens? **`open(B)` supersede-closes any still-open prior id A** before minting B, so A never orphans. This is the linchpin of AE7.
- How does the safety-net avoid firing `renderingFinished` before paint? **It only orphan-closes** — checks a per-id `renderStarted` flag (set by `handleEmbed`'s `onRenderingStarted` via `coordinator.markRenderStarted`). In-flight renders extend the safety-net wait.
- How is `renderingStarted` kept exactly-once given `handleEmbed` also fires it? **`handleEmbed`'s `onRenderingStarted` routes to `coordinator.markPendingRenderStarted()`**, not to a second host emission. The coordinator's single-start invariant is enforced at the coordinator, not at every emitter.
- Does the React layer need to know `currentId`? **No.** The coordinator exposes no-arg `*PendingRender` and `*Current` variants; `src/app/app.tsx`'s callback adapters call those; the coordinator looks up its own pendingRenderId/openId. React paths carry zero update-identity state. The round-2 attempt to thread a captured id through prop signatures was structurally broken (React effects fire post-commit, downstream of `update()`'s synchronous frame), and is superseded by the pending-render binding in `update()` itself.
- How is the supersede semantically interpreted by the snapshot service? Supersede emits `renderingFailed(A.options)` with a synthetic "superseded" reason, not `renderingFinished`. The host's snapshot service treats this as "A was abandoned; do not capture this update" rather than "A is ready for capture." Satisfies 1:1 counting AND honors the operational meaning of the lifecycle events.
- Where exactly does `coordinator.open()` sit in `update()`? **First statement inside the existing try/catch.** A throw from the host's `renderingStarted` is caught and routed to `failCurrent()`, which no-ops when no id was minted. This satisfies R1 without exposing the visual to crashes when host event emission throws.
- Does a separate "persist-only dispatch path" need to be added? **No.** `handlePropertyMigration` runs before `resolveDataset`; a migration-triggering update still closes via whatever dispatch action `resolveDataset` resolved to (typically skip when migration is the only side-effect; otherwise the rendering path). The safety-net catches any handler that forgets to close; no separate persist-only branch or per-update flag is needed.
- What signal does the migration gate use? **`isReportInReadMode(options)` → `viewMode === powerbi.ViewMode.View`**, exposed as a new helper in `src/lib/state/display-mode.ts`. The existing `isEditMode = editMode === 1` stays — it answers a different question (visual-in-advanced-edit-pane). Both helpers coexist; they answer "report in read mode?" and "visual in advanced edit mode?" respectively. Implementer adds a one-time diagnostic log at the gate point to verify `viewMode` reports the expected values in real Power BI scenarios.
- What does read-mode do with migrations? **Path A (in-memory application) for runtime-affecting migrations only.** Audit of `migration.ts` shows exactly one runtime-affecting migration exists today — the context-menu split in `getContextMenuMigrationProperties` (pre-2.0 `enableContextMenu: false` → split-properties remap). Read mode applies this remap directly to the in-memory `VisualFormattingSettingsModel`; version-stamp migrations are skipped in read mode because they don't affect runtime behavior. Future migrations that affect runtime should be applied in-memory in read mode following the same pattern.

### Deferred to Implementation

- Exact safety-net mechanism and timing bound (post-commit hook vs timer; the close-window duration). Depends on observed render timing — execution-discovery, not plan-time. (The *shape* of the safety-net is now resolved: orphan-only via `renderStarted` flag.)
- Migration consumer audit completeness: the M7 audit verified `getContextMenuMigrationProperties` is the only existing migration that affects in-rendered-spec interactivity. A round-3 finding flagged that `project-sync-mappings.ts` reads `developer.version` and `vega.output.version` via Zustand selectors — confirm during implementation whether those slice values are consumed at *render* time (vs persistence/drift detection only). If any render-path consumer exists, extend the in-memory remap to also apply the version stamps in read mode. Cheap to verify (grep + a single test).

#### From round-4 implementation-discovery items (added 2026-06-03)

These are real, code-verified concerns that exceed planning-tier resolution and require implementation-tier experimentation against actual React/Zustand timing and Power BI host behavior.

- **Late-microtask embed-callback race (the unsolved residual of the round-3 redesign).** `vegaEmbed().then(...)` is a microtask. If `update(N)` is rendering, binds `pendingRenderId = N`, and returns; then `update(N+1)` is *also* rendering, supersede-fails N (clearing pendingRenderId), and rebinds `pendingRenderId = N+1`; THEN N's late embed callback resolves → `closePendingRender()` looks up `pendingRenderId = N+1` and closes N+1 against N's render output. The plan's "safe sub-case" test scenario covers `update(N+1)` being non-rendering (pendingRenderId cleared to null); this case is not covered. Three candidate resolution mechanisms surfaced by round 4 — implementer evaluates against observed timing:
  1. **Cancel prior `vegaEmbed` promise on spec change in `use-vega-embed`** (changes hook semantics — the existing `embedResultRef.current` guard at `use-vega-embed.ts:75` does not currently cancel an in-flight promise).
  2. **Embed an identity token in the compilation object itself** — set when `compileSpec` runs (downstream of `bindPendingRender`); `handleEmbed` reads it from the compilation result and passes it to the close, bypassing the coordinator's mutable `pendingRenderId`.
  3. **Accept the race and rely on the safety-net + tally to surface it** — when an actual mis-attribution occurs, the tally shows it; close the residual via a follow-up tightening once observed.
  The plan's pending-render mechanism handles the common case (non-rendering N+1, or update-rate slower than embed latency) correctly; the residual is a tail-rate race the implementer instruments via the tally to confirm prevalence before committing to a mechanism.
- **Migration leak via project-sync-mappings.** Round-4 grep found that `src/lib/dataset/processing.ts:258-292` calls `isLegacySpec` at render time and, when legacy, calls `state.project.setSupportFieldConfiguration(...)` and `state.project.setDenebMetaVersion(...)`. Both setters are wired through `project-sync-mappings.ts` to `persistProperties`. So a pre-2.0 spec opened in **read mode** still triggers persist via this secondary path even with `handlePropertyMigration` gated — the U5 R10 guarantee leaks. The U5 implementation must additionally either (a) gate the persist-emitting setters in `setSupportFieldConfiguration` / `setDenebMetaVersion` on read mode, or (b) refactor `getMappedDataset` to defer the legacy-migration setter calls when in read mode, or (c) gate the project-sync's persistence layer to skip writes in read mode. Verify the full set of legacy-spec-triggered persists during U5 implementation; the cheap grep approach the earlier round prescribed needs broadening to include `*-sync-mappings.ts` and all sync-triggered persists.
- **Premature-finish on incremental failure → re-compile fallback (U10).** When `performIncrementalUpdate.onFailure` fires, U10 currently has it call `closePendingRender()` *and* trigger `compileSpec()`. The close emits `renderingFinished` synchronously to the host; the re-compile then asynchronously re-embeds. Host sees `renderingFinished` *before* the recovery paint. Same defect class as the round-3 supersede-as-finished problem — finished-before-paint. Options: (a) on `onFailure`, do NOT close immediately; instead bind a new pending-render for the re-compile and let `handleEmbed` for the re-embed close it; orphan risk if the re-compile never completes; or (b) close with `failPendingRender` (truthful: the incremental failed) and let the re-compile's embed close its own freshly-bound id. Pick during U10 implementation against observed re-compile reliability.
- **R12 wording silently expanded to three closer categories.** Origin R12 says "either the async post-render callback OR the synchronous path closes it." The supersede-from-`open(B)` path is neither — it's a third closer that fires inside *B's* synchronous frame, targeting *A's* id. The plan's design is correct; the R12 *contract text* is now imprecise. Worth either restating R12 to admit "one of three closer categories" or accepting that R12 covers the steady-state and supersede is implicitly a state-cleanup variant of the synchronous path. Editorial — does not block implementation; revisit when the brainstorm is next touched.
- **`setVisualUpdateOptions` no-await invariant is load-bearing.** The function is declared `async` but contains no internal `await`; the synchronous `set()` is what makes the read-mode migration's in-memory mutation visible to `handlePropertyMigration` on the immediately-following line. A future maintainer adding any `await` before the `set` call would silently break read-mode rendering. Implementation should add a comment guard at the function declaration noting the no-await invariant is load-bearing for read-mode migration.
- **`isReportInReadMode` behavior on edit→view transitions in the published service.** The display-mode tables in `display-mode.ts:167-191` document `viewMode === 1` (Edit) throughout Desktop edit↔viewer transitions. The plan asserts this is Desktop-specific and published-service consumption reports `viewMode === View` cleanly; this is not verified anywhere in code or docs. The implementer's one-time diagnostic log should specifically capture an edit→view transition in the published service (browser, with edit perms) and confirm the timing of `viewMode` flipping to `View`. If the published service mirrors Desktop's sticky-Edit pattern, the gate fails open during the transition window.
- **`armSafetyNet` could be folded into `open()` (low-priority simplification).** Currently called externally from `update()` after the try/catch; could be auto-armed inside `open()` immediately after the openIds map entry is written. No correctness difference. Worth doing only if it reduces a noticeable line of caller-side code.
- Exact shape of the tally record extending `updates.history` (event sequence vs counts vs mismatch flags).
- Whether 30,000 is within Power BI's `dataReductionAlgorithm` window cap for this categorical mapping — research during U6.
- Exact handler signatures and whether context is passed as one object or positional params (U1-U3).

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

Close-path matrix — every `update()` outcome maps to exactly one closer:

| Update outcome | Renders Vega? | Closer | Event |
|---|---|---|---|
| No data change (skip) | No | Synchronous dispatch | `renderingFinished` |
| Fetch-more dispatched (awaiting next segment) | No | Synchronous dispatch | `renderingFinished` |
| Recover-interrupted-fetch | No | Synchronous dispatch | `renderingFinished` |
| Persist-only (edit-mode migration) | No | Synchronous dispatch | `renderingFinished` |
| Normal finalise → re-embed | Yes (re-embed) | Async render callback (`handleEmbed`) | `renderingFinished` |
| Data change → incremental `view.data()` | Yes (repaint) | Async render callback (incremental success/failure) | `renderingFinished` |
| Vega embed/render error | Attempted | Async error callback | `renderingFailed` |
| Throw before/within processing | No | `update()` catch | `renderingFailed` |
| Any update where no closer fired in time | — | Bounded safety-net | `renderingFinished`/`renderingFailed` |

Coordinator flow:

```
# Coordinator state (single owner; lives in root src/. App-core never imports
# the coordinator directly — that would invert the package dependency graph.
# Root src/app/app.tsx is the only forwarder: it adapts the existing injected
# onRendering* callback props into the coordinator's no-arg pending-render
# methods. No React layer ever sees an update id.)
openIds: Map<id, {options, renderStarted: bool, closed: bool}>
nextId: monotonic counter, owned by the coordinator
        (NOT seeded from updates.count — count increments downstream of open())
pendingRenderId: id | null    # bound synchronously when update() initiates a render
                              # (in src/index.ts, immediately after setDataset /
                              # setCompilation, NOT from a React effect later on)

update(options):
    let id = null
    try:
        id = coordinator.open(options)    # first statement inside try; mints id, emits renderingStarted, tracks in openIds
        resolveUpdateOptions(options)     # locale, migration(gated), resolveDataset dispatch
        # dispatch path either:
        #   - returns after a synchronous coordinator.closeCurrent()         [non-rendering paths]
        #   - sets dataset/compilation, then calls coordinator.bindPendingRender(id);
        #     the React effect chain will paint and eventually invoke the
        #     injected onRendering* callbacks, which the coordinator routes
        #     to the pending-render id                                       [rendering paths]
    catch e:
        coordinator.failCurrent(e)        # no-op if no id was minted; otherwise renderingFailed if id still open
    if id != null:
        coordinator.armSafetyNet(id)      # per-id; only orphan-closes

# React-side callback adapters in src/app/app.tsx — all no-arg, all route
# through the coordinator's pending-render lookup. No prop signature change,
# no captured id, no platform-provider extension, no app-core coordinator
# import. The injected props vega-embed.tsx already calls stay () => void.
onRenderingStarted   → coordinator.markPendingRenderStarted()
onRenderingFinished  → coordinator.closePendingRender()
onRenderingError     → coordinator.failPendingRender(err)

# Synchronous paths (no async lifecycle, no race window) keep the no-arg
# *Current variants. These never look up pendingRenderId — they target
# whichever id is currently open in openIds.
update() catch (sync inside update()):  coordinator.failCurrent(e)
dispatch handler sync close (skip/fetch/recover): coordinator.closeCurrent()

coordinator.open(newOptions):
    # If any previous id is still open when a new update arrives (coalesced),
    # emit its terminal first so the superseded id never orphans. Use
    # renderingFailed (not Finished) so the host's snapshot service does not
    # interpret the supersede as "page ready" for an unpainted render.
    # Mark id.closed=true BEFORE the host call so a throw doesn't leave A
    # half-closed; if the host call throws, the throw PROPAGATES so update()'s
    # catch can surface it loudly rather than silently dropping A's terminal.
    for each prior id A in openIds where not closed:
        coordinator.fail(A, supersededError)   # supersede-failure; may throw
    # Emit host renderingStarted FIRST for the new id. If the host throws,
    # no id is minted, nothing is registered in openIds, no safety-net is
    # armed — the catch in update() can call failCurrent() safely (no open
    # id → no-op).
    host.renderingStarted(newOptions)
    id = ++nextId
    openIds[id] = {newOptions, renderStarted: false, closed: false}
    return id

coordinator.bindPendingRender(id):
    # Called synchronously from src/index.ts after setDataset / setCompilation
    # has fired for a rendering update. Marks "this id owns the next render."
    # If another update() arrives before the render completes, open(B) will
    # supersede-close A and (when B itself triggers a render) call
    # bindPendingRender(B), atomically replacing A's pending-render claim.
    pendingRenderId := id

coordinator.close(id):
    if openIds[id] and not openIds[id].closed:
        host.renderingFinished(openIds[id].options); mark closed
        if pendingRenderId == id: pendingRenderId := null

coordinator.fail(id, e):
    if openIds[id] and not openIds[id].closed:
        host.renderingFailed(openIds[id].options); mark closed
        if pendingRenderId == id: pendingRenderId := null

coordinator.markRenderStarted(id):
    if openIds[id] and not openIds[id].closed:
        openIds[id].renderStarted = true   # idempotent; second call no-ops

# Pending-render methods used by app.tsx's React-side adapters.
# Look up pendingRenderId and act on it. No-op if no render is pending
# (initial mount, between updates, or after a non-rendering update closed
# synchronously).
coordinator.closePendingRender():        if pendingRenderId: coordinator.close(pendingRenderId)
coordinator.failPendingRender(e):        if pendingRenderId: coordinator.fail(pendingRenderId, e)
coordinator.markPendingRenderStarted():  if pendingRenderId: coordinator.markRenderStarted(pendingRenderId)

# *Current variants used by synchronous paths inside update() body.
# Target whichever id is currently open in openIds (typically only one).
coordinator.closeCurrent():           if any open id A: coordinator.close(A)
coordinator.failCurrent(e):           if any open id A: coordinator.fail(A, e)

coordinator.armSafetyNet(id):
    after bounded delay:
        if openIds[id] is open and renderStarted:
            extend wait (render genuinely in flight; do not close)
        elif openIds[id] is open:
            coordinator.close(id)            # orphan-close (no render ever began)
        else: no-op (already closed)
```

The exactly-once invariant (R12) holds because every closer is gated on `openIds[id] and not closed` and the coordinator is the sole emitter of host events. Coalesced updates can no longer orphan a prior id — `open(B)` supersede-**fails** any still-open A (so the host snapshot service does not misinterpret a never-painted render as "ready"). The `pendingRenderId` mechanism eliminates the React-effect-timing race that broke the round-2 mechanism: pending-render is bound synchronously inside `update()` at the moment setDataset/setCompilation fires, not later at React-commit time when a newer update may already have superseded the original id. The React layer carries zero update-identity state; `vega-embed.tsx` and the existing prop callbacks need no signature changes.

---

## Implementation Units

### Phase A — Structural refactor foundation (behavior-preserving)

- U1. **Extract `gatherDatasetUpdateContext`**

**Goal:** Move the input-resolution block of `resolveDataset` (state/settings extraction, categorical resolution, change detection, action resolution, the `Resolved dataset update action` debug log) into a private method returning a context object.

**Requirements:** R11

**Dependencies:** None

**Files:**
- Modify: `src/index.ts`

**Approach:**
- Extract verbatim; `resolveDataset` calls the helper and keeps the existing dispatch in place for now. No comment text changes.

**Patterns to follow:**
- Existing private orchestrator methods on `Deneb` (`resolveUpdateOptions`, `resolveLocale`); `extract-shared-semantics-to-avoid-dual-maintenance` discipline.

**Test scenarios:**
- Test expectation: none -- purely structural extraction, no behavior change; behavior verified in U4.

**Verification:**
- `npm run eslint`, `npm run test`, `npm run webpack:build` pass; `resolveDataset` visibly shorter; new private method present.

---

- U2. **Extract `handleFetchMore`**

**Goal:** Move the `action.kind === 'fetch-more'` branch (flag set, defensive `fetchMoreData` try/catch, success-return, host-decline fall-through) into a private method.

**Requirements:** R8, R11

**Dependencies:** U1

**Files:**
- Modify: `src/index.ts`

**Approach:**
- Lift the block verbatim, including the defensive try/catch and all inline comments on the lines they currently occupy.

**Patterns to follow:**
- Inline structure preserved exactly; segmented-fetch learning's checklist (preserve try/catch cleanup).

**Test scenarios:**
- Test expectation: none -- structural extraction preserving the try/catch invariant; verified in U4.

**Verification:**
- Lint/test/build pass; the `fetch-more` block no longer inline in `resolveDataset`; try/catch comment block intact.

---

- U3. **Extract `handleRecoverInterruptedFetch` and `handleNormalFinalise`**

**Goal:** Move the two `finalise` cases into private methods; the `switch (action.reason)` and its `never` exhaustiveness default stay in the dispatcher.

**Requirements:** R8, R11

**Dependencies:** U1, U2

**Files:**
- Modify: `src/index.ts`

**Approach:**
- Lift each case verbatim. Carry all four recover-path comment blocks (incl. the bounded-invariant note) unchanged. Keep `const _exhaustive: never = action.reason` on the dispatcher default.

**Patterns to follow:**
- Segmented-fetch learning checklist (recover-path slice preservation, `never` assertion).

**Test scenarios:**
- Test expectation: none -- structural extraction preserving every invariant comment; verified in U4.

**Verification:**
- Lint/test/build pass; exhaustiveness assertion still on the dispatcher default; recover-path comments intact.

---

- U4. **Verify the structural refactor leg is behavior-preserving**

**Goal:** Confirm U1-U3 changed no behavior before lifecycle work begins (intermediate checkpoint).

**Requirements:** R11

**Dependencies:** U1, U2, U3

**Files:**
- None (verification only)

**Approach:**
- Run full test suite, lint, packaged build. Manually smoke-test the four segmented-fetch quirks from the learning doc to confirm unchanged behavior.

**Test scenarios:**
- Test expectation: none -- verification against existing `src/lib/dataset/__test__/data-view.test.ts` and the four documented manual scenarios.

**Verification:**
- `npm run test`, `npm run eslint`, `npm run webpack:build` pass; the four host-quirk scenarios behave identically pre/post refactor.

---

### Phase B — Independent compliant changes

- U5. **Read-mode property-migration gate**

**Goal:** Skip property-migration persistence when the report is in read/`View` mode; migrate in memory only. Persist only when editing.

**Requirements:** R10 (AE4, AE5)

**Dependencies:** None

**Files:**
- Modify: `src/lib/state/display-mode.ts` (add `isReportInReadMode(options): boolean` returning `options.viewMode === powerbi.ViewMode.View`)
- Modify: `src/lib/persistence/migration.ts` (accept a "is read mode" boolean; if read mode, skip the `persistProperties` calls and instead apply the runtime-affecting remap in-memory; do not flip `migrationCheckPerformed` in the read-mode bail path)
- Modify: `src/index.ts` (compute `isReportInReadMode(options)` once per update, pass to `handlePropertyMigration`)
- Test: `src/lib/persistence/__test__/migration.test.ts` (create)
- Test: extend `src/lib/state/__test__/display-mode.test.ts` for the new helper

**Approach:**
- Decide persistence on `isReportInReadMode(options)` (`viewMode === ViewMode.View`). Route through the new helper, not a raw flag read at the call site. Do NOT replace the existing `isEditMode = editMode === 1` resolution — that answers a different question (visual-in-advanced-edit-pane); both helpers coexist.
- **In-memory application for runtime-affecting migrations.** In read mode, `handlePropertyMigration` skips `persistProperties` but still applies the context-menu remap (`enableContextMenu: false` → `enableContextMenu: true, enableContextMenuSelector: false`, gated on previous-version < 2.0) directly to the in-memory `VisualFormattingSettingsModel`. Version-stamp updates (`developer.version`, `vega.version`) are not applied in memory because they don't affect runtime behavior — they only matter for drift detection across sessions. The implementation can share a single helper that returns the migrated property bag and either persist it (edit mode) or mutate the in-memory model with it (read mode); same source of truth, two delivery mechanisms.
- **The in-memory mutation is per-update only — read-mode migration re-runs every update by design.** `setVisualUpdateOptions` (in `src/state/updates.ts`) rebuilds settings on every update from a fresh `VisualFormattingSettingsModel` and spreads it over `state.settings`, so the mutation does not persist across update boundaries. Combined with the gate's "do not call `updateMigrationDetails`" behavior (the flag stays `false` in read mode), the migration block re-runs every update and re-applies the remap idempotently. This is load-bearing: a future "optimization" that flips `migrationCheckPerformed` earlier in read mode would silently break the read render because the next update would skip migration entirely. The re-run pattern is also why the in-memory remap must be cheap (a few property assignments) — it executes on every read-mode update.
- **Critical: in read mode, `handlePropertyMigration` returns before any code reads or writes `migrationCheckPerformed`.** The flag is touched only on the edit-mode path. This total bypass is the central fix that prevents two interacting bugs: (1) `updateMigrationDetails` (in `packages/app-core/src/state/migration.ts:73-91`) flips `migrationCheckPerformed: true` AND sets `modalDialogRole: 'Version'` — a read-mode bail that runs inside the `!migrationCheckPerformed` block would still flip the flag and open the Version modal in read mode; (2) `migrationCheckPerformed` lives in the app-core migration slice, **not** in `state.settings`, so `setVisualUpdateOptions` does **not** reset it between updates — once it flips to `true` (from a prior edit-mode session in the same visual instance), a subsequent read-mode update would skip the entire migration block and the in-memory remap would never apply.
- **Structure:**
  ```
  handlePropertyMigration(visualSettings, isReadMode):
      if isReadMode:
          # Always run in read mode, regardless of migrationCheckPerformed:
          # the flag's purpose is "don't re-persist," and we're not
          # persisting in read mode. Apply the in-memory remap each
          # update if conditions match; do NOT call updateMigrationDetails;
          # do NOT flip the flag; do NOT open the Version modal.
          applyInMemoryRuntimeRemapIfNeeded(visualSettings)
          return
      # Edit mode
      if !migrationCheckPerformed:
          updateMigrationDetails({...})     # flips flag + opens Version modal
          runFullMigration(visualSettings)  # persistProperties + version stamps + context-menu remap
  ```
  This fixes the read→edit→read sticky-flag bug: a read-mode update never touches the flag, so an edit-mode session that flipped it does not break subsequent read-mode renders. The `applyInMemoryRuntimeRemapIfNeeded` helper centralizes the runtime-affecting subset of the migration (today: the context-menu split when previous version < 2.0); the persist path uses the same source of truth so the in-memory and persisted variants cannot drift.
- The implementer should add a one-time diagnostic `logDebug` at the gate point showing `viewMode`, `editMode`, `isInFocus` to confirm the expected mode signals in real Power BI scenarios — published-report consumption (`viewMode === View`), Desktop edit canvas (`viewMode === Edit`), and reader-side focus mode on a published visual (`viewMode === View`, `isInFocus === true` — the gate correctly skips persist). Note: `viewMode === InFocusEdit` is defined in the API but not emitted by any current host scenario; the gate behavior for it is symbolic only.

**Patterns to follow:**
- `focus-mode-viewport-overwrites-persisted-dimensions` (treat transient host mode flags as unreliable; prefer the stable signal).

**Test scenarios:**
- Happy path: `viewMode = Edit`, migration needed (pre-2.0 spec with `enableContextMenu: false`) → `persistProperties` invoked with the context-menu remap; `migrationCheckPerformed` flips to `true`. (Covers AE5)
- Happy path: `viewMode = View`, migration needed (pre-2.0 spec) → `persistProperties` NOT invoked; in-memory `visualSettings.vega.interactivity.enableContextMenu` becomes `true` and `enableContextMenuSelector` becomes `false`; render reflects the migrated values. (Covers AE4)
- Edge case: `viewMode = View`, version-stamp-only migration needed (no context-menu remap because the visual is already >= 2.0) → `persistProperties` NOT invoked; in-memory state is unchanged (no runtime-affecting remap to apply); render uses settings as-loaded.
- Edge case: gate ordering — `viewMode = View` (with in-memory remap applied) followed by mode flip to `Edit` in a later update → first call does NOT call `updateMigrationDetails` (so `migrationCheckPerformed` stays `false` AND `modalDialogRole` stays `null`, no Version modal opens); second call (`Edit`) runs the full migration including `updateMigrationDetails` + persist + modal.
- **Read→Edit→Read sticky-flag test (covers the round-3 finding):** sequence: read-mode update with pre-2.0 spec (in-memory remap applies; flag stays false) → edit-mode update (full migration runs; flag flips to true; persist + modal fire) → read-mode update again (the migration slice's flag is still true). Assert: the in-memory remap **still applies** in the second read-mode update because the read-mode path bypasses the flag check entirely; `enableContextMenu` reads `true` on render; no persist call; no Version modal re-opens.
- Edge case: `viewMode = InFocusEdit` → not `View` → persist invoked. (Symbolic test only: `InFocusEdit` is unused by the Power BI host API in practice — no real scenario emits it. Reader focus mode in viewer reports `viewMode === View` with `isInFocus === true`, which the `viewMode === View` gate correctly treats as read mode → skip persist. The test pins the gate logic for the dead-code enum value.)
- Edge case: no migration needed in any mode → no persist, no in-memory mutation regardless.
- Edge case: pre-2.0 spec with `enableContextMenu: true` (no remap qualifies) → no context-menu mutation in either mode.
- Re-run pattern: two consecutive read-mode updates with a pre-2.0 spec → both produce a render where `enableContextMenu === true` and `enableContextMenuSelector === false`. Verifies the in-memory remap is re-applied each update after `setVisualUpdateOptions` resets the settings model.

**Verification:**
- Unit tests pass; in a read-mode report load with a pre-2.0 spec, no persistence-triggered follow-up update fires and the visual still renders migrated behavior.

---

- U6. **Raise row-window limit 10,000 → 30,000**

**Goal:** Increase `dataReductionAlgorithm.window.count` to 30,000 so common datasets resolve in a single update.

**Requirements:** R9

**Dependencies:** None

**Files:**
- Modify: `capabilities.json`

**Approach:**
- Change the window count. First confirm 30,000 is within the platform cap for this categorical mapping (research; if the cap is lower, set to the cap and note it).

**Test scenarios:**
- Test expectation: none -- declarative capabilities change; validated by loading a >10,000-row (≤30,000) dataset and confirming a single window delivers it without a fetch chain.

**Verification:**
- Visual loads up to 30,000 rows in one window; packaged build validates `capabilities.json`.

---

### Phase C — Lifecycle core

- U7. **Rendering lifecycle coordinator (single owner, update-identity, exactly-once, safety-net)**

**Goal:** Introduce one coordinator that owns all `host.eventService.rendering*` emission: `renderingStarted` at the very start of `update()`, an open close keyed by update identity, exactly-once close/fail guards, and a bounded safety-net that closes any still-open identity.

**Requirements:** R1, R2, R3, R6, R7, R12

**Dependencies:** U4

**Files:**
- Create: `src/lib/rendering-lifecycle/coordinator.ts` (host-coupled — emits `host.eventService.rendering*`; cannot live in `@deneb-viz/app-core`, which would invert the package graph)
- Create: `src/lib/rendering-lifecycle/index.ts` (barrel re-exporting the coordinator's public API)
- Modify: `src/index.ts` (`update()` body restructured: `coordinator.open(options)` is the first statement *inside* the existing try; catch routes to `coordinator.failCurrent(e)`; safety-net armed after the try/catch by id captured at open time)
- Modify: `src/app/app.tsx` (defer detailed wiring to U9 — for this unit, just establish that `app.tsx` is the single forwarder from injected props to the coordinator's `*Current` no-arg methods)
- Test: `src/lib/rendering-lifecycle/__test__/coordinator.test.ts`

**Approach:**
- Mint a coordinator-owned monotonic id at `open()`. Do **not** seed from `updates.count` — `count` is incremented inside `setVisualUpdateOptions` (which runs after the relocated `renderingStarted`/open point), so at open time `count` is stale.
- Track per-id state in a map: `{options, renderStarted: bool, closed: bool}`. The coordinator is the single owner of all host event emission and the single owner of "what's currently open" — React/Vega paths never need to pass an id; they call the `*Current` no-arg variants and the coordinator looks up its own openId.
- **Coordinator public API:**
  - `open(options) → id` (used only by `update()` in `src/index.ts`).
  - `bindPendingRender(id)` — called synchronously from `src/index.ts` immediately after setDataset/setCompilation when a rendering update is dispatched. Sets the coordinator's internal `pendingRenderId` so subsequent async render callbacks can target the correct id.
  - `armSafetyNet(id)` (used by `update()` after open).
  - **`*PendingRender` no-arg variants** — `closePendingRender()`, `failPendingRender(error)`, `markPendingRenderStarted()` — used by the React-side adapters in `src/app/app.tsx` to route the existing `() => void` injected callbacks. Look up `pendingRenderId` and act on it. No-op if no render is pending. These replace the round-2 `getCurrentRenderingId`/captured-id mechanism, which was structurally broken because React effects fire post-commit (downstream of `update()`'s synchronous frame).
  - **`*Current` no-arg variants** — `closeCurrent()`, `failCurrent(error)` — used only by synchronous paths inside the `update()` body (the catch, the dispatch handler sync closes). Target whichever id is currently open in `openIds` (typically only one). Distinct from `*PendingRender` because synchronous paths don't go through the pending-render binding.
  - Id-bearing variants (`close(id)`, `fail(id, e)`, `markRenderStarted(id)`) exist on the coordinator for unit-test determinism and internal use by the supersede loop; not called from outside the coordinator in production code.
- **`renderingStarted` placement**: `coordinator.open(options)` is the *first statement inside* `update()`'s existing try/catch. A throw from `open()` (e.g. host throws on `renderingStarted`) is caught and routed to `coordinator.failCurrent(e)`; if no id was successfully minted (open threw before the openIds map was updated), `failCurrent()` no-ops gracefully — the safety-net is never armed for a never-opened id, so nothing leaks. This placement guarantees R1 (start fires before anything that can throw in the update body) without exposing the visual to crashes from host event emission.
- On `open(B)` while a prior id A is still open (coalesced updates), emit A's terminal event before minting B. The terminal is `renderingFailed(A.options)` with a synthetic "superseded" error, not `renderingFinished` — `Finished` would lie to the snapshot service about content readiness. Wrap each host emission inside supersede in try/catch internally; mark `A.closed = true` *before* the host call so a host throw can't leave A half-closed. This is the linchpin of AE7 (now updated in the brainstorm to specify supersede-as-failed).
- `close(id)` / `fail(id, e)` are gated on `openIds[id] && !closed`; stale and double calls no-op silently. This is the exactly-once guard for R12.
- `markPendingRenderStarted()` (no-arg) is the render-began signal from `handleEmbed`'s `onRenderingStarted` — looks up `pendingRenderId` and flips that id's `renderStarted` flag idempotently. The host does not see a second `renderingStarted` (R1).
- The safety-net is per-id and checks `renderStarted` before closing: orphans (no render began) close synchronously when the bound elapses; in-flight renders extend the wait so the safety-net never emits `renderingFinished` before paint. Exact bound deferred to implementation against observed render timing.
- The coordinator lives in root `src/lib/rendering-lifecycle/`. `src/app/app.tsx` is the sole adapter that forwards the existing `onRenderingStarted` / `onRenderingFinished` / `onRenderingError` callbacks (injected via `DenebPlatformProvider`) into the coordinator's `*Current` no-arg methods — `@deneb-viz/app-core` never imports the coordinator.

**Execution note:** Start the coordinator test-first — the token/guard/dedup logic is pure and the highest-risk surface.

**Patterns to follow:**
- `lifecycle-owns-effect-rebind-identity-token` (single owner), `dedup-synthetic-identity-token-rebind-trigger` (coalesced dedup), `stale-echo-triple-render-on-apply` (pending-map + prune shape).

**Test scenarios:**

The coordinator is the only seam where the cert-blocking races resolve. Test every race deterministically with synthetic `open`/`close`/`fail`/`markRenderStarted`/`safety-net-tick` sequences against a mocked `host.eventService` — no host harness needed.

- Happy path: `open` then `closeCurrent()` → exactly one `renderingStarted` + one `renderingFinished`.
- Edge case: `closeCurrent()` twice → second ignored; one `renderingFinished` emitted. (Covers AE6)
- Edge case: `closeCurrent()` then `failCurrent(e)` → fail ignored (already closed). (Covers AE3, AE6)
- Error path: `failCurrent(e)` on an open id → one `renderingFailed`, no `renderingFinished`. (Covers AE3)
- Edge case: `closePendingRender()` / `failPendingRender()` / `markPendingRenderStarted()` with no pending-render bound → no-op; no host events. Ensures app.tsx callbacks during initial mount or before the first rendering update don't blow up.
- **Open throws gracefully: simulate host throwing on `renderingStarted` → `open()` propagates the throw before adding to openIds; `update()` catch calls `failCurrent()` which finds no open id and no-ops; no orphan recorded.**
- **Supersede emits failed, not finished: `open(A)`, then `open(B)` before A closed → host receives `renderingStarted(A.options)`, `renderingFailed(A.options)` with synthetic "superseded" reason, `renderingStarted(B.options)` in that order; A is fully closed (closed=true) before B opens.** (Covers AE7 — now updated for supersede-as-failed)
- **Supersede host-throw propagates loudly: simulate host throwing on the supersede `renderingFailed(A.options)` call → A.closed flips true before the host call; supersede does NOT catch; throw exits `open(B)`; `update()`'s catch invokes `failCurrent(e)` which finds no successfully-minted B id and no-ops; outer error path logs the host emission failure. The host saw A's terminal attempt; the visual surfaces the host fault rather than silently absorbing it.** (Covers R3, AE7 robustness — verifies truthful-or-loud invariant)
- **Pending-render rebinds atomically: `open(A)`, `bindPendingRender(A)`, `open(B)`, `bindPendingRender(B)` → pendingRenderId is B; later `closePendingRender()` closes B (not A; A was already supersede-failed at open(B)).**
- **Stale render callback after supersede: `open(A)`, `bindPendingRender(A)`, `open(B)` (A supersede-failed; pendingRenderId not yet rebound), `closePendingRender()` arrives from A's late embed → closes A's pending binding — but A is already closed (supersede-failed), so no-op; pendingRenderId still A until B binds. Then `bindPendingRender(B)` → pendingRenderId=B. B's own `closePendingRender()` later closes B.** (Covers AE6, AE7 under the late-callback race)
- **Single-start refusal: `markPendingRenderStarted()` twice for same pending id → flag idempotent; host receives no second `renderingStarted`.** (Covers R1)
- **Safety-net orphan-only (no render began): `open(id)`, `armSafetyNet(id)`, never `markPendingRenderStarted()`, then tick bound → safety-net closes; one `renderingFinished` emitted.**
- **Safety-net does NOT close in-flight: `open(id)`, `bindPendingRender(id)`, `markPendingRenderStarted()`, `armSafetyNet(id)`, tick bound → no close; wait extended until `closePendingRender()` arrives.**
- **Closed id is safety-net-inert: `open(id)`, `closeCurrent()`, `armSafetyNet(id)`, tick bound → safety-net no-ops; no second terminal event.** (Covers R3)
- Edge case: `open` with no close and no `markPendingRenderStarted` → safety-net emits exactly one terminal event for that id.

**Verification:**
- Coordinator unit tests pass; `renderingStarted` now fires from `update()` start; no `host.eventService` call exists outside the coordinator after U8/U9.

---

- U8. **Synchronous closes on non-rendering dispatch paths**

**Goal:** Route the skip, fetch-more, recover-interrupted-fetch dispatch paths through `coordinator.closeCurrent()` synchronously, since no async render will follow. Persist-intersected updates close via the same handler-level sync close — no separate "persist-only path" branch is needed.

**Requirements:** R2, R4, R5, R8, R12 (AE1, AE2, AE5)

**Dependencies:** U7, U2, U3, U5

**Files:**
- Modify: `src/index.ts` (extracted handlers from U2/U3 call `coordinator.closeCurrent()` before returning; the skip-return in `resolveDataset` also closes)
- Test: extend `src/lib/__test__/rendering-lifecycle-coordinator.test.ts` / handler-level tests

**Approach:**
- Each non-rendering dispatch handler (`handleFetchMore` for the dispatch-return case, `handleRecoverInterruptedFetch`, the skip-return inside `resolveDataset`) calls `coordinator.closeCurrent()` before returning. The recover path's slice-preservation semantics (`Math.max` rowsLoaded, no `setDataset`) are unchanged — only an additional close call is added.
- The fetch-more *success* return (host accepted `fetchMoreData(true)`) is also a non-rendering close: the segment is processed, the visual will receive a follow-up `update()` for the next segment, and the current segment's lifecycle must close 1:1 before returning.
- **Persist-intersected updates close via the same handler — no special branch, no per-update flag, no assertion.** `handlePropertyMigration` runs *before* `resolveDataset` in the current orchestrator. If migration triggered persist during this update, the host will queue a follow-up `update()` — but the *current* update still closes via whatever dispatch path `resolveDataset` resolved to (skip, fetch, recover, or normal-finalise). The existing dispatch handlers cover every persist-intersected combination naturally; the safety-net (U7) catches any handler that forgets to close. No `persistTriggered` field on `updates.ts` and no defensive post-dispatch assertion are needed — both would be belt-and-braces with no independent failure mode beyond what the safety-net already covers.
- All sync closes preserve `logTimeEnd('processDataset')` pairing — the close call must not be inserted before the existing `logTimeEnd` on any path.

**Patterns to follow:**
- Segmented-fetch learning (do not alter recover semantics); preserve `logTimeEnd('processDataset')` pairing on every path.

**Test scenarios:**
- Skip path → exactly one synchronous `renderingFinished` via `closeCurrent()`; async callback never fires for that id. (Covers AE1)
- Each intermediate fetch-more segment update → its own synchronous close; final painting segment closes via the render path. (Covers AE2 via F3)
- Recover-interrupted-fetch → synchronous close; dataset slice preserved with `Math.max` rowsLoaded unchanged.
- Persist-intersected skip (edit-mode migration on an update with no data change) → exactly one synchronous close via the skip handler; host-issued follow-up update closes independently. (Covers AE5)
- Persist-intersected normal-finalise (edit-mode migration AND data change in the same update) → the current update closes via the async render path (not sync); follow-up persist-triggered update closes via skip-sync. Verifies that persist + render don't double-close.

**Verification:**
- Handler tests pass; dev-overlay tally (U11) shows balanced start/close across skip/fetch/recover/persist-intersected scenarios in manual testing; four-quirk regression clean.

---

- U9. **Async close attribution on render paths; remove direct host emission from React**

**Goal:** Re-embed and incremental render paths signal the coordinator (with the current update identity) instead of calling `host.eventService` directly; the `update()` catch routes to `coordinator.fail`.

**Requirements:** R2, R3, R4, R7, R12 (AE3, AE6)

**Dependencies:** U7

**Files:**
- Modify: `src/app/app.tsx` (forwarder — **add** a new `onRenderingStarted` no-arg adapter (currently absent — app.tsx today wires only `onRenderingFinished` and `onRenderingError`), **replace** the two existing `useCallback` closures with no-arg adapters that route to `coordinator.markPendingRenderStarted()` / `coordinator.closePendingRender()` / `coordinator.failPendingRender(error)`. No `visualUpdateOptions` capture; no id threading. **Pass all three through the existing platform provider props**)
- Modify: `src/index.ts` — `update()` catch routes to `coordinator.failCurrent(e)`; remove the direct `renderingFailed` call once the catch is rewired. **`coordinator.bindPendingRender(id)` is called synchronously at *every* rendering branch in the dispatch path, immediately after `setDataset(getMappedDataset(...))` and before the handler returns. Two sites exist today, both inside extracted handlers from U2/U3:**
  - `handleFetchMore` — the host-decline fall-through branch (currently `src/index.ts:~271`) that calls `setDataset` after `setIsFetchingAdditional` to finalise with the segments it has.
  - `handleNormalFinalise` — the `case 'normal'` branch (currently `src/index.ts:~354`) that calls `setDataset` for the standard rendering finalise.
  Missing the host-decline branch leaves it orphaned. Any future rendering branch added to the dispatch must also call `bindPendingRender` before returning.
- **`packages/app-core/src/features/visual-viewer/components/vega-embed.tsx` callback signatures are unchanged** — `handleEmbed` already calls `onRenderingStarted?.()`, `onRenderingFinished?.()`, and `handleError` calls `onRenderingError?.(error)` with their existing `() => void` / `(error) => void` signatures; those signatures remain stable. The *meaning* of the injected callbacks changes (now coordinator pending-render adapters instead of direct host calls). At the platform-provider type level, `DenebPlatformProviderProps` already declares `onRenderingStarted` as an optional prop today (the type is unchanged); app.tsx is what *starts* passing a value for it. No new type field is added to `DenebPlatformProviderProps`, `DenebPlatformProviderContextProps`, `VegaEmbedProps`, or `useDenebPlatformProvider`.
- **No structural change to `visual-viewer.tsx`'s incremental path** — `performIncrementalUpdate`'s `onSuccess`/`onFailure` likewise call no-arg `coordinator.closePendingRender()` / `coordinator.failPendingRender(error)` adapters injected via the existing prop chain. App-core does **not** import the coordinator and does **not** call `getCurrentRenderingId` (which has been removed from the design).
- Test: coordinator unit tests covering attribution under coalesced updates (extended in U7); a focused integration test for `bindPendingRender` rebinding under rapid `open(A) → bindPendingRender(A) → open(B) → bindPendingRender(B)` sequences.

**Approach:**
- **Pending-render binding is the central mechanism.** When a rendering update sets its dataset/compilation, `src/index.ts` calls `coordinator.bindPendingRender(id)` synchronously, *before* `update()` returns. React will paint asynchronously and eventually invoke the injected `onRendering*` callbacks; those callbacks route through the coordinator's no-arg `*PendingRender` methods, which look up `pendingRenderId` at call time. Because `bindPendingRender` is called synchronously inside the same `update()` frame that dispatched the render, the id is guaranteed correct when bound. If a later `update()` arrives before paint completes, `open(B)` supersede-fails A (host sees `renderingFailed(A.options)`), and when B's render is dispatched, `bindPendingRender(B)` atomically replaces A's pending claim. Late-arriving callbacks from A's render then no-op against the already-closed A id.
- **No React layer ever sees or threads an update id.** The injected `onRenderingStarted`/`onRenderingFinished`/`onRenderingError` callbacks keep their existing `() => void` signatures. This was the round-2 attempt's failure mode (the embed-effect-fire timing did not align with `update()`'s synchronous frame); the pending-render mechanism eliminates that race by binding inside `update()`, not in a downstream React effect.
- **`onRenderingStarted` → `coordinator.markPendingRenderStarted()`**: the no-arg coordinator call flips `pendingRenderId`'s `renderStarted` flag (idempotent). The host never sees a second `renderingStarted`; R1 is enforced inside the coordinator.
- **`onRenderingFinished` → `coordinator.closePendingRender()`**; **`onRenderingError` → `coordinator.failPendingRender(error)`**; **incremental `onSuccess`/`onFailure` → `closePendingRender()`** (the failure-then-recompile fallback is handled by the exactly-once guard — see U10).
- **Synchronous paths keep the no-arg `*Current` variants.** The `update()` catch in `src/index.ts` calls `coordinator.failCurrent(e)` — no async window. The synchronous dispatch handler closes (`skip`/`fetch-more`/`recover`) use `closeCurrent()`.
- Eliminate the dual-emitter setup: after this unit, only the coordinator calls `host.eventService.rendering*`. Verify with a repo-wide grep that no other call site remains.
- **Cross-package direction is preserved.** `@deneb-viz/app-core` does not import the coordinator. The existing `DenebPlatformProvider` injection chain is unchanged in shape; only the implementations passed to the existing props change (in `src/app/app.tsx`).

**Patterns to follow:**
- `lifecycle-owns-token` (single owner); `module-level-singleton-escape-hatch-for-context-refs` if the coordinator must be reached from outside the editor provider subtree.

**Test scenarios:**
- Re-embed completes for current id → embed captured id A at effect time → `close(A)` after paint → exactly one `renderingFinished`. (Covers AE6)
- **Late embed under coalesced opens — the safe sub-case:** `open(A)`, `bindPendingRender(A)`, `update(A)` returns. `update(B)` is non-rendering (skip/fetch/recover): `open(B)` supersede-fails A (`pendingRenderId` cleared to null since it was A); dispatch handler `closeCurrent()` closes B; `update(B)` returns. Microtask: A's late embed resolves → `closePendingRender()` finds `pendingRenderId == null` → no-op. (Covers AE6, AE7 for this case.) Note: the other sub-case where `update(B)` is *also* rendering — and so re-binds `pendingRenderId = B` before A's late embed fires — is the unresolved microtask race tracked under Deferred to Implementation.
- **`onRenderingStarted` from a superseded embed does not flip the successor's `renderStarted`:** capture A, supersede with B, A's late `onRenderingStarted` calls `markRenderStarted(A)` → no-op (A closed); B's `renderStarted` remains false until B's own embed marks it. The safety-net for B correctly orphan-closes if B itself never renders.
- Vega embed error → `fail(capturedId, error)` → exactly one `renderingFailed`, no `renderingFinished`. (Covers AE3)
- Throw in `update()` before dispatch → catch routes `failCurrent`; one started→failed pair. (Covers AE3)
- No `host.eventService.rendering*` call remains outside the coordinator (grep/architecture check).
- No-pending-render no-op: `closePendingRender` / `failPendingRender` / `markPendingRenderStarted` with `pendingRenderId == null` (initial mount, post-final-close) → no host events; no exception thrown.

**Verification:**
- Tests pass; manual rapid-update sequence shows no orphaned or mis-attributed events in the tally.

---

### Phase D — Reconciliation & diagnostics

- U10. **Incremental data-update reconciliation close**

**Goal:** Close the lifecycle for the incremental `view.data()` path so data-only interactive updates reconcile 1:1. Not export-critical (export sends a single update) but required for correctness during interactive use.

**Requirements:** R2, R4, R12

**Dependencies:** U7

**Files:**
- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx` (`performIncrementalUpdate` `onSuccess`/`onFailure` → coordinator close)
- Modify: `packages/app-core/src/features/visual-viewer/incremental-update` if the close hook fits better there
- Test: coordinator attribution test for the incremental path

**Approach:**
- `onSuccess` and the `onFailure` fallback both call `coordinator.closePendingRender()`. The coordinator looks up `pendingRenderId` and closes it. `pendingRenderId` was bound synchronously inside `update()` when `setDataset` fired (per U7's bindPendingRender call from `src/index.ts`), so the close attributes to the correct id regardless of how much later the incremental effect fires.
- The `onFailure` fallback also triggers a re-compile by calling `compileSpec`. The re-compile produces a fresh compilation → VegaEmbed re-embeds → `handleEmbed`'s `onRenderingFinished` calls `closePendingRender()`. If the re-compile arrives within the same `update()` boundary, the original id is already closed and the exactly-once guard no-ops the second close. If a newer `update()` has opened in the meantime, the supersede semantics in U7 have already failed the original id; the re-embed close acts on whatever new pending-render is bound — correct attribution falls out of the coordinator's per-id bookkeeping.
- **Inline-data specs return early in the incremental effect** (`getDataByName(DATASET_DEFAULT_NAME) === undefined` branch); no close fires from this path for those specs. Such updates close via whatever dispatch path `resolveDataset` resolved to OR via the safety-net if no path closes them — same as any other non-incremental update. U10 does not invent a special inline-data close. (Note: for viewport-only updates on inline-data specs that resolve to a non-skip dispatch action without re-embedding, the safety-net is the sole closer; the close lands after the safety-net's bound elapses. Acceptable for non-export scenarios; export sends a single `update()` per visual and is not affected.)

**Test scenarios:**
- Incremental update success → exactly one `renderingFinished` for the pending-render id; no host events from any other path.
- Incremental update failure (e.g., schema mismatch) → fallback re-compile closes the original pending-render id (via `closePendingRender`), the re-embed's subsequent `closePendingRender` no-ops on the same id (already closed) OR closes the newly-bound pending-render if a new update arrived in between — never a double close on any single id.
- Inline-data spec + data change → incremental effect returns early; the current update closes via the dispatch path it took (or safety-net if no rendering and no sync close fired); the incremental path does not invent a close.

**Verification:**
- Tally balanced across interactive data-only updates; no regression to incremental-update behavior.

---

- U11. **Dev-overlay start-vs-close tally**

**Goal:** Instrument a per-update start-vs-close tally (orphans, doubles, which closer fired) and surface it in the `PBIVIZ_DEV_OVERLAY` overlay for Desktop export testing.

**Requirements:** R13, R14 (F5)

**Dependencies:** U7

**Files:**
- Modify: `src/state/updates.ts` (record lifecycle events alongside `history`)
- Modify: `src/features/visual-update-history-overlay/components/visual-update-history-overlay.tsx` (render the tally)
- Test: `src/features/visual-update-history-overlay/__test__/...` or a tally-computation unit test

**Approach:**
- The coordinator records start/close events (id, closer kind, timestamp) into the updates slice; the overlay shows running counts and flags mismatches. Tally computation (reconcile starts vs closes) is the unit-testable seam.

**Patterns to follow:**
- Existing `visual-update-history-overlay` and `viewport-gate-debug-overlay` HUD patterns (env-gated, Desktop-friendly).

**Test scenarios:**
- Happy path: N opens each with one close → tally shows N starts, N closes, 0 orphans.
- Edge case: an open with no close (before safety-net) → tally flags 1 orphan, then 0 after safety-net closes it.
- Edge case: a stale double-close attempt → tally does not double-count closes.

**Verification:**
- With `PBIVIZ_DEV_OVERLAY=true`, the overlay shows a balanced tally across normal/fetch/migration/rapid-update scenarios in Desktop.

---

### Phase E — Verification

- U12. **Full lifecycle compliance verification**

**Goal:** Confirm strict 1:1 across all paths, export/print correctness, no regression in the four segmented-fetch quirks, and that CodeScene no longer flags `resolveDataset`.

**Requirements:** R1, R2, R3, R6, R7, R8, R9, R10 (all AEs)

**Dependencies:** U5, U6, U7, U8, U9, U10, U11

**Files:**
- None (verification only)

**Approach:**
- Run full test suite, lint, packaged build. Use the dev-overlay tally to confirm 1:1 across: cold load, data change (incremental + re-compile), skip, segmented fetch, viewer↔editor transitions, read-mode and edit-mode migration, and rapid successive updates.
- Test print-to-PDF / export from Power BI Desktop on representative reports (≤30,000-row datasets) and confirm complete captures with no timeouts.
- Re-run the four segmented-fetch quirk scenarios for regression.
- Re-scan CodeScene on `src/index.ts`.

**Test scenarios:**
- Test expectation: none added -- runs the full existing suite plus the manual export, tally, and four-quirk regression scenarios. Automated orchestrator integration harness remains deferred.

**Verification:**
- All automated checks pass; tally balanced across every scenario; export captures complete; four quirks regression-free; CodeScene no longer flags `resolveDataset` (or residual is the irreducible dispatcher shape).

---

## System-Wide Impact

- **Interaction graph:** Centralises host lifecycle emission in the coordinator; `index.ts` `update()`, `resolveDataset` handlers, `app.tsx` callbacks, `vega-embed.tsx` `handleEmbed`/`handleError`, and `visual-viewer.tsx` incremental path all now route through it.
- **Error propagation:** The `fetchMoreData` defensive try/catch is preserved; the `update()` catch routes to `coordinator.fail` (exactly one `renderingFailed`); Vega errors route to `fail`, never producing a second event after a finished.
- **State lifecycle risks:** Recover-interrupted-fetch slice preservation and `Math.max` rowsLoaded are unchanged; only an additional synchronous close is added. The coordinator adds per-update identity state to the updates slice.
- **API surface parity:** No `IVisual` interface change. `capabilities.json` window count is an external contract surface (snapshot/host data volume) — the only platform-facing change.
- **Integration coverage:** Exactly-once behavior is unit-tested at the coordinator seam; cross-layer (React render → host) attribution is verified manually via the tally and export testing — no automated host harness (deferred).
- **Unchanged invariants:** `resolveDatasetUpdateAction` decision matrix; `hasDataViewChanged` semantics and bounded cache/slice divergence; the four host-quirk guards; the `never` exhaustiveness assertion; `doesModeAllowEmbedViewportSet`'s `'fetching'` exclusion.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Exactly-once coordination wrong under coalesced/rapid updates (orphan or double) | Coordinator built test-first (U7) with explicit coalesced/stale scenarios; single-owner token pattern; dev-overlay tally surfaces mismatches in real testing. |
| Safety-net fires too early (premature `renderingFinished` before paint) or too late (timeout) | Bound is tunable and deferred to implementation against observed render timing; tally + export testing validate the chosen bound. |
| Regression in the four segmented-fetch quirks (recover path now also closes) | U4 verifies the refactor leg before lifecycle work; recover semantics changed only by adding a close call; U12 re-runs all four scenarios. |
| Dual-emitter removal drops or doubles `renderingFailed` on error | U9 routes both the `update()` catch and Vega errors through `coordinator.fail`; exactly-once guard prevents doubles; architecture check confirms no direct `host.eventService` calls remain. |
| Migration gate keys off the wrong enum (`EditMode` vs `ViewMode`) | Decision explicitly gates on `viewMode === ViewMode.View`; U5 tests cover View/Edit/InFocusEdit; focus-mode learning warns against unreliable raw flags. |
| 30,000 exceeds the platform window cap | U6 confirms the cap first; falls back to the cap value with a note if lower. |
| Export behavior can't be reproduced locally for automated testing | Dev-overlay tally (U11) is the in-Desktop evidence surface; orchestrator harness deferred but tally + manual export cover verification. |
| `renderingStarted` relocation misses an early throw path | U7 places `renderingStarted` as the literal first action of `update()`, before any throwing work; U7 error-path tests confirm started→failed. |

---

## Documentation / Operational Notes

- End-user documentation (export limits, DAX guidance) is handled in the separate docs repo by the maintainer — not in this plan.
- The segmented-fetch learning's "Orchestrator dispatch" code example will be lightly out of date after the refactor + lifecycle changes; an optional one-line note there can point at the new shape (non-blocking).
- Ships in a standard package + certification submission cycle; the dev-overlay tally stays off in certified builds.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-28-rendering-lifecycle-compliance-requirements.md](docs/brainstorms/2026-05-28-rendering-lifecycle-compliance-requirements.md)
- Method under refactor: [src/index.ts](src/index.ts) `Deneb.resolveDataset`, `update`, `resolveUpdateOptions`.
- Decision function (unchanged): [src/lib/dataset/data-view.ts](src/lib/dataset/data-view.ts) `resolveDatasetUpdateAction`.
- Render paths: [src/app/app.tsx](src/app/app.tsx), [packages/app-core/src/features/visual-viewer/components/vega-embed.tsx](packages/app-core/src/features/visual-viewer/components/vega-embed.tsx), [packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx](packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx).
- Update state: [src/state/updates.ts](src/state/updates.ts); dev overlay: [src/features/visual-update-history-overlay/components/visual-update-history-overlay.tsx](src/features/visual-update-history-overlay/components/visual-update-history-overlay.tsx).
- Migration: [src/lib/persistence/migration.ts](src/lib/persistence/migration.ts); mode resolution: [src/lib/state/display-mode.ts](src/lib/state/display-mode.ts); capabilities: [capabilities.json](capabilities.json).
- Regression surface: [docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md](docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md).
- Patterns: [docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md), [docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md](docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md), [docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md](docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md), [docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md](docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md).
