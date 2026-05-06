---
title: Field-parameter detection drops all but the first parameter on shared columns
date: 2026-05-07
category: docs/solutions/logic-errors
module: src/lib/dataset/field-parameter-detection
problem_type: logic_error
component: service_object
symptoms:
  - Switching a Power BI field parameter to use the same underlying field as another parameter makes the second parameter disappear from the Deneb dataset entirely
  - A DataView column whose sourceFieldParameters lists multiple parameter names is registered only under the first name; subsequent names are silently dropped
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components:
  - packages/data-core/src/lib/support-fields/build-processing-plan
  - packages/data-core/src/lib/support-fields/build-data-row
  - src/lib/dataset/processing
tags:
  - field-parameters
  - source-field-parameters
  - cardinality
  - dataset-mapping
  - power-bi-dataview
  - dedup
---

# Field-parameter detection drops all but the first parameter on shared columns

## Problem

The `detectFieldParameterGroups` function in [src/lib/dataset/field-parameter-detection.ts](../../../src/lib/dataset/field-parameter-detection.ts) accessed `field.sourceFieldParameters?.[0]?.displayName` — treating Power BI's plural `sourceFieldParameters` array as if it always contained exactly one entry. Power BI's data model permits a single underlying semantic-model field to be referenced by multiple field parameters simultaneously; when that happens, the DataView delivers one column whose `sourceFieldParameters` lists every parameter the column belongs to. Reading only `[0]` silently dropped every entry after the first, so any column shared between N parameters was registered under only one of them.

## Symptoms

- Two field parameters configured with two distinct underlying fields → both columns appear correctly in the Deneb dataset.
- The user switches the second parameter to use the same underlying field as the first → the second parameter's column **disappears** from the dataset entirely. The first parameter still has its column; the second parameter is silently absent.
- The user did not change the Deneb spec or settings — only the Power BI parameter assignment.

## What Didn't Work

Not applicable — the bug location was obvious from the user's report (a single line in a small detection function). Investigation effort went into **proving the fix was safe downstream** rather than locating the bug. That verification appears in *Why This Works*.

## Solution

**Before:**

```typescript
for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const paramName = field.sourceFieldParameters?.[0]?.displayName; // only first

    if (!paramName) {
        regularFieldIndices.push(i);
        continue;
    }

    if (!parameterGroups[paramName]) {
        parameterGroups[paramName] = { /* ... */ };
    }
    const group = parameterGroups[paramName];
    group.componentNames.push(field.displayName);
    group.componentFieldIndices.push(i);
    group.componentRoles.push(field.isMeasure ? 'aggregation' : 'grouping');
    // ... mixed-roles check
}
```

**After:**

```typescript
for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const paramEntries = field.sourceFieldParameters ?? [];

    if (paramEntries.length === 0) {
        regularFieldIndices.push(i);
        continue;
    }

    // Per-field dedup defends against a Power BI edge case where the same
    // parameter name is listed twice for one field — without this we'd
    // double-count the field inside that parameter's group.
    const seenParamNames = new Set<string>();
    let registeredInAnyGroup = false;

    for (const entry of paramEntries) {
        const paramName = entry.displayName;
        if (!paramName || seenParamNames.has(paramName)) continue;
        seenParamNames.add(paramName);

        if (!parameterGroups[paramName]) {
            parameterGroups[paramName] = { /* ... */ };
        }
        const group = parameterGroups[paramName];
        group.componentNames.push(field.displayName);
        group.componentFieldIndices.push(i);
        group.componentRoles.push(field.isMeasure ? 'aggregation' : 'grouping');
        // ... mixed-roles check (unchanged)

        registeredInAnyGroup = true;
    }

    // Defensive fallback for the all-empty-displayName case.
    if (!registeredInAnyGroup) {
        regularFieldIndices.push(i);
    }
}
```

The same source-field index can now appear in `componentFieldIndices` of multiple parameter groups when the field belongs to multiple parameters.

Accompanying changes:

- Replaced an existing test that locked in the buggy single-parameter behavior (`should handle field belonging to multiple parameters via first entry`) with multi-parameter coverage: registered in every named group; shared field plus distinct fields; dedup of duplicate entries; shared measure ordering; first-occurrence ordering across fields.
- Added a plan-level cross-module assertion test in [build-processing-plan-parameters.test.ts](../../../packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts) — `should emit independent parameter instructions when two groups share a component index` and `should skip a shared component index exactly once in the regular field loop` — pinning the contract that `buildProcessingPlan` handles shared `componentFieldIndices` values correctly.
- Adopted the SDK type directly: `DetectableField.sourceFieldParameters` now references `powerbi.DataViewSourceFieldParameterMetadata` rather than an inline `Array<{ displayName: string }>` mirror, allowing the `as`-cast at the [processing.ts call site](../../../src/lib/dataset/processing.ts) to be deleted.

## Why This Works

`sourceFieldParameters` is **plural** — it is typed as `DataViewSourceFieldParameterMetadata[]` in `powerbi-visuals-api`. The original `[0]?.displayName` was a cardinality-of-one assumption on an intentionally plural field. When Power BI's data model permits one underlying field to occupy N parameter slots and delivers it as a single column with N entries in `sourceFieldParameters`, that assumption silently discards N−1 registrations.

Before applying the fix, downstream consumers were audited to confirm safety:

- [build-processing-plan.ts](../../../packages/data-core/src/lib/support-fields/build-processing-plan.ts) collects all component indices into a `Set<number>` (`parameterFieldIndices`), which is naturally idempotent for repeated values.
- [build-data-row.ts](../../../packages/data-core/src/lib/support-fields/build-data-row.ts) reads `baseValues[idx]` independently per instruction, so the same index appearing in two groups produces two correct reads with no interference.
- [processing.ts](../../../src/lib/dataset/processing.ts) writes `fields[encodedName].isSupportField = true` once per group; setting it twice is a no-op.
- The selection queue is built from the encoded-name-keyed `fields` object before the parameter loop modifies entries, so each underlying source column appears in the queue exactly once regardless of how many parameters reference it.

No downstream code change was required — the fix is entirely contained in the detection layer.

The per-field `Set<string>` dedup is a small defensive guard. Power BI should not list the same parameter name twice for one field, but if it ever does the set ensures one registration per (field, group) pair rather than double-counting inside a single group.

## Prevention

1. **Treat plural fields as plural — never index `[0]` as a representative entry.** When `array?.[0]` appears on a plural-typed field in this codebase, that is a cardinality-of-one assumption hiding in plain sight. Either (a) iterate all entries, (b) document why a single representative is correct, or (c) add a pinned test asserting cardinality > 1 produces the expected behavior. The plan-level test `should emit independent parameter instructions when two groups share a component index` in `build-processing-plan-parameters.test.ts` is the canonical shape for option (c).

2. **When fixing a "first-only" bug, audit every other consumer of the same field for the same shape.** Grep the monorepo for the field name — every consumer must either iterate or have a documented reason to stop early. For this fix the audit confirmed `processing.ts` is the only other consumer of `sourceFieldParameters` and it routes entirely through `detectFieldParameterGroups`, so no parallel bug exists. Future additions should repeat this audit.

3. **Prefer SDK types directly over inline structural mirrors in module APIs.** When a module accepts data shaped by a third-party SDK (here `powerbi-visuals-api`), declare its inputs using the SDK's exported type rather than an inline `Array<{ displayName: string }>` mirror. A mirror forces an `as`-cast at every call site that defeats the compiler boundary — if the SDK widens the type, the cast still compiles and the mismatch is invisible. After the fix, `DetectableField.sourceFieldParameters` references `powerbi.DataViewSourceFieldParameterMetadata` directly and the cast in `processing.ts` was deleted.

4. **Pin cross-module contracts at both layers — the bug's unit boundary and its immediate consumer's boundary.** A unit test on `detectFieldParameterGroups` proves the fix; a companion test on `buildProcessingPlan` proves that two `PlanParameterGroup`s sharing a `componentFieldIndices` value still produce correct independent instructions. Without the consumer-layer test, a future refactor of `parameterFieldIndices` could silently regress multi-parameter behavior even with all detection-layer tests still green.

## Related Issues

- [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](../best-practices/type-widening-requires-call-site-audit-2026-04-16.md) — the symmetric inverse: that doc covers write-side cardinality bugs (singular value written into a plural container, all-but-one entries lost). Together the two docs define both directions of the cardinality-of-one hazard class. The earlier doc's prevention scope is currently framed for write sites only; this fix demonstrates the same hazard on read sites and would broaden the pattern.
- [docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — same subsystem (support-field flag resolution), different bug class. Useful cross-reference when reasoning about parallel field-parameter logic across detection and plan-building.
- Plan: `docs/plans/2026-05-07-001-fix-multi-parameter-per-field-detection-plan.md`
- Branch: `fix/multiple-field-parameters-per-field` — commits `7c1f0bc3`, `acf9c223`, `d1ab859d`.
