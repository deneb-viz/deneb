---
title: 'Dynamic-format-string calc-group items strip static formats from consolidated field-parameter columns'
date: 2026-08-11
category: logic-errors
module: 'src/lib/dataset/processing, src/lib/dataset/support-field-provider'
problem_type: logic_error
component: service_object
severity: high
symptoms:
    - 'Consolidated field-parameter `__format`/`__formatted` values come back empty (`["","",""]`) whenever any calculation-group item with a dynamic format string exists in the model, even if never invoked (e.g. an unused `SELECTEDMEASUREFORMATSTRING()` item)'
    - 'Even measures with a genuinely static format string are affected once the calc item exists — deleting it immediately restores correct formatting'
    - 'Measures with a measure-level dynamic format string lose formatting inside consolidated field parameters even with no calculation group present'
    - 'Direct (non-parameter) fields and native Power BI visuals are unaffected'
    - 'Power BI stops delivering static `source.format` on measure columns model-wide and only ships format strings per-row via `values[i].objects[rowIndex].general.formatString`'
root_cause: logic_error
resolution_type: code_fix
related_components:
    - packages/data-core/src/lib/support-fields/build-data-row.ts
    - src/lib/dataset/field-parameter-detection.ts
tags:
    - dynamic-format-string
    - field-parameters
    - calculation-groups
    - format-string
    - dataset-mapping
    - support-fields
    - power-bi-dataview
---

# Dynamic-format-string calc-group items strip static formats from consolidated field-parameter columns

## Problem

When a Power BI semantic model contains any calculation-group item with a dynamic format string (e.g. `SELECTEDMEASUREFORMATSTRING()`) — even if that calc item is never invoked in the report — Deneb 2.0 stopped emitting `__format`/`__formatted` support-field values for measures accessed through consolidated field parameters, because two call sites in `src/lib/dataset/processing.ts` pre-resolved format strings from static `column.format` metadata that Power BI had already stripped model-wide.

## Symptoms

- `__format` and `__formatted` support fields for field-parameter-consolidated measures come back empty — the parameter's format array renders as `["","",""]` regardless of which component measure is selected.
- Even measures with a genuinely *static* format string are affected once the dynamic-format calc item exists in the model — the stripping is model-wide, not limited to the dynamic measure.
- Direct (non-parameter) fields are unaffected — they still resolve correctly via the per-row `objects[rowIndex].general.formatString` fallback.
- Native Power BI visuals are unaffected.
- The trigger is the mere *existence* of a dynamic-format calculation-group item in the model — it does not need to be invoked/visible in the report.
- Deleting the calc item immediately restores correct Deneb formatting.

Field report source: [r/PowerBI comment](https://www.reddit.com/r/PowerBI/comments/1vhoqs7/comment/p2u77i3/) (2026-08, during 2.0 beta testing).

## What Didn't Work

- **Precedence-order hypothesis.** Initial suspicion was that the 2.0 provider's fallback order — `source.format ?? objects[rowIndex].general.formatString` — was wrong. Disproven by comparing against the 1.x (AppSource, `origin/certification`) implementation in `src/lib/dataset/values.ts`, which uses identical precedence and works for plain dynamic measures. A unit harness driving the real pipeline (`buildProcessingPlan` → `createPbiSupportFieldProvider` → `buildDataRow`) with Power BI-shaped `DataView` fragments confirmed plain-measure dynamic format strings already worked correctly in 2.0.
- **"Value1" parameter naming red herring.** During PBIP harness construction, a field parameter appeared to surface under the wrong display name. This was a harness authoring bug: `isNameInferred` left set on an explicitly-named TMDL column makes the host report the underlying source column name instead of the given name. Not a Deneb defect.

## Solution

Root cause location: two call sites in `src/lib/dataset/processing.ts` pre-resolved a consolidated parameter's `formatStrings` array unconditionally from static `column.format` metadata. Once populated, `buildDataRow` (`packages/data-core/src/lib/support-fields/build-data-row.ts`) treats `instruction.formatStringsArray` as authoritative and never calls `provider.getFormatString()` per row — so it never sees the per-row `objects[rowIndex].general.formatString` values that Power BI actually populates once a dynamic-format calc item exists.

New helper in `src/lib/dataset/support-field-provider.ts`:

```ts
export const getStaticParameterFormatStrings = (
    componentFormats: (string | undefined)[]
): string[] | undefined =>
    componentFormats.every((format) => typeof format === 'string')
        ? (componentFormats as string[])
        : undefined;
```

Call site 1 — detected field-parameter groups, `src/lib/dataset/processing.ts` ("Before" condensed from the block-bodied original; behavior identical):

```ts
// Before
formatStrings: group.componentFieldIndices.map(
    (idx) => planSourceColumns[idx]?.column?.format ?? ''
)

// After
formatStrings: getStaticParameterFormatStrings(
    group.componentFieldIndices.map(
        (idx) => planSourceColumns[idx]?.column?.format
    )
)
```

Call site 2 — manually flagged `treatAsParameter` single-element groups, `src/lib/dataset/processing.ts`:

```ts
// Before
formatStrings: [col.column.format ?? '']

// After
formatStrings: getStaticParameterFormatStrings([col.column.format])
```

Consumer side (unchanged — this existing fallback is what makes the fix effective) — `packages/data-core/src/lib/support-fields/build-data-row.ts`:

```ts
// Format strings array
if (instruction.emitFormat) {
    if (instruction.formatStringsArray) {
        row[encodedName + FORMAT_FIELD_SUFFIX] =
            instruction.formatStringsArray;
    } else {
        row[encodedName + FORMAT_FIELD_SUFFIX] =
            componentIndices.map((idx) =>
                provider.getFormatString(idx, rowIndex)
            );
    }
}
```

When `getStaticParameterFormatStrings` returns `undefined` (any component lacks a static format), `buildDataRow` falls back to calling `provider.getFormatString(idx, rowIndex)` per row per component — the same per-row path already used for direct fields, which resolves `source.format ?? objects[rowIndex].general.formatString ?? ''`.

Fix landed in commit `966aa39b` (PR [#739](https://github.com/deneb-viz/deneb/pull/739)).

## Why This Works

Power BI's DataView delivery is not per-column-static the way it appears: when a dynamic-format-string calculation-group item exists anywhere in the model, Power BI strips static `source.format` from **every** measure column model-wide — including measures with a genuinely fixed format string — and delivers format strings exclusively per-row via `objects[rowIndex].general.formatString`. This is a model-wide behavior change, which is why the bug manifests even for calc items that are never invoked and even for otherwise-static measures.

The direct-field path already handled this, because `getFormatString` in `support-field-provider.ts` checks `source.format` first and falls back to the per-row channel — naturally adapting to whichever channel Power BI populates. The 2.0 field-parameter consolidation broke this by pre-resolving `formatStrings` once at plan-build time from the static channel and baking the result into `formatStringsArray` — permanently bypassing the per-row fallback.

Making the pre-resolution conditional restores correctness without discarding the optimization: when every component genuinely has a static format, pre-resolving is provably safe because the provider's own precedence puts `source.format` first — the pre-resolved and per-row-resolved values are identical, so skipping the per-row call is a pure performance win. Only when a static format is absent for at least one component must pre-resolution be avoided so the row loop falls through to the per-row lookup.

## Prevention

1. **Never assume `column.format` (static DataView metadata) is populated for a measure.** Power BI strips it model-wide whenever any dynamic-format-string calculation-group item exists in the model — even unused ones. The per-row `objects[rowIndex].general.formatString` channel is the authoritative source; static metadata is an optimization opportunity only, never a guarantee.

2. **Any pre-resolution/caching optimization over `DataView` metadata must be conditional on the static data actually being present**, with the per-row provider retained as the safety net. The pattern to reuse: a small `getStaticXxx(...): T | undefined` guard that returns `undefined` on any missing component, consumed by an `instruction.xxxArray ?? computePerRow(...)` fallback at the consumption site. (Edge to check when reusing: an empty component list vacuously passes `every` and returns `[]`, which the consumer treats as authoritative — harmless at the current call sites, but verify that semantics fit any new one.)

3. **Regression coverage for this class of bug:**
    - Unit harness pattern: drive the real pipeline (`buildProcessingPlan` → `createPbiSupportFieldProvider` → `buildDataRow`) with hand-built, Power BI-shaped `DataView` fragments rather than mocking the provider. See `src/lib/dataset/__test__/dynamic-format-string.test.ts` (static, per-row dynamic, and calc-item-stripped scenarios × direct fields and consolidated parameters).
    - The DataView shape that must stay covered — static format absent, per-row format present:

        ```ts
        const valueColumn = {
            source: { format: undefined /* stripped model-wide */ },
            values: [100, 0.5, 1234.56],
            objects: [
                { general: { formatString: '$#,##0' } }, // row 0
                { general: { formatString: '0.0%' } }, // row 1
                { general: { formatString: '#,##0.00' } } // row 2
            ]
        };
        ```

    - End-to-end regression: a PBIP harness workbook (calc group with a `Dynamic FS` item = `SELECTEDMEASUREFORMATSTRING()`, measures with static/dynamic/no format, a field parameter over them) driving an 8-case matrix in Power BI Desktop — kept locally under `tools/pbi-harness/` (untracked at time of writing) — is the tool of record for re-verifying this scenario class after changes to field-parameter consolidation or format-string precedence.

## Related Issues

- PR [#739](https://github.com/deneb-viz/deneb/pull/739) — the fix.
- [Reddit field report](https://www.reddit.com/r/PowerBI/comments/1vhoqs7/comment/p2u77i3/) — original repro narrative (no GitHub issue was filed).
- Issue [#517](https://github.com/deneb-viz/deneb/issues/517) — earlier general question on dynamic format strings with measures/calc groups (closed; predates this bug).
- Issue [#238](https://github.com/deneb-viz/deneb/issues/238) — field parameter support feature request (ancestor of the consolidation feature).
- Issue [#506](https://github.com/deneb-viz/deneb/issues/506) — ability to turn off `__formatted`/generated columns (adjacent support-fields feature).
- [field-parameter-multi-name-detection-2026-05-07](field-parameter-multi-name-detection-2026-05-07.md) — different bug in the same consolidation path (dropped parameter registrations due to `sourceFieldParameters[0]` indexing); same code neighborhood, different mechanism.
- [extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — adjacent support-field flag semantics guidance.
