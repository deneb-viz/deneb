---
date: 2026-05-28
topic: rendering-lifecycle-compliance
---

# Rendering Lifecycle Certification Compliance

## Summary

Make Deneb emit a strict 1:1 Power BI rendering lifecycle — exactly one `renderingStarted` and one matching `renderingFinished`/`renderingFailed` per `update()`. Vega-rendering updates keep closing via the asynchronous post-render callback (which fires after paint); any update that returns without a Vega render — skip, fetch-more, persist/migration-triggered, recover — closes itself synchronously. A per-update tally of starts vs. closes is instrumented and surfaced in the dev overlay so 1:1 can be verified during Desktop export testing. The existing data-fetch flow is retained, the dataset row-window limit is raised, and property-migration writes are suppressed in read mode.

---

## Problem Frame

Deneb's AppSource certification renewal is blocked on a rendering-lifecycle finding. The snapshot/export service sends `update()` to every visual on a page and waits for each to report `renderingFinished` (or `renderingFailed`), or for a per-visual timeout (~10-12 seconds), before capturing the page for PDF/image export. Deneb does not honor this contract reliably:

- `renderingStarted` is emitted partway into the update (inside update-options resolution), so an error earlier in the update can produce a start with no matching close — or no start at all.
- The terminal `renderingFinished`/`renderingFailed` events are emitted from an asynchronous post-render callback. With rapid successive updates, that callback can fire against stale update options ("started for update A, finished for update B"), fire more than once, or not fire within the snapshot window — all of which break the 1:1 contract. The asynchrony itself is not the defect — the orphans, doubles, and timeouts around it are.
- Deneb proactively walks the segmented `fetchMoreData` chain on initial load to assemble large datasets for statistical/distribution specs. Each segment is its own `update()`, but the lifecycle was designed to close only once *all* segments arrived — so intermediate updates emit a start with no timely close, and large fetches can exceed the snapshot window entirely.
- Updates that perform no Vega render at all — a no-change skip, a fetch-more dispatch that returns to await the next segment, or a property persist that triggers a follow-up update — never reach the post-render callback, so their start is never closed.

The cost is concrete: certification is held, and reports that export Deneb visuals can capture partial or blank renders. The governing constraint is that each `update()` must be self-contained — start and close within the window — regardless of whether more data or another update is expected afterward.

---

## Actors

- A1. Report consumer (reader): views a published report in read/`View` mode. Interactions (filters, slicers, view transitions) trigger `update()` calls, but visual properties are not persisted — they are valid only for the duration the report is open and replay on each reopen.
- A2. Report author (editor): edits the report in `Edit`/`InFocusEdit` mode. Property persistence (including migration writes) is legitimate here because changes are saved back to the report.
- A3. Power BI snapshot/export service: issues `update()` to all visuals on a page, waits for each visual's terminal rendering event or a ~10-12s timeout, then captures the page for PDF/image output. Has no visibility into the visual's internal state beyond the lifecycle events.
- A4. Deneb visual instance: emits the rendering lifecycle, resolves the dataset (including optional segmented fetch), and renders the Vega/Vega-Lite output.

---

## Key Flows

- F1. Standard render lifecycle (update that paints Vega)
  - **Trigger:** Power BI calls `update()` with new or changed data/spec that will be rendered.
  - **Actors:** A3, A4
  - **Steps:** Visual signals `renderingStarted` at the very start of the update → resolves options, settings, and dataset → hands off to the Vega view → the asynchronous post-render callback signals `renderingFinished` after paint (or `renderingError` on a Vega failure), attributed to this specific update.
  - **Outcome:** Exactly one start and one terminal event are recorded for the update; the terminal event reflects actual paint completion.
  - **Covered by:** R1, R2, R3, R4, R6, R12

- F2. Non-rendering update lifecycle (skip / fetch-more / persist / recover)
  - **Trigger:** An `update()` resolves to a path that returns without producing a Vega render — no data change (skip), a fetch-more dispatch awaiting the next segment, a property persist that will trigger a follow-up update, or recovery from an interrupted fetch.
  - **Actors:** A3, A4
  - **Steps:** Visual signals `renderingStarted` at the start of the update → resolves the dataset action → on determining no Vega render will follow, signals the terminal event synchronously before the update path returns.
  - **Outcome:** The update closes 1:1 without waiting for a render that will never come; the post-render callback does not fire for this update.
  - **Covered by:** R2, R4, R5, R12

- F3. Segmented fetch-more lifecycle (multi-update)
  - **Trigger:** The data view advertises an additional `metadata.segment` and proactive fetch is enabled.
  - **Actors:** A3, A4
  - **Steps:** For each segment update, the visual signals `renderingStarted` → processes the segment → requests the next segment (or finalises) → for an intermediate segment, closes synchronously (F2); for the final segment that paints, closes via the post-render callback (F1).
  - **Outcome:** N segment updates produce N independent start/close pairs; no update is left open waiting for a later one.
  - **Covered by:** R2, R5, R8, R12

- F4. Property migration in read vs edit mode
  - **Trigger:** A report authored against an older Deneb version loads and its persisted properties need migrating.
  - **Actors:** A1, A2, A4
  - **Steps:** The visual detects a version/structure drift → if the report is being edited (A2), it persists migrated properties (a non-rendering update that closes synchronously per F2; the host replays the change as a subsequent, independently-closed update); if the report is in read mode (A1), persistence is suppressed and runtime-affecting migrations are applied in-memory so the read render honors them. Version-stamp-only migrations are skipped entirely in read mode (they only matter for cross-session drift detection).
  - **Outcome:** Editors get durable migrated properties; readers get a render that honors runtime-affecting migrations without persistence.
  - **Covered by:** R10

- F5. Snapshot/export capture and verification
  - **Trigger:** A reader or service requests a PDF/image export of a page containing a Deneb visual; or the maintainer tests export locally in Desktop.
  - **Actors:** A1, A3, A4
  - **Steps:** The service issues `update()` → waits for Deneb's terminal event or the timeout → captures whatever the visual has painted. During local testing, the dev overlay shows the running start-vs-close tally so the maintainer can confirm 1:1 without server-side debug access.
  - **Outcome:** The page is captured without hanging on Deneb; mismatches (orphans/doubles) are observable during testing.
  - **Covered by:** R6, R8, R13, R14

---

## Requirements

**Rendering lifecycle integrity**
- R1. `renderingStarted` is emitted exactly once, at the very start of every `update()`, before any work that could throw or return early.
- R2. Every `update()` emits exactly one terminal event — `renderingFinished` or `renderingFailed` — on every code path (skip, fetch-more, recover-interrupted-fetch, persist/migration-triggered, normal-finalise, and error).
- R3. No `update()` emits a terminal event more than once, and no `update()` emits both `renderingFinished` and `renderingFailed`.
- R4. Closing is hybrid by update outcome: an update that paints Vega closes via the asynchronous post-render callback (firing after paint, or `renderingError` on Vega failure); an update that returns without a Vega render closes synchronously within the update path. The async callback is retained — the injectable dependency design that wires it stays.
- R5. Every non-rendering dispatch path closes the lifecycle synchronously because no post-render callback will follow: the no-change skip path, each intermediate fetch-more segment update, the recover-interrupted-fetch path, and any update whose only effect is a property persist.
- R6. No update leaves the lifecycle open indefinitely. Non-rendering paths close immediately (synchronously); rendering paths close when Vega completes painting, which for in-window datasets is well within the snapshot service's ~10-12s window.
- R7. An error that occurs before or during update processing still produces a clean `renderingStarted` → `renderingFailed` pair, never an orphaned start and never a `renderingFinished`.
- R12. Exactly one closer fires per update. For any given update, either the async post-render callback closes it or the synchronous path closes it — never both, never neither. The mechanism must remain correct when updates coalesce (a later update arrives before an earlier update's render completes) and must prevent a stale post-render callback from closing the wrong update.

**Data fetch behavior**
- R8. The existing proactive segmented-fetch functionality and flow are retained; compliance is achieved by closing each intermediate segment update synchronously and the final painting segment via the post-render callback, not by removing or gating the feature.
- R9. The dataset row-window limit is raised from 10,000 to 30,000, reducing how often a fetch chain is needed for common statistical/distribution specs.

**Property migration**
- R10. When the report is in read/`View` mode, the visual does not perform property-migration persistence; migration is applied in memory for rendering only. Persistence occurs only when the report is being edited.

**Diagnostics & verification**
- R13. Lifecycle events are instrumented so each `update()` can be tallied against its terminal event — surfacing orphans (start with no close), doubles (more than one close), and which closer (async vs synchronous) fired. This is the primary evidence that the 1:1 contract holds, given export cannot be debugged server-side.
- R14. The start-vs-close tally is surfaced in the existing dev overlay (gated on `PBIVIZ_DEV_OVERLAY`) so it is visible while testing export/print from Power BI Desktop, where developer tools are unavailable.

**Refactor coordination**
- R11. The in-progress `resolveDataset` structural refactor proceeds, with each extracted non-rendering dispatch handler owning the synchronous terminal event for its path; the lifecycle work and the refactor are a single coordinated effort rather than sequential rewrites of the same method.

---

## Acceptance Examples

- AE1. **Covers R2, R5.** Given a data view whose contents are unchanged (the skip path), when `update()` runs, the visual emits exactly one `renderingFinished` synchronously, and the post-render callback does not fire for that update.
- AE2. **Covers R2, R5, R8.** Given a multi-segment dataset with proactive fetch enabled, when each intermediate segment's `update()` runs, each emits its own `renderingStarted` → synchronous `renderingFinished` pair; the final painting segment closes via the post-render callback. N segment updates produce N independent pairs and none is left open.
- AE3. **Covers R7.** Given an error thrown before dataset resolution completes, when `update()` runs, the visual emits `renderingStarted` then `renderingFailed`, with no `renderingFinished` and no orphaned start.
- AE4. **Covers R10.** Given the report is open in read/`View` mode and a spec requires migration, when `update()` runs, the visual does not call persistence APIs; runtime-affecting migrations (e.g., the pre-1.10 context-menu split) are applied in-memory so the read render honors them; version-stamp migrations are not applied in-memory (cross-session drift detection only). The lifecycle closes via the post-render callback.
- AE5. **Covers R5, R10.** Given the report is open in `Edit` mode and a spec requires migration, when `update()` runs, the visual persists the migrated properties and closes that (non-rendering) update synchronously; the host-issued follow-up `update()` closes its own lifecycle 1:1.
- AE6. **Covers R3, R12.** Given a rendering update that will close via the post-render callback, the synchronous path does not also close it; conversely, given a non-rendering update that closed synchronously, the post-render callback does not later fire a second terminal event for it.
- AE7. **Covers R12.** Given update B arrives before update A's Vega render has completed (coalesced updates), when the renders settle, exactly one terminal event is attributed to A and exactly one to B — no orphan, no double, and no terminal event attributed to the wrong update's options. A's terminal event in this scenario is `renderingFailed` with a synthetic "superseded" reason (not `renderingFinished`) so the host's snapshot service treats A as abandoned rather than as "page ready for capture" for a render that never painted.

---

## Success Criteria

- The next AppSource submission passes the Power BI rendering-event review — verifiable by timestamped lifecycle logs showing a 1:1 start/close per `update()` with no duplicates, no orphans, and closes within the window.
- During local Desktop export testing, the dev overlay shows a balanced start-vs-close tally (no orphans/doubles) across normal, fetch, migration, and rapid-update scenarios.
- Exporting a report page containing a Deneb visual produces a complete capture for datasets within the 30,000-row window, with no timeout-induced partial/blank renders.
- No regression in the four previously-fixed segmented-fetch viewer↔editor transition quirks.
- A downstream planner can fold per-path synchronous closing into the existing refactor plan without re-deriving the lifecycle contract from scratch.

---

## Scope Boundaries

- Converting proactive fetch-more to a user-interaction-only trigger — considered and rejected; the proactive flow is kept.
- Removing the segmented-fetch feature entirely — rejected.
- Removing the asynchronous post-render close in favor of an all-synchronous model — rejected; the async close is retained for rendering updates and the injectable dependency design stays.
- End-user-facing documentation (export limitations for over-window datasets, DAX/semantic-model aggregation guidance) — handled separately in the documentation repository by the maintainer.
- Changes to the `resolveDatasetUpdateAction` decision logic — only the side-effecting dispatch gains synchronous lifecycle calls; the pure decision function is unchanged.
- Building semantic-model/DAX aggregation capability inside the visual — out of Deneb's identity; aggregation belongs in the model.
- Guaranteeing the snapshot captures fully-painted Vega output — not controllable; the export captures whatever is painted at the service's capture time.
- Shipping the diagnostic tally to certified/production builds as a user-visible feature — the tally rides the existing `PBIVIZ_DEV_OVERLAY` dev gate and stays off in certified builds.

---

## Key Decisions

- Keep the asynchronous post-render close for rendering updates, and add synchronous closes only on the non-rendering paths. Rationale: the async callback fires after actual paint (the most accurate "finished" signal) and an async close is acceptable for certification provided the lifecycle is strictly 1:1; the real defects are orphans/doubles/timeouts, which are fixed by guaranteeing exactly-once closing and by closing the non-rendering paths that previously never reached the callback.
- Move `renderingStarted` to the literal start of `update()`. Rationale: guarantees that an error anywhere in processing still yields a clean started→failed pair, closing the orphaned-start gap.
- Retain the injectable rendering-callback dependency design. Rationale: confirmed acceptable; it keeps the React app decoupled from the host and supports testing.
- Instrument a per-update start-vs-close tally and surface it in the `PBIVIZ_DEV_OVERLAY` overlay. Rationale: export runs server-side with no debug access, so a visible tally is the only practical way to confirm 1:1 during Desktop print/export testing; the existing update-history overlay is the natural home.
- Gate migration persistence on the existing view/edit-mode resolution rather than reading `viewMode` raw at the migration call site. Rationale: the codebase already computes a single, transition-quirk-tested notion of edit vs read mode; reusing it avoids a second, divergent mode check.
- Keep proactive fetch and raise the window to 30,000 rather than removing the feature. Rationale: preserves the statistical/distribution use cases users depend on; the larger window means most datasets resolve in a single update (better export fidelity), and the residual export limitation is communicated via documentation.
- Treat the lifecycle work and the `resolveDataset` refactor as one effort. Rationale: extracting per-action handlers is the natural seam to attach each non-rendering path's synchronous close; doing them separately would refactor the same method twice.

---

## Dependencies / Assumptions

- Assumes an async-after-paint close remains acceptable for certification provided the lifecycle is strictly 1:1 with no orphans/doubles/timeouts.
- Assumes Power BI permits a `dataReductionAlgorithm` window count of 30,000 for this categorical mapping; the current value is 10,000. The platform cap must be confirmed (see Outstanding Questions).
- Export/snapshot behavior cannot be reliably reproduced or debugged locally (it runs server-side with no developer debug access); verification depends on timestamped event logging and the dev-overlay tally rather than interactive debugging.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R12][Technical] The exactly-once coordination mechanism is the central technical risk: how to deterministically classify an update as rendering vs non-rendering, attribute each post-render callback to the correct update, and prevent a stale or coalesced callback from closing the wrong update (or double-closing). Resolve during planning/implementation — likely via an update-identity token the post-render callback validates before closing.
- [Affects R9][Needs research] Does Power BI permit a window `count` of 30,000 for this categorical data-reduction mapping, or is there a platform cap below that? Verify against the current visuals API / capabilities limits during planning.
- [Affects R13, R14][Technical] What exactly the tally records (per-update event sequence, counts, mismatch flags) and how it extends the existing update-history overlay state. Resolve during planning.
- [Affects R6][Technical] Whether any current in-window (≤30,000-row) update path risks exceeding the ~10-12s window, and whether any processing should be chunked or deferred. Likely fine; confirm with timing logs during planning.
