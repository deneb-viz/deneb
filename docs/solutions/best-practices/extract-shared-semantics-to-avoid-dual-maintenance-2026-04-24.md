---
title: Extract shared semantics into pure helpers when parallel paths must agree
date: 2026-04-24
category: best-practices
module: app-core/settings-pane
problem_type: best_practice
component: tooling
severity: medium
applies_when:
    - Two or more code paths must interpret the same application state identically (e.g. an indexer and a renderer)
    - Duplicated logic is currently guarded only by a "keep in sync" / "mirrors the logic in..." comment
    - The interpretation is pure — inputs in, decision out, no side effects
    - A reviewer flags drift risk between a search/index/engine path and a render path
    - A refactor introduces a second consumer of logic that previously lived inside a render path (search indexing, export, telemetry, serialisation)
tags:
    - typescript
    - pure-functions
    - shared-helpers
    - code-duplication
    - drift-prevention
    - dual-maintenance
    - functional-programming
    - refactor-audit
    - code-review
    - settings-pane
    - support-fields
related_components:
    - documentation
    - testing_framework
resolution_type: code_fix
---

# Extract shared semantics into pure helpers when parallel paths must agree

## Context

The settings-pane search feature in `@deneb-viz/app-core` had two independent paths that both needed to classify "which support-field flags apply to a given dataset field":

- **Search index path** — `packages/app-core/src/features/settings-pane/search/dataset-indexer.ts` (builds the descriptor set the match engine searches).
- **Render path** — `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx` (produces the actual Fluent tree the user sees).

Both independently reimplemented the same two-step pipeline: (1) resolve the field's `SupportFieldFlags` via explicit config or `resolveFieldDefaults`, then (2) derive applicable flag keys from role, measure/parameter status, `highlightEnabled`, and `consolidateFieldParameters`. The only coupling between the two sites was a JSDoc comment on the indexer's private helpers:

> `// Mirrors the logic inside DatasetSettings — keep the two in sync.`

A comment is not a contract. If a flag category, a role, or a condition on `highlightEnabled` changed on one side, search results would show or hide rows that did not match the rendered tree — a subtle drift bug that only surfaces for specific query + data combinations.

## Guidance

When two code paths must interpret the same state identically, extract a pure shared helper. Do not rely on cross-referencing comments.

- Treat **"keep in sync" / "mirrors" comments as a design smell** — they flag structural duplication the author already noticed but didn't resolve. The discipline required to maintain them does not compound; the drift risk does.
- Push the classification into a **pure function** — no React, no store access, no side effects, inputs in → decision out. Both consumers import it. Functional-programming discipline pays off here: pure helpers are trivially testable, composable, and immune to render-vs-index ordering concerns. *(auto memory [claude]: user methodology prefers pure functions, immutability, composition.)*
- Let the **function signature and the test suite be the contract**. The compiler reads signatures; it does not read comments.
- Prefer **behavioural tests** over structural ones — assert the observable outcome ("measure + highlight enabled → applicable flags include the highlight flag"), not the internal object shape. *(auto memory [claude]: tests match behaviour, not implementation.)*

## Why This Matters

Drift bugs between a search/index layer and a render layer are pernicious for three reasons:

1. **Subtle surface area.** They only manifest for specific combinations of query text, data shape, legacy spec, and feature toggles. Normal smoke tests miss them because each side's tests pass in isolation.
2. **Non-enforcing contract.** The compiler doesn't read comments. A reviewer catching the drift during review is the only defence, and reviewers miss things — especially when the "keep in sync" comment sits in a file the reviewer didn't open.
3. **Single-sided tests don't help.** Tests on the indexer pass; tests on the renderer pass; but nothing asserts they *agree*. You need a cross-cutting test — or, better, a single source of truth that both consume.

Evidence from the same review round reinforced the lesson: two adjacent findings in the PR were *accidental* instances of exactly this hazard. The match engine exposed `datasetTree` even when no search was active (the render path read that as "filter active" and froze the tree chevrons). The match engine dropped dataset heading matches when the field list was empty while still returning a non-null `datasetTree` (inconsistent engine ↔ renderer coupling). The flag-resolution duplication is the **structural** form of the same class of bug. Fixing the structure removes a category of future regressions, not just a single instance.

## When to Apply

- You see a JSDoc or inline comment referencing a sibling file with "keep in sync" / "mirrors" / "match the logic in…".
- A refactor introduces a second consumer of logic that previously lived inside a render path — search indexing, export, serialisation, telemetry.
- An **engine layer** (classifier, indexer, filter, matcher) and a **renderer** both need to derive the same boolean/enum from the same state.
- A feature flag or role enum is read in more than one place to make the same decision.

Rule of thumb: if you can write a one-sentence invariant that *both* sites must satisfy ("a legacy field with `role=grouping` and highlight disabled has applicable flags `[format, formatted]`"), that invariant deserves a pure function and a test — not a comment.

## Examples

### Before

The indexer had private helpers guarded by a "keep in sync" comment:

```ts
// packages/app-core/src/features/settings-pane/search/dataset-indexer.ts

/**
 * Resolve the flag set that will actually drive the rendered UI for a
 * single source field. Mirrors the logic inside `DatasetSettings` —
 * keep the two in sync.
 */
const resolveFieldFlags = (
    field: DatasetField,
    config: SupportFieldConfiguration,
    name: string,
    masterSettings: SupportFieldMasterSettings,
    isLegacy: boolean
): SupportFieldFlags => {
    const explicit = config[name];
    if (explicit) return explicit;
    return resolveFieldDefaults({
        masterSettings,
        fieldRole: field.role ?? 'grouping',
        isLegacy
    });
};

/**
 * Produce the list of applicable flag keys for a field given its role
 * and the current consolidation setting. Mirrors the selection logic
 * inside the `DatasetSettings` component render.
 */
const resolveApplicableFlagKeys = (/* ...role / baseFlags / isTreatedAs / isParameter → getApplicableFlags */);
```

`DatasetSettings` had equivalent logic inline — once in a `useMemo` for the flag set, once inside a `.map()` in the render body for applicability. Two copies, one comment, zero cross-cutting tests.

### After

Extracted into a shared utils module both sites already imported for related helpers:

```ts
// packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts

export const resolveFieldFlagsForConfig = (
    field: DatasetField,
    config: SupportFieldConfiguration,
    name: string,
    masterSettings: SupportFieldMasterSettings,
    isLegacy: boolean
): SupportFieldFlags => {
    const explicit = config[name];
    if (explicit) return explicit;
    return resolveFieldDefaults({
        masterSettings,
        fieldRole: field.role ?? 'grouping',
        isLegacy
    });
};

export type FieldApplicability = {
    isMeasure: boolean;
    isFieldParameter: boolean;
    isTreatedAs: boolean;
    isParameter: boolean;
    applicableFlags: (keyof SupportFieldFlags)[];
};

export const resolveFieldApplicability = (input: {
    field: DatasetField;
    fieldFlags: SupportFieldFlags;
    highlightEnabled: boolean;
    consolidateFieldParameters: boolean;
}): FieldApplicability => {
    const { field, fieldFlags, highlightEnabled, consolidateFieldParameters } = input;
    const isMeasure = (field.role ?? 'grouping') === 'aggregation';
    const isFieldParameter = field.role === 'field-parameter';
    const baseFlags =
        isMeasure || isFieldParameter
            ? highlightEnabled
                ? MEASURE_FLAGS
                : COLUMN_FLAGS
            : COLUMN_FLAGS;
    const isTreatedAs = fieldFlags.treatAsParameter === true;
    const isParameter = isFieldParameter || isTreatedAs;
    const applicableFlags = getApplicableFlags(
        baseFlags,
        isFieldParameter,
        isTreatedAs,
        isParameter,
        consolidateFieldParameters
    );
    return { isMeasure, isFieldParameter, isTreatedAs, isParameter, applicableFlags };
};
```

Both the indexer and `DatasetSettings` now import these; the indexer's two private helpers and the `// keep the two in sync` JSDoc were deleted outright. The indexer uses only `applicableFlags`; the render path destructures the full applicability record because it also needs the role booleans for its icon and tooltip logic — returning both from one call avoids recomputation on either side.

Notice the `(keyof SupportFieldFlags)[]` return type: a narrow keyed union, not `string[]`. A typo or stale flag name at a call site fails compilation, which is exactly the kind of precise typing that makes the extracted helper safer than the inline duplication it replaced.

### Tests

Ten behavioural tests in [`dataset-settings.test.ts`](../../../packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.ts) cover both helpers:

- Explicit-config short-circuit (caller's config entry returned verbatim)
- Defaults fallback (explicit-absent → `resolveFieldDefaults` output)
- Legacy vs current classification produces different default sets
- Measure + highlight enabled → every `MEASURE_FLAG` appears
- Measure + highlight disabled → collapses to `COLUMN_FLAGS`
- Grouping role always collapses to `COLUMN_FLAGS`
- `field-parameter` role classified as parameter
- `treatAsParameter: true` lifts a grouping field into parameter classification
- Consolidation appends `treatAsParameter` for non-parameter fields
- Consolidation + parameter classification appends `names`

Assertions target observable outcomes, not object shape — per the project's "tests match behaviour, not implementation" principle.

**No cross-site consistency test was added, and none is needed.** Before the extraction, such a test would have been the minimum viable drift guard (assert the indexer and the renderer produce the same applicability for the same input). After the extraction, both sites consume the same helper by import; the shared import *is* the guarantee. Writing a cross-site test at this point would assert that `f(x) === f(x)` — a tautology.

The contract is now the function signature plus the tests. The comment is gone; drift between the two sites is structurally prevented.

## Related

- [Type widening (array to keyed record) requires a call-site audit, not just a type-check](./type-widening-requires-call-site-audit-2026-04-16.md) — sibling best-practice on call-site-drift prevention. That doc uses narrow `const`-literal types to force compile-time agreement across sites; this doc uses a shared pure helper to make duplication impossible by construction. Complementary: both advocate "make drift structurally impossible rather than trusting comments or reviewer discipline."
