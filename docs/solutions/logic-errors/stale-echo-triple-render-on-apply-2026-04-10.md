---
title: Stale Power BI echo causes triple render on editor Apply
date: 2026-04-10
category: logic-errors
module: state-synchronization
problem_type: logic_error
component: tooling
symptoms:
  - Visual jumps/flashes on first Apply per editor session
  - Three compile cycles per Apply (spec ping-pongs new/old/new)
  - MutationObserver shows three SVG teardown-rebuild cycles in ~300ms
root_cause: async_timing
resolution_type: code_fix
severity: medium
tags:
  - zustand
  - power-bi
  - state-sync
  - race-condition
  - bidirectional-sync
  - pending-persist
  - create-slice-sync
---

# Stale Power BI echo causes triple render on editor Apply

## Problem

When a user clicks Apply in the Deneb editor, the visual briefly jumps — rendering the correct state, then the old state, then the correct state again — before settling. This produces three full Vega compilation cycles instead of one. The final state is always correct, but the ~300ms flash is visible and disorienting. Only occurs on the first Apply per editor session.

## Symptoms

- Visual content draws, shifts, and redraws on the first Apply after opening the editor
- Browser console shows three `[compile-fire]` entries with `specLen` ping-ponging between two values
- `MutationObserver` on the preview area shows three complete SVG teardown-rebuild cycles
- Subsequent Applies in the same session render cleanly (single compile)

## What Didn't Work

- **Removing `defer: true` on `OverlayScrollbarsComponent`** — no effect on the triple render; the scrollbar component is downstream of compilation
- **Investigating SVG `display: inline` line-box gap** — this was a different 4px bug (fixed separately), not the triple render
- **Checking container unmount/remount** — DOM identity check confirmed the container element is stable across the jump; the SVG inside is re-embedded, not the container
- **Checking viewport dimension changes** — `viewportHeight`/`viewportWidth` identical across all three fires
- **Checking Monaco editor flush** — only one `setContent` call per Apply, confirmed by code search

## Solution

Added pending-persist tracking to `createSliceSync` in `src/lib/state/create-slice-sync.ts`. When app-core persists a value to Power BI, the value is recorded in a `Map<TSliceKey, { value, timestamp }>`. The Visual-to-App-Core subscriber checks this map before syncing:

- **Pending + visual matches pending** (`deepEqual`) — Power BI confirmed the persist. Clear the entry, skip sync (app-core already correct).
- **Pending + visual doesn't match** — stale echo. Skip sync for this key.
- **No pending** — normal behavior (external mutations from PBIR/format pane sync in).

Expired entries (older than `PENDING_PERSIST_TIMEOUT_MS` = 5000ms) are pruned at the start of each visual sync cycle as a safety net for silent persist failures.

Also renamed `isSyncingFromVisual` to `isApplyingInboundSync` (solves an orthogonal synchronous re-entry problem, not the async race), and replaced the fragile `onPersist` self-referencing double-persist pattern with an explicit `serializeForPersistence` callback.

Key files changed:
- `src/lib/state/sync-types.ts` — `PendingPersistEntry` type, `PENDING_PERSIST_TIMEOUT_MS` const, `serializeForPersistence` callback
- `src/lib/state/create-slice-sync.ts` — pending map, timeout pruning, `deepEqual` confirmation, flag rename
- `src/lib/state/project-sync-mappings.ts` — `supportFieldConfiguration` and `denebMetaVersion` use `serializeForPersistence`
- `src/lib/state/__test__/create-slice-sync.test.ts` — 21-test suite

## Why This Works

The root cause is an async timing race in the bidirectional state sync:

1. `setContent()` writes `newSpec` to app-core (optimistic)
2. App-Core-to-PBI subscriber persists `newSpec` to Power BI (async)
3. Before PBI confirms, a stale `update()` arrives with `oldSpec` (initialization-tied update on first Apply)
4. Visual-to-App-Core subscriber sees `oldSpec != newSpec`, syncs `oldSpec` back — **reverting the Apply**
5. PBI confirms `newSpec`, syncs it back — restoring the correct state
6. Result: three compile cycles (`newSpec` -> `oldSpec` -> `newSpec`)

The pending map breaks this at step 4: since `spec` has a pending entry, the stale `oldSpec` is recognized as a stale echo and skipped. App-core retains `newSpec` throughout, producing a single compile cycle.

`deepEqual` (from `fast-equals`) is used for the confirmation comparison because `shallowEqual` fails on nested objects after JSON round-trip (e.g., `supportFieldConfiguration` round-trips through `JSON.stringify`/`JSON.parse`, producing new object references with identical content).

## Prevention

- **Document the sync direction invariant:** After hydration, app-core state is the source of truth for `vega` and `stateManagement` properties. Any new sync mapping should respect this — inbound visual updates should not overwrite app-core values that have pending persists.
- **Test bidirectional sync paths:** The `createSliceSync` test suite covers the full lifecycle (persist, stale echo, confirmation, timeout). New mappings should be exercised through these paths.
- **Be aware of the `isApplyingInboundSync` / pending-persist distinction:** The flag prevents synchronous re-entry (reverse persistence during `getSyncFn` execution). The pending map prevents async stale echoes. Both are needed — they solve different races.

## Related Issues

- Investigation notes: `docs/superpowers/2026-04-09-editor-apply-triple-render-findings.md`
- Plan: `docs/plans/2026-04-10-001-fix-stale-echo-sync-plan.md`
- The bug was pre-existing but unmasked by the overlay scrollbars v2 work, which removed rendering quirks that previously hid the intermediate wrong frame
