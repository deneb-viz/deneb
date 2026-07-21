---
title: "fix: Detect all named parameters per shared field"
type: fix
status: completed
date: 2026-05-07
---

# fix: Detect all named parameters per shared field

## Summary

Change `detectFieldParameterGroups` to register a source field as a component of every named parameter in its `sourceFieldParameters` array, not just the first. Updates the existing single-parameter test to assert the new behavior, adds a multi-parameter test, and adds plan-level assertions that confirm shared component indices flow through `buildProcessingPlan` cleanly.

---

## Problem Frame

When a single Power BI column belongs to multiple field parameters (e.g. the same underlying measure is offered by both a "Selected Metric" and a "Secondary Metric" parameter), the dataview surfaces the column once with `sourceFieldParameters` listing every parameter it participates in. The current detection layer reads only `sourceFieldParameters[0]`, so the second (and subsequent) parameters silently lose this component. Downstream the parameter either disappears from the dataset entirely (if no other column belongs to it) or appears with a smaller component set than the user expects. The behavior reverses unpredictably depending on whether the user picks distinct or overlapping fields across parameters.

---

## Requirements

- R1. A source field whose `sourceFieldParameters` array lists N entries is registered as a component of all N parameter groups, keyed by each entry's `displayName`.
- R2. Single-parameter fields, parameter-less fields, mixed-role parameters, and DataView ordering continue to behave as they do today.
- R3. The behavior is durable across the dataset processing chain: `buildProcessingPlan`, `buildDataRow`, the `isSupportField` marker, and the selection queue all handle shared component indices without regressions.
- R4. Defensive: empty `sourceFieldParameters: []` classifies the field as regular (same as `undefined`); duplicate parameter-name entries within one field's array are deduped per-field-per-group.

---

## Scope Boundaries

- No changes to `buildProcessingPlan`, `buildDataRow`, `processing.ts` orchestration, or any UI/template code — the detection layer is the only place that flattens to one parameter per field.
- No changes to `PlanParameterGroup` or `ParameterProcessingInstruction` shapes.
- Cleanup of the `hasMixedRoles` logic is out of scope — it works correctly for shared indices today.
- No template export/import changes — parameter naming and stable encoded names are unaffected.
- No performance work for very wide `sourceFieldParameters` arrays — revisit if evidence appears.

---

## Context & Research

### Relevant Code and Patterns

- [src/lib/dataset/field-parameter-detection.ts](src/lib/dataset/field-parameter-detection.ts) — the bug site; the `paramName = field.sourceFieldParameters?.[0]?.displayName` read flattens to one parameter per field.
- [src/lib/dataset/__test__/field-parameter-detection.test.ts](src/lib/dataset/__test__/field-parameter-detection.test.ts) — comprehensive existing test suite; the `should handle field belonging to multiple parameters via first entry` test currently locks in the buggy behavior and must be replaced.
- [packages/data-core/src/lib/support-fields/build-processing-plan.ts](packages/data-core/src/lib/support-fields/build-processing-plan.ts) — `parameterFieldIndices: Set<number>` already deduplicates shared indices; each `PlanParameterGroup` produces an independent `ParameterProcessingInstruction`. No code change needed.
- [packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts](packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts) — established assertion style for plan-shape tests; mirror it for the new shared-index coverage.
- [src/lib/dataset/processing.ts](src/lib/dataset/processing.ts) (≈ lines 300–466) — wires detection → plan → row builder → fields metadata → selection queue. Selection queue is built before the parameter loop modifies `fields`, and `isSupportField` is set idempotently, so shared component indices are already safe.

### Institutional Learnings

- No prior `docs/solutions/` entries cover field parameters or this detection layer.

### External References

- None — fix is contained and the relevant Power BI API shape (`DataViewMetadataColumn.sourceFieldParameters`) is already documented inside `support-fields.md`.

---

## Key Technical Decisions

- **Iterate `sourceFieldParameters` rather than reading index zero.** The detection result already supports a field belonging to multiple groups via `componentFieldIndices.push(i)` — the only flattening point is the read. Iterating preserves all existing per-group bookkeeping (componentNames, componentRoles, hasMixedRoles) without restructuring.
- **Per-field dedup via a local `Set<string>` of seen parameter names.** Cheap defense against the (unlikely) case where Power BI lists the same parameter twice in one field's array. Without dedup, that field would appear twice in the same group's `componentFieldIndices`, which would double-count it in the row's array values.
- **Replace, do not extend, the existing single-parameter test.** Its assertion (`Object.keys(parameterGroups)).toEqual(['Param A'])`) directly contradicts the new contract. Keeping it as a regression check is impossible; replacing it with the new expectation makes intent unambiguous.
- **Add a plan-level assertion test in `data-core` rather than only at the detection layer.** A unit test on the detection function alone proves the bug is fixed; the plan-level test makes the cross-module contract explicit ("two groups can share a `componentFieldIndices` entry and each emits an independent instruction") so a future refactor of `buildProcessingPlan`'s `parameterFieldIndices` logic cannot silently break this case.

---

## Open Questions

### Resolved During Planning

- **Does `buildProcessingPlan` cope with the same index in multiple groups' `componentFieldIndices`?** Yes — `parameterFieldIndices` is a `Set<number>`, so duplicate adds are no-ops, and each group's instruction is built independently from its own `componentFieldIndices` array.
- **Does the row builder handle a `baseValues[idx]` read by multiple parameter instructions in the same row?** Yes — reads are independent per instruction; same value appears once per group's array.
- **Does `processing.ts` mark a shared component's `isSupportField` correctly?** Yes — set to `true` once per group in the loop, idempotent.
- **Does the selection queue see a shared component once or N times?** Once — the queue is built from the `fields` object, which is keyed by encoded display name (one entry per source column regardless of how many parameters reference it).

### Deferred to Implementation

- Whether to keep `componentRoles` populated for an out-of-band edge case (a component whose `isMeasure` differs across two groups it belongs to). Same source field has a single `isMeasure`, so this cannot happen in practice — leave as is unless an integration test surfaces a counterexample.

---

## Implementation Units

- U1. **Detection: register a field for every parameter it lists**

**Goal:** Replace the `[0]`-indexed read in `detectFieldParameterGroups` with iteration over the full `sourceFieldParameters` array, with per-field parameter-name dedup. Update the existing test that asserted the buggy behavior, and add coverage for the multi-parameter case.

**Requirements:** R1, R2, R4

**Dependencies:** None

**Files:**
- Modify: `src/lib/dataset/field-parameter-detection.ts`
- Modify: `src/lib/dataset/__test__/field-parameter-detection.test.ts`

**Approach:**
- In the detection loop, replace the single-name read with iteration over `field.sourceFieldParameters` entries.
- Track parameter names already applied to this field in a local `Set<string>` to defend against duplicate entries.
- For each unique parameter name on the field, lazily create the group, then push the field's name, index, and role.
- Preserve the existing classification rule: a field with no entries (undefined OR empty array) is regular; a field with at least one entry is not.
- Doc-comment update: clarify that fields with multiple `sourceFieldParameters` entries appear in multiple groups and that the same `componentFieldIndices` value can recur across groups.

**Execution note:** Replace the obsolete `should handle field belonging to multiple parameters via first entry` test in the same change so failing CI does not block on a now-incorrect assertion.

**Patterns to follow:**
- The existing detection loop's lazy-group-create pattern, the `componentRoles` push, and the `hasMixedRoles` per-group check (line ≈ 76–82 of the current file) — preserve all three for each per-name iteration.

**Test scenarios:**
- Happy path: one field with `sourceFieldParameters: [{displayName: 'Param A'}, {displayName: 'Param B'}]` -> both `Param A` and `Param B` groups exist, each with `componentFieldIndices: [0]`, `componentNames: ['Field']`, `componentRoles: ['grouping']`.
- Happy path: two fields each belonging to the same two parameters -> both groups contain both fields in DataView order.
- Happy path: shared field plus distinct fields — `[(F1 in [P,Q]), (F2 in [P]), (F3 in [Q])]` -> `P` group has `componentFieldIndices: [0, 1]`, `Q` group has `[0, 2]`.
- Edge case: empty `sourceFieldParameters: []` -> field classified as regular (parity with `undefined`).
- Edge case: duplicate entries `sourceFieldParameters: [{displayName: 'Param A'}, {displayName: 'Param A'}]` -> single group `Param A` with the field appearing exactly once in `componentFieldIndices`.
- Edge case: a measure belonging to two parameters -> both groups carry `componentRoles: ['aggregation']`; neither flips `hasMixedRoles` spuriously.
- Edge case: parameter-name iteration preserves first-occurrence ordering of group keys (`Object.keys(parameterGroups)` reflects the order parameters were first seen across the whole field array).
- Regression: all eight existing tests except the obsolete one continue to pass unchanged.

**Verification:**
- `npx vitest run src/lib/dataset/__test__/field-parameter-detection.test.ts` is green.
- The replacement test names the new contract explicitly (e.g. `should register a field in every parameter group named in sourceFieldParameters`).

---

- U2. **Plan-level contract assertion: two parameter groups may share a component index**

**Goal:** Add a new assertion in the existing `build-processing-plan-parameters` test suite that constructs two `PlanParameterGroup` entries sharing a single `componentFieldIndices` value and verifies each group emits an independent `ParameterProcessingInstruction` with the shared index intact and the regular-fields loop skips that index exactly once.

**Requirements:** R3

**Dependencies:** None (independent of U1; pinning the contract here is what makes U1's downstream safety durable).

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`

**Approach:**
- Construct a fields list with three entries `[{Sales (idx 0)}, {Profit (idx 1)}, {Year (idx 2)}]` and two parameter groups: `Selected Metric` containing components `[0, 1]` and `Secondary Metric` containing components `[0, 2]`.
- Assert the resulting plan has two `kind: 'parameter'` instructions with the expected `componentIndices`, plus zero `kind: 'field'` instructions (every field is consumed by at least one parameter group).
- Assert each parameter instruction's `namesArray` reflects its own `componentNames` (no cross-pollination).
- Add a second assertion: a fields list with the shared component plus a non-parameter field (`[{Sales (0)}, {Profit (1)}, {Year (2)}, {NonParam (3)}]`) and the same two parameter groups -> regular-fields loop emits exactly one `kind: 'field'` instruction for `NonParam` (verifies the `parameterFieldIndices` Set still skips `Sales` only once).

**Patterns to follow:**
- The existing `should produce a parameter instruction for grouped fields` test in the same file — same arrange/assert shape, same `toMatchObject` style.

**Test scenarios:**
- Integration: two groups sharing index 0 -> both `ParameterProcessingInstruction`s present with `componentIndices` `[0, 1]` and `[0, 2]` respectively.
- Integration: shared index plus extra non-parameter field -> exactly one regular `FieldProcessingInstruction` is emitted (the `parameterFieldIndices` Set excludes the shared index from the regular loop without double-counting).
- Edge case: the two instructions' `namesArray` references are independent — modifying one would not appear in the other (use distinct values to verify).

**Verification:**
- `npx vitest run packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts` is green.
- New tests have descriptive names that reference shared-component-index semantics so the contract is searchable.

---

## System-Wide Impact

- **Interaction graph:** Detection feeds `processing.ts` -> `buildProcessingPlan` -> `buildDataRow` -> `fields` metadata + selection queue. All consumers are already idempotent / set-based for shared indices (see Open Questions / Resolved During Planning).
- **Error propagation:** No new failure modes. The detection function has no error paths; iteration over an array with one or more entries is structurally identical to the current single read.
- **State lifecycle risks:** None. Detection is pure and stateless; results are rebuilt per dataview update.
- **API surface parity:** No public type changes. `FieldParameterGroup`, `PlanParameterGroup`, and `ParameterProcessingInstruction` shapes are unchanged.
- **Integration coverage:** U2's plan-level test pins the cross-module contract that detection and `buildProcessingPlan` cooperate correctly when groups share component indices.
- **Unchanged invariants:**
  - DataView component order within each group is preserved.
  - `regularFieldIndices` still excludes any field with at least one parameter entry.
  - `hasMixedRoles` is computed within each group independently and does not flip when the same source field appears in multiple groups (a single source field has a single `isMeasure` value).
  - Stable encoded parameter names continue to derive from the parameter's `displayName`, not from any component field.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Power BI ever lists the same parameter name twice in one field's `sourceFieldParameters` array, causing a doubled component in that group | Per-field `Set<string>` dedup in U1's iteration. |
| Existing test suite has a fixture or integration test elsewhere that depends on the buggy single-parameter behavior | Run the full `npm run test` after U1 + U2; addressed during implementation if anything surfaces. |
| Future refactor of `buildProcessingPlan` removes the `parameterFieldIndices` Set assumption and silently breaks the shared-index contract | U2's explicit plan-level assertion makes this a test failure rather than a silent regression. |

---

## Documentation / Operational Notes

- No user-facing docs change — the existing description in [packages/data-core/doc/support-fields.md](packages/data-core/doc/support-fields.md) covers field-parameter consolidation in general terms and does not promise a single-parameter-per-field behavior.
- Consider adding a short note to `support-fields.md` clarifying that a single source field can belong to multiple parameter groups; defer that to follow-up if the implementer feels the doc reads ambiguously after the fix lands.

---

## Sources & References

- Branch: `fix/multiple-field-parameters-per-field`
- Related code: [src/lib/dataset/field-parameter-detection.ts:53](src/lib/dataset/field-parameter-detection.ts#L53), [packages/data-core/src/lib/support-fields/build-processing-plan.ts](packages/data-core/src/lib/support-fields/build-processing-plan.ts)
- Prior plans (context only — feature originally introduced): [docs/plans/2026-04-02-field-parameter-support.md](docs/plans/2026-04-02-field-parameter-support.md), [docs/plans/2026-04-05-field-parameter-improvements.md](docs/plans/2026-04-05-field-parameter-improvements.md)
- Related issue: #238 (field parameter support — original feature ref)
