---
status: ready-for-uat
title: U12 — Full lifecycle compliance verification checklist
created: 2026-06-10
related_plan: 2026-05-28-001-refactor-simplify-deneb-resolve-dataset-plan.md
units_verified: [U5, U6, U7, U8, U9, U10, U11]
---

# U12 — Lifecycle Compliance Verification Checklist

This is the manual sweep U12 calls for: every R-requirement and AE-acceptance-criterion from the plan, mapped to a concrete observable scenario in Power BI Desktop with the U11 tally as the observability surface.

Once every checkbox passes, the plan is **done** and the cert-blocking lifecycle work is complete.

---

## Prerequisites

```
.env:
  PBIVIZ_DEV_OVERLAY=true
  PBIVIZ_VIEWPORT_GATE_OVERLAY=false   # optional
  PBIVIZ_DEV_FORCE_READ_MODE=false     # toggle per scenario
  LOG_LEVEL=DEBUG                       # for the [lifecycle] log narrative
```

- Branch: `next` at or after the U6 merge commit
- Power BI Desktop, recent build
- A small + large test dataset (e.g., 5K rows + 50K rows; 25K rows for U6's single-window verification)
- A BETA-channel 1.9 `.pbix` fixture for the migration scenarios (per the cross-GUID property-isolation rule in `docs/solutions/best-practices/validate-migrations-on-matching-channel-builds-2026-06-03.md`)

---

## Phase 0 — Automated pre-sweep gate

Run before any manual scenarios. All must pass before the manual sweep starts.

- [ ] `npm run test` — full vitest. Expect 1365/1392 (27 pre-existing vega-react failures, see `next` for parity).
- [ ] `npm run eslint` — clean.
- [ ] `npm run prettier-check` — clean.
- [ ] `rm -rf .tmp/ && npm run webpack:build` — clean dev build from cold cache.
- [ ] `npm run package-beta` — produces a `.pbiviz` without errors.

---

## Phase 1 — Per-requirement verification

Each row maps a plan requirement to a tally signature and one or more scenarios. **Pass = the tally shows the expected counts and the recent-failures panel is empty (unless a scenario explicitly triggers a failure).**

### R1 — `renderingStarted` fires before any throwing work

Coordinator's `open()` is the first statement inside `update()`'s try.

- [ ] **Scenario:** edit the spec to invalid JSON to force a parse error. Console shows `[lifecycle] renderingStarted id=N` *before* `[lifecycle] renderingFailed id=N reason=<error> via=sync-current`.
- [ ] **Tally:** `opens` incremented; `fails.syncCurrent` incremented; **no orphan start**.

### R2 — Strict 1:1 started/finished pairs

The headline cert requirement. Every `opens` increment must be matched within the bound by a terminal (`closes.total + fails.total`).

- [ ] **Scenario:** cold load with working spec. After load settles, observe `opens === closes.total + fails.total` and `pending: 0`.
- [ ] **Tally signature:** `opens: 1`, `render-start: 1`, `closes.asyncPendingRender: 1`, `pending: 0`.

### R3 — Exactly-once terminal per id

No double-close, no double-fail.

- [ ] **Scenario:** rapid property-pane toggles (10+ in 2 seconds). Tally: many `opens`; `closes.total + fails.total === opens`; no impossible inflation in any per-via counter.
- [ ] **Pending column oscillates** between 0 and 1 — never sticks above 1.

### R4 — Bind-pending-render at every render branch

`coordinator.bindPendingRenderCurrent()` is called at the end of `handleNormalFinalise` AND `handleFetchMore`'s host-decline branch.

- [ ] **Scenario A** (normal-finalise render path): change the spec to swap a chart type. Tally: `closes.asyncPendingRender` increments by 1.
- [ ] **Scenario B** (fetch-more host-decline): bind a >30K row dataset; when the chain finalises with the segments collected so far, the final close is `async-pending-render` (not `safety-net`).

### R5 — Edit-mode migration persists and closes synchronously

- [ ] **Scenario:** open a BETA 1.9 pbix in BETA 2.0 Desktop with `PBIVIZ_DEV_FORCE_READ_MODE=false`. Tally:
  - First update: `opens: 1`, then triggers `persistProperties` for migration → host queues a follow-up update.
  - Second update (host echo): `opens: 2`, `closes.syncCurrent: 1` (the skip path U8 close).
- [ ] **No safety-net fires.**

### R6 — Coalesced supersede emits `renderingFailed`, not `renderingFinished`

The cert-correct supersede behaviour from U7.

- [ ] **Scenario:** drag the visual's resize handle aggressively to coalesce updates. Tally: `fails.superseded` counter increments multiple times during the storm.
- [ ] **Console log:** `[lifecycle] renderingFailed id=N reason=superseded via=superseded` for each superseded id.

### R7 — Errors yield a clean started→failed pair

- [ ] **Scenario A** (synchronous catch): wrap a setting change in something that throws inside `update()`. Tally: `fails.syncCurrent` increments.
- [ ] **Scenario B** (Vega render error): edit spec to a syntactically valid but semantically broken Vega spec. Tally: `fails.asyncPendingRender` increments. Recent-failures panel shows the message.
- [ ] In both cases, **no `renderingFinished` is emitted for the failed id** (no inflation of `closes.total`).

### R8 — Segmented fetch retained; each segment closes 1:1

- [ ] **Scenario:** bind a 50K-row dataset. Tally:
  - Multiple `opens` (one per segment update).
  - All intermediate segments close `via=sync-current` (U8's fetch-more success close).
  - Final painting segment closes `via=async-pending-render`.
- [ ] **No orphans, no safety-net fires.**

### R9 — Row-window 10K → 30K

- [ ] **Scenario:** bind a 25K-row dataset. Tally:
  - `opens: 1` (single update, no segmented chain).
  - `closes.asyncPendingRender: 1`.
- [ ] **Console log:** no `Attempting to fetch more data...` line — the entire dataset arrived in one window.

### R10 — No property-migration persistence in read mode

- [ ] **Scenario:** set `PBIVIZ_DEV_FORCE_READ_MODE=true`. Open a BETA 1.9 pbix. Console shows `[read-mode-gate] persistence suppression set to true for the current update`. Tally: `opens: 1`, `closes.asyncPendingRender: 1` (or `safety-net` if Vega doesn't re-embed — see U10 settle path).
- [ ] **No `persistProperties` calls** observable in console.
- [ ] **Migrated values are applied in-memory** — verify by inspecting context-menu state after right-click.

### R12 — Every update closes exactly 1:1

The umbrella requirement. Verified by Phase 1's collective tally observations.

- [ ] **Sustained session:** open the visual, interact with it normally for 5 minutes (changes, resizes, filters). At the end, `opens === closes.total + fails.total` exactly.
- [ ] **Pending count returns to 0** during idle moments — sustained `pending > 1` indicates an undiagnosed orphan path.

### R13 / R14 — Dev-overlay tally available

- [ ] **Scenario:** with `PBIVIZ_DEV_OVERLAY=true`, the lifecycle + history overlay appears top-left; the tally updates live across all scenarios above. Minimize/restore works. History section can be expanded for forensic detail.

---

## Phase 2 — Acceptance-criterion verification

Concrete scenarios tied to specific AEs from the plan.

### AE1 — Skip path: exactly one sync `renderingFinished`

- [ ] **Scenario:** change a property that doesn't affect the dataView (e.g., a Deneb-only `logLevel` toggle while spec/data are stable). Tally: `closes.syncCurrent` increments. **No `async-pending-render` increment** for this update.

### AE2 — Each fetch-more segment closes via its own pair

- [ ] **Verified by R8 scenario above.**

### AE3 — Error path: started → failed, no orphan, no finished

- [ ] **Verified by R7's Vega render error scenario above.**

### AE4 — Read-mode migration: no persist, in-memory remap, lifecycle closes

- [ ] **Verified by R10 scenario above.** Additionally, verify right-click on the visual produces the expected context menu (the in-memory remap fixed the pre-1.10 `enableContextMenu: false` to `true`).

### AE5 — Edit-mode migration: persist + synchronous close

- [ ] **Verified by R5 scenario above.**

### AE6 — `closeCurrent` twice → second ignored (exactly-once guard)

Already pinned at the unit-test level in 32 coordinator tests. Additionally:

- [ ] **Scenario:** rapid update storm. Tally shows balanced `opens === closes.total + fails.total` even when individual updates fire close paths concurrently (race-resistant by the coordinator's internal exactly-once guard).

### AE7 — Coalesced updates: one terminal per id, supersede emits failed

- [ ] **Verified by R6 scenario above.** Additionally, the resize storm should NOT produce inflated `closes.asyncPendingRender` counts (each supersede counts as a `fail`, not a `close`).

---

## Phase 3 — Segmented-fetch four-quirk regression

The four scenarios the U7-U10 chain was explicitly designed to preserve. From `docs/solutions/logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md`.

### Quirk 1 — Cross-filter mid-fetch

- [ ] **Scenario:** bind a 50K dataset to Deneb. Start fetch. Before completion, click a data point in another visual to apply a cross-filter. Tally:
  - Multiple `opens`.
  - The interrupting update closes `via=sync-current` (recover handler).
  - No safety-net fires.
- [ ] Dataset eventually shows the filtered subset.

### Quirk 2 — Viewer↔editor transition mid-fetch

- [ ] **Scenario:** bind a 50K dataset. Click "Edit" while still fetching. Tally: recover handler fires; `closes.syncCurrent` increments for the interrupting update.
- [ ] Dataset slice preserved (Math.max `rowsLoaded` — verify no row-count regression by checking the visual's count display if any).

### Quirk 3 — Reduced-restart payload preservation

- [ ] **Scenario:** within Quirk 2's setup, observe that the visual doesn't blank out into a "0 rows" state after the transition — the previously-loaded data slice is preserved.

### Quirk 4 — Initial-segment-while-fetching detection

- [ ] **Scenario:** bind 50K dataset; let it complete one or two segments; switch to a different page in the report; switch back. Tally: recover handler fires; `closes.syncCurrent` increments.

---

## Phase 4 — Export / print-to-PDF correctness

The end-state cert deliverable. Snapshot service relies on accurate `renderingFinished` to capture visual state.

- [ ] **Scenario A** (small dataset): print a report page containing a Deneb visual with a ≤5K row dataset to PDF. The visual renders completely in the PDF (no blank canvas, no truncation).
- [ ] **Scenario B** (large dataset): repeat with a ~25K row dataset (single-window now, post-U6). The visual renders completely.
- [ ] **Scenario C** (segmented fetch): repeat with a 50K row dataset. The visual renders completely after the fetch chain completes — no partial captures, no timeouts.
- [ ] **Scenario D** (multiple visuals): print a page containing 3+ Deneb visuals with different specs. All capture completely.

---

## Phase 5 — CodeScene re-scan

The CodeScene flag on `resolveDataset` was a contributing motivation for the plan.

- [ ] **Open CodeScene** (or the relevant complexity-analysis tool) and re-scan `src/index.ts`.
- [ ] **Verify:** `resolveDataset` no longer flags as a high-complexity hotspot, OR the residual complexity is the irreducible dispatcher shape (action.kind switch + handler dispatch + exhaustive `never` default).
- [ ] Note the before/after complexity score in this checklist's commit message when closing out.

---

## Phase 6 — Wrap-up

Once every checkbox above passes:

- [ ] Update the plan document (`2026-05-28-001-refactor-simplify-deneb-resolve-dataset-plan.md`) frontmatter: `status: active` → `status: completed`.
- [ ] Append a "Verified" note to the plan body with a link to this checklist's commit SHA.
- [ ] Update this checklist's frontmatter: `status: ready-for-uat` → `status: passed` (or `failed` with notes if scenarios broke).
- [ ] Consider a `docs/solutions/` learning capture for any non-obvious behaviours observed during UAT.

---

## What "pass" looks like in one sentence

Every update during normal interactive use produces exactly one host terminal with the correct attribution (`sync-current`, `async-pending-render`, or `safety-net` for true orphans only); the tally's `pending` count never sustains above 1; the recent-failures panel surfaces meaningful error context for any deliberate error scenario; export captures complete without truncation.

## If a scenario fails

1. Capture the tally state at the moment of failure (screenshot the overlay).
2. Capture the console log lines around the failure (`[lifecycle]` and `[read-mode-gate]` prefixes).
3. Note which scenario failed and what was observed vs expected.
4. File as a follow-up issue with the U-unit suspected. The U11 tally's `via` discriminator usually points at the failing closer.
