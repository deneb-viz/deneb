---
title: Export dialog shows empty dataset fields
date: 2026-04-13
last_updated: 2026-04-16
category: ui-bugs
module: app-core
problem_type: ui_bug
component: tooling
symptoms:
  - Export dialog Dataset section renders empty despite fields being present in the dataset
  - Issue only manifests after creating a spec from a template with an empty dataset (e.g. the [empty] template)
  - First open of export dialog after fresh load works; subsequent opens after spec creation show empty
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - export
  - template-dataset
  - zustand
  - modal-dialog
  - remap-removal
  - field-tracking
---

> **Path drift note (2026-04-16, [PR #619](https://github.com/deneb-viz/deneb/pull/619)):** The template schema was widened from `usermeta.dataset: UsermetaDatasetField[]` to `usermeta.datasets: Record<string, UsermetaDatasetField[]>`. The code snippets and path references below still use the pre-refactor singular form (`createMetadata.dataset`, `export.metadata.dataset`). In current source those are `createMetadata.datasets[DATASET_DEFAULT_NAME]` and `export.metadata.datasets[DATASET_DEFAULT_NAME]`. The internal `state.dataset` / `fieldUsage.dataset` paths were deliberately kept singular and are unchanged. The underlying diagnosis and fixes are still valid. See [best-practices/type-widening-requires-call-site-audit](../best-practices/type-widening-requires-call-site-audit-2026-04-16.md) for the audit pattern that surfaced in the same refactor.

# Export dialog shows empty dataset fields

## Problem

The export dialog's dataset field table rendered empty when the user had created their spec from a template with no dataset fields (e.g. the built-in `[empty]` Vega-Lite template). Fields were correctly tracked and tokenized internally but never displayed. This also exposed several related issues from the incomplete removal of the Remap dialog feature (#486).

## Symptoms

- Export dialog opens and completes tokenization but the Dataset section shows no field rows
- The issue is conditional: only occurs after the user creates a spec from a template whose `create.metadata.dataset` is `[]`
- Fields not referenced in the spec (used for dataset granularity) were missing from export metadata even when the primary bug was bypassed

## What Didn't Work

- **Initial hypothesis: missing sync from fieldUsage to export.metadata** - Adding `reconcileExportDatasetFields` after tokenization in `handleProcessing` was necessary but insufficient. The guard bug in `TemplateDataset` blocked rendering regardless of whether the data was correctly populated.
- **Using `getRemapEligibleFields` for fresh field generation** - This only returns fields where `isInSpecification === true`, excluding fields added purely for dataset granularity. Replaced with `getDatasetTemplateFieldsFromMetadata` which includes all dataset fields.

## Solution

Four bugs fixed across the export pipeline:

### 1. TemplateDataset guard checked wrong data source

The empty-check guard was hardcoded to `createMetadata.dataset` regardless of the component's `datasetRole` prop:

```typescript
// Before (broken): always checks create metadata
const { dataset } = createMetadata || {};
if (dataset?.length === 0 || 0) {
    return <></>;
}

// After: checks the role-appropriate computed rows
if (tableBody.length === 0) {
    return <></>;
}
```

`tableBody` is already computed from the correct data source via `getTableFieldRows(datasetRole)`, so this guard now works for all roles.

### 2. Export processing never synced tracked fields back to export.metadata.dataset

`handleProcessing` ran field tracking and tokenization but never wrote results to `export.metadata.dataset` (which `TemplateDataset` reads for the `'export'` role). Added `updateExportDataset` action to the export slice and called it after tokenization using `getDatasetTemplateFieldsFromMetadata` (all fields, not just spec-referenced) with `reconcileExportDatasetFields` to preserve user-edited properties.

### 3. Dataset field changes while dialog is open didn't trigger reprocessing

Changed the `useEffect` dependency from `[]` to `[datasetFields]` with an `AbortController` pattern for cancellation:

```typescript
useEffect(() => {
    const abort = new AbortController();
    handleProcessing(abort.signal);
    return () => abort.abort();
}, [datasetFields]);
```

After each `await` in `handleProcessing`, the signal is checked — if a newer effect has started, the stale run abandons without writing to the store. A try/catch ensures worker failures reset `exportProcessingState` to `'None'` so the dialog doesn't lock.

### 4. Incomplete Remap dialog removal (#486)

- Removed `'Remap'` from the `ModalDialogRole` type union (compile-time enforcement)
- Fixed `handleSetRemapState` in `interface.ts` (still assigned `'Remap'` via `isMappingDialogRequired`)
- Fixed `handleApplyTrackingChanges` in `field-usage.ts` (same issue)
- Removed dead Remap branches from `shouldPreventClose`, `getDialogContent`, `getDialogPrimaryButton`
- Fixed `shouldPreventClose` stale closure: added missing `exportProcessingState` dependency and narrowed lock to `'Tokenizing'` state only (previously `!== 'None'` blocked close after completion)

## Why This Works

The root cause was a combination of:

1. **Wrong data source in guard**: `TemplateDataset` is role-polymorphic but its empty-guard was role-agnostic, checking `createMetadata` even for the export role. When the `[empty]` template set `createMetadata.dataset = []`, the guard killed rendering for all roles.

2. **Missing data pipeline step**: The export flow tracked and tokenized fields (updating `fieldUsage.dataset`) but never propagated to `export.metadata.dataset`. The `handleUpdateDataset` action in the dataset slice does this reconciliation on Power BI data updates, but the export dialog's `handleProcessing` was a separate flow that missed this step.

3. **Dead code with live side effects**: The Remap dialog was disabled at the UI level (#486) but its state assignment paths remained active, allowing `modalDialogRole` to be set to `'Remap'` — producing blank, potentially undismissable dialogs.

## Prevention

- When removing a feature, remove its type union member first — the compiler surfaces all remaining references
- Role-polymorphic components should not have role-specific guards that reference a single role's data source
- Async effects that can re-fire need cancellation (AbortController) and error handling (try/catch with state reset)

## Related Issues

- [#614](https://github.com/deneb-viz/deneb/issues/614) - Export dataset fields empty
- [#486](https://github.com/deneb-viz/deneb/issues/486) - Remap dialog removal (tracking now only used for export)
