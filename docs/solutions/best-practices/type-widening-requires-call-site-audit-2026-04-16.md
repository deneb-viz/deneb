---
title: Type widening (array to keyed record) requires a call-site audit, not just a type-check
date: 2026-04-16
category: best-practices
module: template-usermeta, app-core state, json-processing
problem_type: best_practice
component: tooling
severity: high
applies_when:
    - Widening a type from single to many (array to keyed record, scalar to array, one value to Map)
    - Refactoring a shared schema/type where multiple call sites perform state writes
    - Reviewing a PR where the compiler passes but writes construct the container from scratch
    - Adding a new key dimension (e.g. dataset name, tenant id) to an existing data shape
    - Working with Zustand or similar immutable-update stores where set() replaces shape fragments
tags:
    - typescript
    - type-widening
    - state-management
    - immutability
    - refactor-audit
    - code-review
    - cardinality
    - zustand
related_components:
    - frontend_stimulus
    - testing_framework
---

# Type widening (array to keyed record) requires a call-site audit, not just a type-check

## Context

During the `feat/template-dataset-changes` refactor ([PR #619](https://github.com/deneb-viz/deneb/pull/619)), the template usermeta type was widened from a single-array shape to a keyed-map shape to make the external template contract multi-dataset-ready:

```typescript
// Before
interface UsermetaTemplate {
    dataset: UsermetaDatasetField[];
}

// After
interface UsermetaTemplate {
    datasets: Record<string, UsermetaDatasetField[]>;
}
```

The type signature was updated everywhere. Read sites compiled cleanly. Tests passed. Then during `/ce:review`, three independent reviewer agents (correctness, adversarial, kieran-typescript) surfaced **the same class of bug at six separate state-mutation sites**: writes were replacing the whole `datasets` record instead of spreading existing entries.

The compiler accepted the code because `{ [DATASET_DEFAULT_NAME]: dataset }` is a structurally valid `Record<string, UsermetaDatasetField[]>` — it just happens to be one with every other key dropped. TypeScript has no concept of "preserve existing keys"; a one-key record is as valid as a thousand-key record.

Only `DATASET_DEFAULT_NAME` (`'dataset'`) is populated today (Power BI provides a single query; multi-dataset support is a future feature such as map-layer datasets). The bug was latent. The moment a second dataset key is introduced, every unfixed write site would silently wipe it. (session history: the plan anticipated the read-side slice in `reconcileExportDatasetFields` but did not enumerate the write-side sites — the `Object.entries().map()` pattern in `getPublishableUsermeta` was even explicitly left as an open question during planning.)

## Guidance

**Rule:** When widening a type from "one X" to "many X" (array → record, scalar → collection, single-key → multi-key), the type signature is the _easy_ part. The hard part is auditing **every write site** to confirm it preserves the other Xs it didn't mean to touch.

### Anti-pattern — replacing the whole container

```typescript
// WRONG — structurally valid, semantically destructive
metadata: {
    ...state.export.metadata,
    datasets: { [DATASET_DEFAULT_NAME]: dataset } // drops every other key
}
```

### Correct pattern — spread-preserve existing entries

```typescript
// RIGHT — preserves sibling keys
metadata: {
    ...state.export.metadata,
    datasets: {
        ...state.export.metadata?.datasets, // keep existing
        [DATASET_DEFAULT_NAME]: dataset     // overwrite this one
    }
}
```

### Checklist for type-widening PRs

1. **Grep every literal write** of the widened field. For this refactor: `datasets:\s*\{` across the affected packages.
2. For each hit, ask: _does this construct the container from scratch, or mutate one entry?_ If it's the latter, it **must** spread the existing container first.
3. Identify **iteration opportunities** — if the new type is a collection, is there a place where the old code hardcoded the one-and-only entry and the new code should iterate all entries? (See `getPublishableUsermeta` below.)
4. Add a test that writes to a non-default key, then writes to the default key, and asserts the non-default key survives. This is the only test that catches the anti-pattern at runtime — single-key tests all pass.
5. In review, treat "the type still compiles" as zero evidence the write is correct. Ask for the spread explicitly.

Per functional-programming preference (auto memory [claude]): prefer pure, spread-based updates over reassignment, and prefer `Object.entries(...).map(...)` iteration over hardcoded single-key access whenever the type admits many keys.

## Why This Matters

**TypeScript structurally cannot catch this.** `Record<string, T>` is "any string keys map to T". There is no type-level way to express "at least the keys that were there before". Phantom types, branded types, and `Exact<T>` are impractical here because we are talking about runtime object identity, not static shape.

**The failure mode is silent data loss at runtime.** The spec compiles, the tests (which exercise one dataset) pass, the visual renders, and exports look right — until a user saves a template with two datasets, triggers a dataset update, and half their template is gone with no error. There is no stack trace, no warning, no type error. The data simply isn't there when it's next read.

**It requires disciplined call-site audit, not better types.** When you widen a type to admit more possibilities, you have implicitly declared that every existing write was making a narrowing assumption. Those narrowing assumptions are now bugs. The compiler cannot tell you where they are because they were _never encoded_ — they lived in the dev's head and in the old type's shape. The only way to find them is to read each write.

This is also why three independent reviewers found the same bug: it's exactly the kind of latent issue human reviewers and adversarial agents catch and type-checkers miss.

## When to Apply

Trigger this audit any time you make one of these changes:

- **Array → Record/Map widening**: `T[]` → `Record<string, T[]>` or `Map<K, T>`
- **Scalar → collection widening**: `layout: Layout` → `layouts: Layout[]` or `Record<string, Layout>`
- **Single-key object → multi-key object**: anything that was implicitly "the one" becoming "one of many"
- **Adding a new dimension to an existing type**: introducing multi-tenant, multi-layer, multi-locale, multi-dataset, or multi-version variants on a type that was previously singular
- **Optional → required collection**: `field?: T` → `fields: T[]`, where old code patterns like `{ field: x }` now replace the array

The common thread: **the old type had an implicit cardinality-of-one that the new type lifts, and every write site was written against that implicit cardinality.**

## Examples

All code below is the fixed version from the current branch.

### Example A — `handleUpdateExportDataset`

[packages/app-core/src/state/export.ts:135-152](../../../packages/app-core/src/state/export.ts#L135-L152)

```typescript
// WRONG — pre-fix:
datasets: { [DATASET_DEFAULT_NAME]: dataset }

// RIGHT — current:
datasets: {
    ...state.export.metadata.datasets, // preserve siblings
    [DATASET_DEFAULT_NAME]: dataset
}
```

### Example B — project slice (three sites in one file)

[packages/app-core/src/state/project.ts](../../../packages/app-core/src/state/project.ts)

`handleSyncProjectData`, `setSupportFieldConfiguration`, and `initializeFromTemplate` all pass the widened field to `getUpdatedExportMetadata`. The fix pattern is consistent: spread the current record, then overwrite the one key you mean to change. Example from `handleSyncProjectData`:

```typescript
const exportMetadata = getUpdatedExportMetadata(
    state.export.metadata as UsermetaTemplate,
    {
        /* ... */
        datasets: {
            ...state.export.metadata?.datasets, // preserve siblings
            [DATASET_DEFAULT_NAME]: datasetWithConfig
        }
        /* ... */
    }
);
```

Note the read side is explicitly keyed (`state.export.metadata?.datasets?.[DATASET_DEFAULT_NAME] ?? []`). That intentional narrowness at the read site makes the write-side breadth (spread-then-overwrite) obvious.

### Example C — `getPublishableUsermeta` (iterate, don't hardcode)

[packages/json-processing/src/template-usermeta.ts:193-253](../../../packages/json-processing/src/template-usermeta.ts#L193-L253)

This is the deeper refactor. The old code processed the one-and-only dataset; the new code must iterate **all** dataset keys. A naive fix that hardcoded `DATASET_DEFAULT_NAME` would compile and pass tests but silently drop every other dataset from exported templates. The correct pattern is `Object.entries(...).map(...)`:

```typescript
datasets: (() => {
    const sourceDatasets = usermeta?.datasets ?? {
        [DATASET_DEFAULT_NAME]: []
    };
    return Object.fromEntries(
        Object.entries(sourceDatasets).map(([name, fields]) => [
            name,
            (fields ?? []).map(processField)
        ])
    );
})();
```

Key points:

- `Object.entries(sourceDatasets).map(...)` processes **every** key, not just the default.
- `Object.fromEntries(...)` rebuilds the record with all keys preserved.
- `processField` is a pure, per-field transform — composition over single-key specialisation.
- The default fallback `{ [DATASET_DEFAULT_NAME]: [] }` is applied only when `usermeta.datasets` is entirely missing, not when writing back — so the default never shadows user data.

Compare to the anti-pattern that would have compiled:

```typescript
// WRONG — hardcodes the single-key assumption the new type no longer implies
datasets: {
    [DATASET_DEFAULT_NAME]: (
        usermeta.datasets?.[DATASET_DEFAULT_NAME] ?? []
    ).map(processField);
}
```

Both shapes are `Record<string, UsermetaDatasetField[]>`. Only one of them actually publishes the user's other datasets.

### Example D — coverage grep

The audit that catches this class of bug is mechanical:

```text
Grep "datasets:\s*\{" in packages/app-core/src/state/ and packages/json-processing/src/
```

Every hit should either:

1. Spread an existing `datasets` record before overwriting a key, or
2. Construct the record fresh from iteration over all keys (Example C), or
3. Be an initializer where "fresh construction" is the intended semantics — e.g. `getNewTemplateMetadata` in `template-usermeta.ts` is correct because it is the factory for a brand-new template with no prior keys to preserve.

Any hit that does none of these three is a bug.

## Prevention

- For any PR that widens a collection type, add a **"type widening" line to the PR description** listing every write site grepped and how each was handled (spread vs. fresh construction vs. iteration).
- When reviewing such PRs, set the default mental model to **"the type check proves nothing about preservation"**.
- Ship a **non-default-key test** alongside the type change. Single-key tests will pass for both correct and broken implementations; only a test that writes two keys and asserts both survive distinguishes them.

## Related

- [docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md](../../brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md) — the requirements that drove the type widen, including the design decisions about dataset key naming and placeholder format.
- [docs/plans/2026-04-14-001-refactor-multi-dataset-template-schema-plan.md](../../plans/2026-04-14-001-refactor-multi-dataset-template-schema-plan.md) — the implementation plan (session history: the plan explicitly called out the read-side slice but did not enumerate the write-side sites; the review filled that gap).
- [docs/solutions/ui-bugs/export-dialog-empty-dataset-fields-2026-04-13.md](../ui-bugs/export-dialog-empty-dataset-fields-2026-04-13.md) — sibling bug in the same template-dataset/export subsystem. Note: its code snippets reference the pre-refactor singular `metadata.dataset` paths; the underlying diagnosis is still valid but the field names are now `metadata.datasets[DATASET_DEFAULT_NAME]`.
- [docs/solutions/logic-errors/field-parameter-multi-name-detection-2026-05-07.md](../logic-errors/field-parameter-multi-name-detection-2026-05-07.md) — the symmetric read-side case of the same cardinality-of-one hazard class. This doc covers write-side bugs introduced by a type-widening event; the field-parameter doc covers read-side bugs (`array[0]` on a plural-typed field) where no widening occurred — the type was always plural and a consumer made the cardinality-of-one assumption from day one. Different triggers, same underlying mental error.
- [PR #619](https://github.com/deneb-viz/deneb/pull/619) — the refactor PR, including the `/ce:review` synthesis that surfaced the six-site pattern.
- [PR #615](https://github.com/deneb-viz/deneb/pull/615) — prior fix that introduced `updateExportDataset`; one of the six write sites corrected in #619 (session history).
