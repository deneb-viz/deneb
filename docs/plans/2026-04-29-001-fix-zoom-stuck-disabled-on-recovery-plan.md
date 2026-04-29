---
title: "fix: compilation-gated commands stuck disabled after parse-error click"
type: fix
status: completed
date: 2026-04-29
---

# fix: compilation-gated commands stuck disabled after parse-error click

## Overview

Two commands gated on `isCompilationReady` — the zoom controls (`zoomIn`, `zoomOut`, `zoomFit`, `zoomReset`) and the spec exporter (`exportSpecification`) — can become persistently disabled after a Vega parse-error state. The trigger differs per command (a zoom click for zoom; an editor keystroke for export), but the structural cause is identical: state-management actions that fire *during* the error path write `false` into the `commands` slice, and nothing on the recovery path re-evaluates them. The deadlock can only be cleared by a full visual reload.

This plan extracts two pure helpers — `evaluateZoomCommandsState` and `evaluateExportSpecCommandState` — and calls them from both the existing writer sites *and* `handleCompile`'s success branch (gated on `result.status === 'ready'`), so recovery from any error path automatically restores the correct enabled flags.

## Problem Frame

**Reproducible flow (zoom):**

1. User triggers a Vega parse error. `state.compilation.result?.status !== 'ready'`.
2. Zoom controls remain visually clickable because the `commands` slice initial values are all `true` and nothing has rewritten them yet.
3. User clicks a zoom control. `handleZoomIn`/etc. → `executeCommand` reads the slice (sees `true`) → `updateEditorZoomLevel(level)` → [`handleUpdateEditorZoomLevel`](packages/app-core/src/state/editor.ts) reads the *current* `state.compilation.result` (in error state) and writes the four zoom command enabled flags as `false` into `commands`.
4. User fixes the spec and recompiles. [`handleCompile`](packages/app-core/src/state/compilation.ts) sets `state.compilation.result` to `{ status: 'ready', ... }`. Visual / data / signals restore. **`handleCompile` does not touch the `commands` slice.** The only re-eval path is `updateEditorZoomLevel`, which the user can't trigger because zoom is disabled. Deadlock.

**Reproducible flow (`exportSpecification`):**

The same shape, with a different trigger. `handleUpdateEditorContent` and `handleUpdateIsDirty` write `exportSpecification` based on `isExportSpecCommandEnabled({ editorIsDirty, compilationResult })`. While in an error state, an editor keystroke writes `false`. Recovery doesn't re-evaluate. The deadlock window is narrower (the next keystroke after recovery would re-evaluate) but the structural gap is identical. The user-reported reproduction was for zoom only; `exportSpecification` was surfaced during plan review and brought into scope.

This is the same shape as the [`lifecycle-owns-effect-rebind-identity-token-2026-04-28`](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) learning, applied to the `commands` slice: the lifecycle hook that recovers the resource (`handleCompile` reaching `ready`) must own the unwrite of any state set during the error path.

## Requirements Trace

- **R1.** After a parse error → zoom click → spec fix → recompile cycle, zoom controls are re-enabled without requiring a visual reload.
- **R2.** After a parse error → editor keystroke → spec fix → recompile cycle, `exportSpecification` is re-enabled without requiring a visual reload.
- **R3.** Existing behaviour preserved: compilation-gated commands remain correctly disabled while compilation is not `ready`. The existing writers (zoom-level, content, dirty handlers) continue to evaluate the same way they do today.
- **R4.** Regression tests guard the recovery path so future changes can't silently revert it.

## Scope Boundaries

- **No refactor of the `commands` slice into derived selectors.** The slice is the contract for ALL commands; singling out a subset as derived would break the symmetry.
- **No changes to `handleLogError`'s state writes.** Runtime errors arrive on the existing Vega view; `runtimeErrors` accumulation already covers them.
- **`handleCompile` writes compilation-gated commands on BOTH branches** (success and error). Both helpers handle the not-ready case correctly (returning `false` for gated commands), so the symmetric write disables zoom on error compile and re-enables on recovery — parity with how `exportSpecification` already disables via continuous editor-edit writes. (An earlier draft of this plan scoped out the error-branch write; manual testing showed that left zoom controls looking enabled in known-bad states until the user clicked them, because zoom has no editor-edit cadence to self-correct against. The symmetric write closes that gap.)
- **No audit-and-fix of every command potentially gated on `isCompilationReady`** — focus on zoom (user-reported reproduction) and `exportSpecification` (structurally identical, surfaced during review). A note in System-Wide Impact flags the broader audit as a follow-up if more cases surface.
- **No change to the visual reload behaviour.** Today, a full reload clears the slice; that stays the same.

## Context & Research

### Relevant code and patterns

- [`packages/app-core/src/state/commands.ts`](packages/app-core/src/state/commands.ts) — `CommandsSliceProperties` is a flat `{ [command in Command]: boolean }` map with all initial values `true`. **The slice has no setter** — every writer is a handler in another slice that returns `{ commands: { ...state.commands, ... } }`. Recovery requires an explicit cross-slice write, not a self-correcting derived value.
- [`packages/app-core/src/state/editor.ts`](packages/app-core/src/state/editor.ts) — `handleUpdateEditorZoomLevel` (lines 362-383) writes the four zoom command enabled flags (`zoomFit`, `zoomIn`, `zoomOut`, `zoomReset`). It does **not** write `zoomLevel` — that command's slice value is initialized to `true` and never updated dynamically. `handleUpdateEditorContent` (around line 306) and `handleUpdateIsDirty` (around line 333) write `exportSpecification` using `isExportSpecCommandEnabled({ editorIsDirty, compilationResult })`.
- [`packages/app-core/src/lib/commands/state.ts`](packages/app-core/src/lib/commands/state.ts) — `isCompilationReady(result)` returns `result?.status === 'ready'`. The four zoom-enabled predicates (`isZoomInCommandEnabled`, `isZoomOutCommandEnabled`, `isZoomOtherCommandsEnabled`) and `isExportSpecCommandEnabled` all gate on it. Extracting per-command-set evaluation into pure helpers avoids duplicating the logic between existing writers and `handleCompile`.
- [`packages/app-core/src/lib/commands/actions.ts`](packages/app-core/src/lib/commands/actions.ts) — `executeCommand` reads `commands[command]` from the store and runs the callback only if true. No error handling, no per-command failure state. "Disabled" here strictly means "the slice value is false."
- [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts) — `handleCompile` writes `compilation.result`. Currently does **not** write to `commands`. Has no existing `result.status === 'ready'` branch — the conditional must be added by this fix.
- [`packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx`](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx) line 93 — `disabled={!commands[command]}`. Generic for all commands; the bug is upstream in the slice writes, not at this read site.
- **Recent commits on the affected paths (last ~2 months on `next`):**
  - `b3b0abf2` — JSON Schema / Monaco gating
  - `c3535a56` — Show compiled Vega
  - `c5052410` — Tab refinements
  - `60f9cb16` — Data viewer refinements
  Feasibility review confirms the deadlock is a **structural omission from the original implementation, not a regression introduced by any specific commit** — git log shows no commit ever added a recovery write to `commands`. Bisection adds no value.
- **Existing test pattern:** `packages/app-core/src/state/__tests__/compilation-render-id.test.ts` and `debug.test.ts` are the slice-test conventions. Vitest in node env, no React rendering. **Critical:** the existing `compileSpec` mock in `compilation-render-id.test.ts` returns `{ errors: [], warnings: [], embedOptions: {}, spec: {} }` — it omits `status`. The new tests must explicitly include `{ status: 'ready', parsed: {...}, embedOptions: {} }` for the success case, otherwise `isCompilationReady` returns `false` and the test would pass for the wrong reason (false-negative regression guard).
- **Zero existing test coverage** for `commands` slice transitions.

### Institutional learnings

- [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — exactly this pattern. State written during the error path must be unwritten by the lifecycle hook that owns recovery. `handleCompile` reaching `ready` IS that hook for compilation state; it must also own the recovery write to `commands`.
- [`docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md`](docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md) — adjacent. Vega may emit identical errors on every pulse; the recovery write must be idempotent so steady-state error → ready → error → ready cycles don't oscillate the slice values incorrectly. Writing the same value twice is fine; the concern is correctness, not deduplication.
- [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — supports the helper extraction. Two consumers per helper (existing writer + recovery write) is the codebase's threshold.
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — applies to the implementation: each helper must be a pure function. No closures over stale state.

## Key Technical Decisions

- **Two pure helpers, not one mega-helper.** Separate concerns:
  - `evaluateZoomCommandsState(zoomLevel, compilationResult)` returns `Pick<CommandsSliceProperties, 'zoomIn' | 'zoomOut' | 'zoomFit' | 'zoomReset'>` — four keys, gated on `isCompilationReady` plus min/max checks for `zoomIn`/`zoomOut`.
  - `evaluateExportSpecCommandState(editorIsDirty, compilationResult)` returns `Pick<CommandsSliceProperties, 'exportSpecification'>` — one key, gated on `isCompilationReady` and `editorIsDirty`.
  Each existing writer keeps its narrow scope (zoom writers don't need to read `editorIsDirty`; export writers don't need to read `editorZoomLevel`). `handleCompile`'s recovery calls both, merges the results into the `commands` slice update.
- **`zoomLevel` is excluded from the helper.** Confirmed via feasibility review: `handleUpdateEditorZoomLevel` writes only four keys; no predicate exists for `zoomLevel`; the slice value is `true` at init and never updated. Adding `zoomLevel` to the helper would speculatively widen the contract with no backing predicate. If a future change introduces dynamic `zoomLevel` gating, that's a separate addition.
- **`handleCompile` writes compilation-gated commands on every compile (both branches).** Calls both helpers using `state.editorZoomLevel`, `state.editor.isDirty`, and the new `result`, and merges their output into `state.commands`. Both helpers handle the not-ready case correctly (returning `false` for gated commands), so the symmetric write disables zoom on error compile and re-enables on recovery — parity with how `exportSpecification` already disables via continuous editor-edit writes. (An earlier draft of this plan scoped out the error-branch write; manual testing showed that left zoom controls looking enabled in known-bad states until the user clicked them, because zoom has no editor-edit cadence to self-correct against.)
- **Always re-evaluate on the success branch, don't gate on edge transitions.** Writing the same boolean values repeatedly is a no-op for React subscribers (Zustand's shallow-equal at the selector layer skips re-renders for unchanged primitives). The `set()` allocation cost is one helper call + one object spread per success compile — trivial.
- **Don't add a Zustand subscription on `compilation.result`.** The codebase pattern is imperative cross-slice writes inside handlers; introducing a subscription would be a new pattern just for this bug.
- **Don't touch `handleLogError`.** Runtime errors don't write `commands` today. The bug isn't on that path.

## Open Questions

### Resolved during planning

- **Should the recovery path live in `handleCompile` or in a separate effect?** Resolved — `handleCompile`. Matches existing imperative-cross-slice-writes pattern.
- **Should the zoom-eval logic be derived (read-time selector) instead of written (write-time slice update)?** Resolved — keep it written. Slice symmetry with all other commands.
- **Does `zoomLevel` get the same treatment?** Resolved — no. `zoomLevel` has no predicate and no writer; including it would widen the contract without basis.
- **Is `handleCompile`'s recovery write conditional or unconditional?** Resolved during execution — **unconditional** (writes on both branches). The original plan called for conditional ("only write on `result.status === 'ready'`"); manual testing of the conditional version showed it left zoom controls looking enabled in known-bad states because zoom has no continuous-edit cadence to self-correct against (unlike `exportSpecification`, whose editor-edit writers fire on every keystroke). Reversed mid-execution to the symmetric write.
- **Does `exportSpecification` need recovery treatment?** Resolved — yes (in scope). Same structural gap; brought in based on plan review.
- **One mega-helper or two narrow helpers?** Resolved — two narrow helpers, one per gated command set. Keeps existing writers' state reads narrow.

### Deferred to implementation

- **Exact helper file location** — likely alongside the existing `is*Enabled` predicates in `lib/commands/state.ts`, or in a new sibling file if that grows too large. Final location follows local conventions.
- **Whether the `zoomLevel` exclusion from the helper warrants a comment** — implementer's call. A short JSDoc note ("zoomLevel has no dynamic predicate; intentionally excluded") would help future maintainers.

## Implementation Units

- [x] **Unit 1: Reproduce the bug as regression tests**

**Goal:** Lock down both deadlocks (zoom + `exportSpecification`) in vitest-friendly tests BEFORE applying the fix. Tests fail in the current state; pass after Unit 2.

**Requirements:** R4.

**Dependencies:** None.

**Files:**
- Test: `packages/app-core/src/state/__tests__/commands-recovery.test.ts` (new)

**Approach:**

State-layer tests, no React rendering. Vitest in node env.

Mock `compileSpec` carefully: the existing pattern in `compilation-render-id.test.ts` omits `status` from the mock, which would silently break this test by making `isCompilationReady` always false. The success-case mock MUST include `status: 'ready'` and a minimal `parsed` object so `isCompilationReady` returns true.

Two test groups, one per command set:

**Zoom recovery:**
1. Initial state — assert `commands.zoomIn`, `zoomOut`, `zoomFit`, `zoomReset` all `true`.
2. Set `compilation.result` to a non-ready state (e.g. `{ status: 'error', ... }` or `null`).
3. Call `updateEditorZoomLevel(<some-level>)` — simulating a user zoom click. Assert all four zoom flags now `false`.
4. Set `compilation.result` to `{ status: 'ready', parsed: {...}, embedOptions: {} }` via `handleCompile`. Assert all four zoom flags return to `true`. **Fails before fix; passes after.**
5. Happy path (no zoom click during error): error → no click → recovery → flags stay `true` throughout. Should pass before and after the fix.

**Export-spec recovery:**
1. Initial state — assert `commands.exportSpecification === true`.
2. Set `compilation.result` to non-ready, set `editorIsDirty` true (matching the precondition for the export gate).
3. Call `handleUpdateEditorContent` (or `handleUpdateIsDirty`) — simulating an editor keystroke. Assert `commands.exportSpecification === false`.
4. Set `compilation.result` to ready via `handleCompile`. Assert `commands.exportSpecification` returns to `true` (the `editorIsDirty` precondition still holds, so the recovery should produce true). **Fails before fix; passes after.**
5. Happy path: error → no editor change → recovery → flag stays `true`. Should pass before and after the fix.

**Edge cases (both groups):**
- `handleCompile` called multiple times on the success path → flags stay `true` (idempotency).
- Re-error after recovery (error → fix → error) → flags return to `false` correctly on the second error if and only if the trigger action (zoom click / editor keystroke) happens during the second error.
- Zoom-specific: `zoomLevel` at min — assertion that `zoomOut: false, zoomIn: true` correctly on recovery (boundary check).

**Patterns to follow:**
- [`packages/app-core/src/state/__tests__/compilation-render-id.test.ts`](packages/app-core/src/state/__tests__/compilation-render-id.test.ts) — slice-test fixture pattern, vitest in node env. **Important: deviate from this file's mock by adding `status: 'ready'`** — see the Approach note above.
- [`packages/app-core/src/state/__tests__/debug.test.ts`](packages/app-core/src/state/__tests__/debug.test.ts) — keyed-record slice setter test pattern.

**Test scenarios:**
- Happy path (zoom recovery): error → click → fix → all four zoom flags `true`. Currently fails.
- Happy path (export recovery): error → keystroke → fix → exportSpecification `true`. Currently fails.
- Happy path preservation (zoom no-click): error → no click → recovery → flags stay `true`. Should already pass; regression-guard on existing behaviour.
- Happy path preservation (export no-keystroke): error → no keystroke → recovery → flag stays `true`. Same.
- Edge case (idempotency): handleCompile called repeatedly on success → flags stable.
- Edge case (re-error): error → fix → error-with-trigger → flags correctly disable on second error.
- Edge case (zoom boundary): zoomLevel at min on recovery → zoomOut `false`, zoomIn `true`.

**Verification:**
- New test file added; "currently fails" tests demonstrate both bugs; happy-path-preservation tests pass before and after the fix.
- Each test includes a `compileSpec` mock with `status: 'ready'` for the success case (avoids the false-negative trap).

---

- [x] **Unit 2: Extract helpers and add recovery write in `handleCompile`**

**Goal:** Two pure helpers + a new conditional recovery branch in `handleCompile`. Existing writers refactored to call the helpers (single source of truth).

**Requirements:** R1, R2, R3.

**Dependencies:** Unit 1 (Unit 1's failing tests pass once this unit lands).

**Files:**
- Modify: `packages/app-core/src/lib/commands/state.ts` (add two pure helpers)
- Modify: `packages/app-core/src/state/editor.ts` (`handleUpdateEditorZoomLevel`, `handleUpdateEditorContent`, `handleUpdateIsDirty` call the helpers)
- Modify: `packages/app-core/src/state/compilation.ts` (`handleCompile` adds unconditional commands write — see Key Technical Decisions for the symmetry rationale)

**Approach:**

**Step 1 — Extract pure helpers** in `lib/commands/state.ts`, alongside the existing `is*Enabled` predicates. Suggested signatures (final naming and exact return types at implementation time):

```
evaluateZoomCommandsState(zoomLevel, compilationResult)
    → Pick<CommandsSliceProperties, 'zoomIn' | 'zoomOut' | 'zoomFit' | 'zoomReset'>

evaluateExportSpecCommandState(editorIsDirty, compilationResult)
    → Pick<CommandsSliceProperties, 'exportSpecification'>
```

Both pure; no closures over store state. Each calls the existing `is*Enabled` predicates internally.

**Step 2 — Refactor existing writers to call the helpers.** `handleUpdateEditorZoomLevel` calls the zoom helper; `handleUpdateEditorContent` and `handleUpdateIsDirty` call the export helper. Behaviour unchanged at these sites.

**Step 3 — Add the recovery branch to `handleCompile`.** `handleCompile` currently has no `result.status` branch — it always merges the new `result` into `state.compilation`. Add a conditional that, when `result.status === 'ready'`, also merges the helpers' output into `state.commands`:

```
if (result.status === 'ready') {
    set((state) => ({
        compilation: { ...state.compilation, ...resultUpdate },
        commands: {
            ...state.commands,
            ...evaluateZoomCommandsState(state.editorZoomLevel, result),
            ...evaluateExportSpecCommandState(state.editorIsDirty, result)
        }
    }));
} else {
    set((state) => ({ compilation: { ...state.compilation, ...resultUpdate } }));
}
```

(Directional only — final shape matches existing `handleCompile` patterns.)

**Patterns to follow:**
- Existing extracted predicates in [`packages/app-core/src/lib/commands/state.ts`](packages/app-core/src/lib/commands/state.ts).
- [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — extract once, call from multiple sites.
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — helpers are pure functions; the cross-slice write happens via the standard `set((state) => ({ ... }))` updater shape used elsewhere.

**Test scenarios:**
- All Unit 1 scenarios pass after this unit lands.
- Helper unit tests (in the same test file or alongside): `evaluateZoomCommandsState` returns the expected boolean record for representative input combinations (zoom level at min, mid, max; result ready, error, null). `evaluateExportSpecCommandState` returns the expected record for `(dirty=true, ready)`, `(dirty=false, ready)`, `(dirty=true, error)`, `(dirty=false, error)`.
- Integration (existing writer regressions): a successful compile from an idle state writes the same flags the existing code path wrote — no behaviour drift.
- Integration (error-compile branch): a failing compile (where `result.status !== 'ready'`) writes `false` for compilation-gated commands via the same helpers. Confirms the symmetric write — error compile disables zoom without requiring a click first.

**Verification:**
- Unit 1's regression tests pass.
- Helper unit tests cover the predicate logic comprehensively.
- All existing tests still pass (no regression).
- Manual QA: reproduce the original bug flow → confirm zoom controls re-enable on recovery without a visual reload. Reproduce the analogous flow for `exportSpecification` (error → keystroke → fix) → confirm the export action re-enables.

## System-Wide Impact

- **Interaction graph:** `handleCompile` already updates `compilation.result`; this adds an unconditional parallel write to `commands`. No new state machinery, no new subscriptions, no new effects.
- **Error propagation:** The error path's writes to `commands` via the existing editor / zoom writers still happen. `handleCompile` now also writes on both branches: error compile disables compilation-gated commands; success compile re-enables them. Symmetric with how `exportSpecification` was already self-correcting via editor-edit cadence; closes the same gap for zoom (which has no equivalent cadence).
- **State lifecycle risks:** Idempotency is the main concern. `handleCompile` may run multiple times in quick succession (debounced compiles, recovery oscillation). The helpers are pure and the slice writes are no-ops at the React-subscriber level when values are unchanged. No risk of feedback loops.
- **API surface parity:** None. All changes internal to `app-core`'s state machinery.
- **Integration coverage:** The Unit 1 tests exercise the cross-slice interaction (`compilation` → `commands`) which mocks alone wouldn't catch. Helper unit tests cover the predicate logic in isolation.
- **Unchanged invariants:**
  - `commands` slice initial values stay `true`.
  - `handleUpdateEditorZoomLevel`, `handleUpdateEditorContent`, `handleUpdateIsDirty` observable behaviour is unchanged (the refactor extracts shared logic but doesn't alter what gets written or when).
  - `executeCommand`'s contract — read the slice, run if true — is unchanged.
  - The `disabled={!commands[command]}` pattern in `toolbar-button-standard.tsx` is unchanged.
  - Other commands not gated on `isCompilationReady` are unaffected.
  - `zoomLevel` slice value remains init-true-and-never-updated (out of scope for this fix).
  - `handleLogError` writes (`runtimeErrors`) are untouched.

**Audit follow-up:** if other commands are later found to gate on `isCompilationReady` and not be re-evaluated on recovery, extend the helper set the same way. Initial sweep during plan review found only zoom + `exportSpecification`; no others surfaced.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| The fix introduces drift between the two helpers if predicates change. | Both sites use the helpers after the refactor — single source of truth per command set. Adding a new gate to one of the predicates updates both call sites at once. |
| `handleCompile` is invoked frequently (debounced compile per keystroke); always re-writing flags on success could thrash. | React subscribers skip re-renders for unchanged primitive values (Zustand's selector-side shallow-equal). The `set()` allocation cost is one helper call + one object spread per success compile — trivial. |
| The test fixture mock pattern in this codebase omits `status` from `compileSpec` results, which would produce a false-negative regression guard. | Unit 1's approach explicitly requires `status: 'ready'` in the success-case mock. Documented in the test patterns section. |
| Other compilation-gated commands may have the same deadlock pattern undetected. | Scope-confirmed during plan review: only zoom and `exportSpecification` matched the pattern in the current codebase. Future surfacing handled by extending the helper set. |
| The unconditional commands write fires on every compile, including debounced edit-time compiles. | Both helpers are pure boolean evaluators; the slice merge is shallow-equal-friendly at the React-subscriber layer. No render thrash because subscribers see unchanged primitive values. |

## Documentation / Operational Notes

- No release notes needed beyond a one-line CHANGELOG entry: "Fix: zoom controls and the spec exporter no longer become permanently disabled if used during a parse-error state."
- No bundle-size impact (two new helpers, ~30 lines combined).
- No rollout / monitoring concerns — UI bug fix on the visual's internal state machinery.
- A `/ce:compound` doc capturing the "recovery-path write must mirror error-path writes for cross-slice command-enabled state" pattern is worth writing after this lands. The base pattern (lifecycle owns identity token) is already documented; this is a specific application worth surfacing under a slightly different lens — "the slice that gets written during error must get rewritten during recovery, even when the writer and the slice live in different state slices."

## Sources & References

- Related code:
  - [`packages/app-core/src/state/commands.ts`](packages/app-core/src/state/commands.ts)
  - [`packages/app-core/src/state/editor.ts`](packages/app-core/src/state/editor.ts) — `handleUpdateEditorZoomLevel` (lines 362-383), `handleUpdateEditorContent` (~306), `handleUpdateIsDirty` (~333)
  - [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts) — `handleCompile`
  - [`packages/app-core/src/lib/commands/state.ts`](packages/app-core/src/lib/commands/state.ts) — existing predicates, target for new helpers
  - [`packages/app-core/src/lib/commands/actions.ts`](packages/app-core/src/lib/commands/actions.ts) — `executeCommand`
  - [`packages/app-core/src/lib/commands/types.ts`](packages/app-core/src/lib/commands/types.ts) — `Command` union, `CommandsSliceProperties`
  - [`packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx`](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx) — read site
- Institutional learnings:
  - [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md)
  - [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md)
  - [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md)
  - [`docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md`](docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md)
- Plan review context:
  - Feasibility review confirmed: deadlock is a structural omission, not a regression introduced by any specific commit. Bisection skipped.
  - Adversarial review surfaced: `exportSpecification` shares the deadlock pattern; `compileSpec` mock pattern needs `status: 'ready'` explicit; conditional vs unconditional `handleCompile` write needs commit. All resolved during planning.
