---
title: "fix: Suppress stale Power BI echoes in createSliceSync"
type: fix
status: completed
date: 2026-04-10
---

# fix: Suppress stale Power BI echoes in createSliceSync

## Overview

Add pending-persist tracking to `createSliceSync` so that stale Power BI visual updates arriving between an app-core persist call and its confirmation are suppressed. This fixes the editor Apply triple-render bug (spec ping-pongs `new → old → new`, causing a visible UI jump) and hardens all four synced slices against the same race condition. Also cleans up the fragile `onPersist` double-persist pattern for serialized properties.

## Problem Frame

When a user clicks Apply in the Deneb editor, `setContent()` writes the new spec to app-core state, which triggers an async persist to Power BI. Before Power BI confirms, a stale `update()` call arrives carrying the old spec. The Visual → App-Core subscriber in `createSliceSync` sees the old value differs from the new one and syncs it back — reverting the Apply. Power BI then confirms the persist and syncs the correct value back. Result: three compilation cycles instead of one, with a visible visual jump on the first Apply per editor session.

The root cause is that `createSliceSync`'s Visual → App-Core subscriber cannot distinguish "stale echo from Power BI" from "legitimate external change" after hydration.

Investigation details: `docs/superpowers/2026-04-09-editor-apply-triple-render-findings.md`

## Requirements Trace

### Stale-Echo Suppression
- R1. After hydration, app-core state is the source of truth for `vega` and `stateManagement` properties — stale Power BI echoes must not revert app-core changes
- R2. External mutations (PBIR, format pane) must still sync into app-core when no app-core-initiated persist is pending. Note: external mutations arriving *during* a pending window are suppressed as an accepted trade-off (see Risks).
- R3. All four synced slices (project, editorPreferences, visualRender, compilation) must be protected by the same mechanism
- R4. A safety timeout must clear pending entries if Power BI never confirms a persist

### Code Quality (opportunistic cleanup, not required by the fix)
- R5. The `onPersist` double-persist pattern for serialized properties should be replaced with an explicit serialization callback — user-directed cleanup bundled with this fix
- R6. The existing `isSyncingFromVisual` flag must be preserved (solves an orthogonal problem) and renamed for clarity

### Testing
- R7. 90%+ test coverage on new and modified code

## Scope Boundaries

- **In scope:** `create-slice-sync.ts`, `sync-types.ts`, `project-sync-mappings.ts`, new test file
- **NOT in scope:** Slice definitions, persistence layer (`persistProjectProperties`), mapping definitions beyond the `onPersist` cleanup, viewport sync (`subscribeEmbedViewport` — unidirectional, not affected), PBIR concurrent-edit conflict resolution, compilation debouncing
- **Explicitly unchanged:** All slice sync functions (`syncProjectData`, `syncPreferences`, etc.), the `SyncableSlice` type, hydration lifecycle, `subscribeDataset`, `subscribeEmbedViewport`

## Context & Research

### Relevant Code and Patterns

- `src/lib/state/create-slice-sync.ts` — the bidirectional sync factory (139 lines, the core file to modify)
- `src/lib/state/sync-types.ts` — `SliceSyncMapping` and `SliceSyncConfig` types
- `src/lib/state/sync.ts` — instantiation of all 4 slice sync subscriptions
- `src/lib/state/project-sync-mappings.ts` — 11 project mappings, including `supportFieldConfiguration` and `denebMetaVersion` with `onPersist` dual-write pattern
- `fast-equals` 5.3 — already a dependency; `shallowEqual` used throughout, `deepEqual` exported but not currently used
- Root vitest config: `vitest.root.config.ts` with include pattern `src/**/__test__/**/*.test.ts` (jsdom env)
- Existing root tests: `src/lib/persistence/__test__/project.test.ts`, `src/lib/dataset/__test__/` — BDD-style `describe`/`it` with fixture helpers

### Institutional Learnings

- The triple-render bug is pre-existing, unmasked by the overlay scrollbars v2 work which eliminated rendering quirks that previously hid the intermediate wrong frame
- `supportFieldConfiguration` round-trips through JSON serialization — `shallowEqual` always returns false for these nested objects due to reference inequality after `JSON.parse`
- The `isSyncingFromVisual` flag is synchronous-only — it protects against re-entry during `getSyncFn()` but not against the async Power BI persist round-trip

## Key Technical Decisions

- **Pending-persist Map (not Set):** `Map<TSliceKey, { value: unknown, timestamp: number }>` stores both the pending value (functionally required for `deepEqual` confirmation — the core mechanism distinguishing stale echoes from confirmed persists) and a timestamp (required for timeout pruning). A Set would lack the stored value needed for confirmation.
- **`deepEqual` for confirmation:** `shallowEqual` fails on nested objects after JSON round-trip (new references). `deepEqual` from `fast-equals` (already available, zero new dependencies) correctly confirms pending persists for all value types including `supportFieldConfiguration`.
- **Timestamp pruning (not setTimeout):** On each visual sync cycle, prune pending entries older than `PENDING_PERSIST_TIMEOUT_MS`. No async cleanup to manage, no cancellation on confirmation, no cleanup on unsubscribe beyond the natural teardown.
- **Keep + rename flag:** `isSyncingFromVisual` → `isApplyingInboundSync`. It prevents reverse-persistence during inbound sync (a different race than stale echoes). The two mechanisms are complementary, not redundant.
- **`serializeForPersistence` callback:** Replaces the fragile `onPersist` self-referencing pattern where `supportFieldConfiguration` and `denebMetaVersion` push a replacement `PropertyChange` with the same objectName/propertyName. The new callback transforms the value before the primary change is created — one entry per property, explicit intent.

## Open Questions

### Resolved During Planning

- **Q: Which equality function for pending confirmation?** → `deepEqual` from `fast-equals` (handles nested objects after JSON round-trip)
- **Q: Timeout implementation?** → Timestamp pruning in the visual sync subscriber (not setTimeout per entry)
- **Q: Keep or remove `isSyncingFromVisual`?** → Keep and rename; it solves an orthogonal synchronous re-entry problem
- **Q: Map or Set for tracking?** → Map with `{ value, timestamp }` for debug logging and deepEqual confirmation

### Deferred to Implementation

- **Exact mock structure for Zustand stores in tests:** Will be determined when setting up test fixtures; the stores need `subscribe` and `getState` mocks
- **Whether `vitest.root.config.ts` needs any adjustment for the new test directory:** Likely not (pattern `src/**/__test__/**/*.test.ts` should match), but verify during test setup

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Pending Entry Lifecycle

```
                    ┌─────────────┐
        ┌───────────┤  No Pending │◄─────────────────────────┐
        │           └─────────────┘                           │
        │  App-Core → PBI                                     │
        │  persist fires                                      │
        ▼                                                     │
  ┌───────────┐                                               │
  │  Pending  │──── visual matches pending (deepEqual) ───────┘
  │ {val, ts} │         → Confirmed, clear entry         clear entry
  │           │                                               │
  │           │──── visual ≠ pending ──── Stale Echo ─────────┘
  │           │         → Skip sync     (stays pending)  on timeout
  │           │
  │           │──── timestamp > TIMEOUT ──────────────────────┘
  │           │         → Expired, clear entry
  └───────────┘
```

### Fix Applied to the Triple-Render Scenario

```
User clicks Apply
  │
  ├─ setContent() writes newSpec to app-core
  ├─ App-Core → PBI subscriber fires
  │   ├─ Detects spec changed (shallowEqual)
  │   ├─ pendingPersists.set('spec', { value: newSpec, timestamp: now })
  │   ├─ Applies serializeForPersistence if present
  │   └─ persistProjectProperties(changes)
  │
  ├─ [Stale Power BI update arrives with oldSpec]
  │   ├─ Visual → App-Core subscriber fires
  │   ├─ pendingPersists.has('spec') → yes
  │   ├─ Prune expired entries (none expired yet)
  │   ├─ deepEqual(oldSpec, pending.value=newSpec) → false
  │   └─ SKIP sync for 'spec' (stale echo)
  │
  └─ [Power BI confirms with newSpec]
      ├─ Visual → App-Core subscriber fires
      ├─ pendingPersists.has('spec') → yes
      ├─ deepEqual(newSpec, pending.value=newSpec) → true
      └─ CLEAR pending entry, skip sync (app-core already correct)

Result: 1 compile fire instead of 3
```

### Persistence Code Path with serializeForPersistence

```
For each mapping with persistence:
  │
  ├─ Get appCoreValue from slice
  ├─ Get visualValue from settings
  ├─ shallowEqual(appCoreValue, visualValue)?
  │   ├─ yes → skip
  │   └─ no ↓
  │
  ├─ Determine persistValue:
  │   ├─ mapping.serializeForPersistence exists? → persistValue = serialize(appCoreValue)
  │   └─ otherwise → persistValue = appCoreValue
  │
  ├─ Push PropertyChange { objectName, propertyName, value: persistValue }
  ├─ Record pending: pendingPersists.set(sliceKey, { value: appCoreValue, ts })
  │   (Note: pending stores app-core value, not serialized value —
  │    confirmation compares against getVisualValue output which is deserialized)
  │
  └─ If mapping.onPersist exists → push side-effect changes (e.g., provider → selectionMode)
```

## Implementation Units

- [x] **Unit 1: Extend sync types and add constants**

**Goal:** Add the type infrastructure needed by subsequent units.

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `src/lib/state/sync-types.ts`

**Approach:**
- Add optional `serializeForPersistence` callback to `SliceSyncMapping` — takes the app-core value and returns the serialized form for Power BI storage. This replaces the self-referencing `onPersist` pattern.
- Add `PendingPersistEntry` type: `{ value: unknown; timestamp: number }`
- Add exported const `PENDING_PERSIST_TIMEOUT_MS` (5000ms) with a doc comment explaining its purpose

**Patterns to follow:**
- Existing optional callback pattern in `SliceSyncMapping` (see `onPersist` and `persistence`)
- Type-only exports use `export type`

**Test expectation:** none — pure type definitions and a constant with no behavioral logic

**Verification:**
- TypeScript compiles without errors
- Existing sync code continues to work unchanged (new fields are optional)

---

- [x] **Unit 2: Add pending-persist tracking and rename flag**

**Goal:** The core fix — suppress stale Power BI echoes in the Visual → App-Core subscriber, record pending persists in the App-Core → Power BI subscriber, rename `isSyncingFromVisual` for clarity.

**Requirements:** R1, R2, R3, R4, R6

**Dependencies:** Unit 1 (types and const)

**Files:**
- Modify: `src/lib/state/create-slice-sync.ts`

**Approach:**

*Visual → App-Core subscriber changes:*
- Before iterating mappings, prune pending entries where `Date.now() - entry.timestamp > PENDING_PERSIST_TIMEOUT_MS`
- For each mapping, before the normal `shallowEqual` check: if `pendingPersists.has(sliceKey)`, use `deepEqual` to compare `visualValue` against `entry.value`. If equal → confirmed, delete entry, skip this key. If not equal → stale echo, skip this key. Log both cases via `logDebug`.
- If no pending → fall through to existing logic (first hydration syncs all, post-hydration syncs changed values)

*App-Core → Power BI subscriber changes:*
- When a mapping has a `persistence` entry and the value has changed: first determine the `PropertyChange` value (apply `serializeForPersistence` if present, otherwise use raw `appCoreValue`), then push the change, then record the pending entry. **The pending entry always stores the raw `appCoreValue`** (not the serialized form) because confirmation compares against `getVisualValue` output, which is the deserialized value.
- If `mapping.serializeForPersistence` exists, use it to transform `appCoreValue` into the `PropertyChange` value (instead of raw `appCoreValue`). This replaces the primary entry's value — only one `PropertyChange` per mapping is pushed. During the Unit 2→3 transition, production mappings still use `onPersist` for self-referencing serialization (which continues to work via last-write-wins ordering in `persistProjectProperties`). Unit 3 migrates these to `serializeForPersistence`.
- `onPersist` side-effects continue to work as before for genuine cross-property effects (e.g., `provider` → `selectionMode`). `serializeForPersistence` and `onPersist` are not mutually exclusive — `serializeForPersistence` controls the primary value, `onPersist` adds additional cross-property changes.

*Flag rename:*
- `isSyncingFromVisual` → `isApplyingInboundSync`
- Update the comment to accurately describe that it applies to all inbound syncs, not just initial hydration

*Cleanup:*
- Add `pendingPersists.clear()` to the returned cleanup function

**Patterns to follow:**
- Existing `logDebug('[StoreSynchronization:${name}]')` convention for all new log messages
- `deepEqual` import from `fast-equals` alongside existing `shallowEqual`

**Test scenarios:**

Visual → App-Core direction:
- Happy path: after hydration with no pending entries, visual value change syncs to app-core normally
- Happy path: first hydration syncs all values regardless of equality (existing behavior preserved)
- Edge case: pending exists + visual matches pending value (deepEqual) → pending cleared, sync skipped for that key
- Edge case: pending exists + visual does not match pending → stale echo, sync skipped for that key
- Edge case: pending entry older than timeout → pruned before checking, normal sync resumes
- Edge case: multiple pending entries, some expired some not → only expired ones pruned
- Edge case: skipped when `hasInitialSettingsLoaded` is false (existing behavior preserved)
- Edge case: empty payload after pending filtering → no sync function called

App-Core → Power BI direction:
- Happy path: changed value persisted and pending entry recorded with correct value and timestamp
- Happy path: `serializeForPersistence` used when present on mapping, raw value used otherwise
- Edge case: read-only mapping (no `persistence`) does not create a pending entry and syncs normally via Visual → App-Core
- Edge case: skip when slice reference unchanged (existing behavior preserved)
- Edge case: skip when `isApplyingInboundSync` is true (existing behavior preserved)
- Edge case: skip when not hydrated (existing behavior preserved)
- Edge case: `onPersist` cross-property side-effects still appended (test with a `provider`-like mapping that produces changes for a different key, not self-referencing `onPersist` which is removed in Unit 3)
- Edge case: no changes detected → no persist call, no pending entries recorded

Integration:
- Integration: full Apply cycle — persist fires, stale echo suppressed, confirmation clears pending, single sync
- Integration: rapid double-persist — second pending overwrites first, both stale echoes blocked, latest value confirmed
- Integration: cleanup function clears pending map and unsubscribes all listeners

**Verification:**
- All 19 test scenarios pass
- TypeScript compiles without errors
- Manual verification: instrument the compile effect in `visual-viewer.tsx` with a console.log, click Apply → observe 1 `[compile-fire]` entry instead of 3

---

- [x] **Unit 3: Replace onPersist double-persist with serializeForPersistence**

**Goal:** Clean up the fragile pattern where `supportFieldConfiguration` and `denebMetaVersion` mappings push a replacement `PropertyChange` with the same objectName/propertyName via `onPersist`.

**Requirements:** R5

**Dependencies:** Unit 2 (create-slice-sync.ts now reads `serializeForPersistence`)

**Files:**
- Modify: `src/lib/state/project-sync-mappings.ts`

**Approach:**
- `supportFieldConfiguration` mapping: remove the self-referencing `onPersist` callback, add `serializeForPersistence: (value) => JSON.stringify(value)`
- `denebMetaVersion` mapping: remove the self-referencing `onPersist` callback, add `serializeForPersistence: (value) => String(value)`
- `provider` mapping's `onPersist` is unchanged — it produces a genuine cross-property side-effect (resetting `selectionMode`), not a self-referencing replacement

**Patterns to follow:**
- Existing mapping structure in `project-sync-mappings.ts`
- The `provider` mapping's `onPersist` as the reference for legitimate side-effect usage

**Test scenarios:**
- Happy path: `supportFieldConfiguration` persists as JSON string (not raw object) via `serializeForPersistence`
- Happy path: `denebMetaVersion` persists as string (not number) via `serializeForPersistence`
- Happy path: `provider` mapping's `onPersist` side-effect (selectionMode reset) still works
- Edge case: mapping without `serializeForPersistence` persists raw value (regression check)
- Integration: `supportFieldConfiguration` round-trip — persist serialized value, simulate Visual echo with `JSON.parse`'d value, verify `deepEqual` confirms the pending entry (validates the JSON round-trip assumption for nested objects)

**Verification:**
- Existing tests continue to pass
- `provider` → `vegaLite` switch still resets `selectionMode` to `'simple'`
- `supportFieldConfiguration` round-trips correctly through Power BI persistence

---

- [x] **Unit 4: Test suite for createSliceSync**

**Goal:** Comprehensive test coverage for the bidirectional sync factory, covering both existing behavior and all new pending-persist paths.

**Requirements:** R7

**Dependencies:** Units 1, 2, 3

**Files:**
- Create: `src/lib/state/__test__/create-slice-sync.test.ts`

**Approach:**
- Mock `@deneb-viz/app-core` (`getDenebState`, `useDenebState`), `../../state` (`useDenebVisualState`), `../persistence` (`persistProjectProperties`), and `@deneb-viz/utils/logging` (`logDebug`)
- Create mock Zustand stores with `subscribe` that captures the subscriber function for manual invocation, and `getState` that returns configurable state
- Define minimal test mappings (2-3 simple scalar mappings + 1 mapping with `serializeForPersistence` + 1 read-only mapping without `persistence`)
- Organize tests into three describe blocks: Visual → App-Core, App-Core → Power BI, and Integration scenarios
- Use `vi.useFakeTimers()` for timeout-related tests (`Date.now()` control)

**Patterns to follow:**
- BDD-style `describe`/`it` from existing root tests (`src/lib/persistence/__test__/project.test.ts`)
- Fixture helpers as typed constants at top of file
- Import from `vitest`: `describe`, `expect`, `it`, `vi`, `beforeEach`, `afterEach`

**Test scenarios:**
All 19 scenarios from Unit 2's test scenarios list, plus the 4 scenarios from Unit 3's serialization tests. Total: ~23 test cases organized across 3 describe blocks.

**Verification:**
- `npm run test:root` passes
- Coverage report shows 90%+ on `create-slice-sync.ts`

## System-Wide Impact

- **Interaction graph:** `createSliceSync` is consumed by 4 slice sync instances in `sync.ts`. The pending-persist mechanism is internal to the factory closure — no changes to the slice sync configs or the slices themselves.
- **Error propagation:** A stuck pending entry (persist never confirmed) is cleared by timeout after 5s. `logDebug` messages provide observability. No user-facing error states.
- **State lifecycle risks:** The pending map is per-`createSliceSync` instance, scoped to the closure. Cleanup on unsubscribe clears it. No cross-slice state, no global mutable state.
- **API surface parity:** No public API changes. `SliceSyncMapping` gains an optional field (`serializeForPersistence`), which is additive and backwards-compatible.
- **Integration coverage:** The test suite includes integration scenarios (full Apply cycle, rapid double-Apply) that exercise the subscriber interaction — not just individual functions.
- **Unchanged invariants:** `subscribeDataset`, `subscribeEmbedViewport`, all slice definitions, all sync functions (`syncProjectData`, etc.), the persistence layer (`persistProjectProperties`), and the `SyncableSlice` type are explicitly unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `deepEqual` performance on large `supportFieldConfiguration` objects | Max ~50 fields in practice. `deepEqual` from `fast-equals` is optimized for common cases. Negligible overhead. |
| Timeout too short (Power BI occasionally takes >5s to process persist) | `PENDING_PERSIST_TIMEOUT_MS` is an exported const, easy to tune. If expired, stale echo may briefly appear but self-corrects on next update. |
| External mutation during pending window is blocked | Acceptable trade-off — true concurrent edits (PBIR while editor Apply is in-flight) are a conflict scenario. The persist will overwrite the external change. |
| Mocking Zustand stores in tests may be brittle | Use minimal mock stores with explicit `subscribe`/`getState` contracts rather than deep framework mocks. |

## Sources & References

- Investigation: `docs/superpowers/2026-04-09-editor-apply-triple-render-findings.md`
- Core sync code: `src/lib/state/create-slice-sync.ts`
- Sync types: `src/lib/state/sync-types.ts`
- Project mappings: `src/lib/state/project-sync-mappings.ts`
- Sync instantiation: `src/lib/state/sync.ts`
- Root test config: `vitest.root.config.ts`
- Existing test patterns: `src/lib/persistence/__test__/project.test.ts`, `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan.test.ts`
