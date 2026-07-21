---
date: 2026-04-14
topic: multi-dataset-template-structure
---

# Multi-Dataset Template and State Structure

## Problem Frame

Deneb's template infrastructure uses a singular `usermeta.dataset` (a flat array of field definitions). While Power BI only supports a single query today, future features (e.g., map layers via conditional formatting) may need additional named datasets. Since v2 is unreleased, this is the right time to restructure the template schema to support a keyed dataset map — avoiding a breaking v2→v3 schema migration later.

This change is scoped to the **template serialization format only** — the external contract that ships with v2. Internal runtime state (`state.dataset`) is unchanged and will be restructured when multi-dataset functionality is actually built. This separation keeps the blast radius small while stabilizing the schema before release.

## Requirements

**Template Usermeta Schema**

- R1. `usermeta.dataset` (array) is replaced by `usermeta.datasets` (object), where each key is a dataset name and each value is `UsermetaDatasetField[]`. The default dataset uses key `'dataset'` (matching `DATASET_DEFAULT_NAME`). Note: `TEMPLATE_USERMETA_VERSION` remains 2 — v2 is unreleased, safe to modify in-place.
- R2. The JSON schema for template validation is updated: `datasets` is an object property (not array), key validation is updated to allow the dataset-scoped placeholder pattern.

**V1 Template Migration**

- R3. V1 templates with `usermeta.dataset` (array) are migrated to `usermeta.datasets.dataset` during import. Migration must occur **before** schema validation (matching the existing pattern for legacy version and config migrations in `getValidatedTemplate`).
- R4. V1 placeholder keys (`__0__`, `__1__`, etc.) are rewritten to dataset-scoped form (`__dataset.0__`, `__dataset.1__`) during import.
- R5. A template with both `usermeta.dataset` AND `usermeta.datasets` present is treated as malformed. Note: the JSON schema's `additionalProperties: false` on `UsermetaTemplate` will reject this automatically once `dataset` is removed and `datasets` is added — no bespoke validation logic needed.

**Placeholder Scheme**

- R6. Field placeholders become dataset-scoped: `__[datasetName].[N]__` (e.g., `__dataset.0__`, `__dataset.1__`). Dot separator is used between dataset name and index to avoid ambiguity with dataset names containing underscores. This applies to export, import token substitution, and field tracking.
- R7. The placeholder key regex in the schema is updated to match the new pattern (e.g., `^__[a-zA-Z0-9_]+\.\d+__$`).
- R8. Placeholder replacement logic becomes **key-based** (matching the field's `key` property directly) rather than the current **index-based** approach (replacing by array position). This provides actual namespace isolation between datasets, not just cosmetic prefixing.

**Serialization Boundary Adapter**

- R9. Code that reads/writes `usermeta.dataset` is updated to read/write `usermeta.datasets.[datasetName]`. For the current single-dataset case, this always targets `usermeta.datasets[DATASET_DEFAULT_NAME]`. Internal state (`state.dataset` in Zustand stores) remains singular and unchanged.

## Success Criteria

- V1 templates import correctly into the new structure with placeholders migrated
- V2 templates use the new `datasets` structure natively
- All existing tests pass with the structural change (field tracking, export/import round-trip)
- A template with both `dataset` and `datasets` fails schema validation
- A template containing multiple keys in `usermeta.datasets` (e.g., `dataset` + a hypothetical second dataset) passes schema validation — confirming forward compatibility
- The single "dataset" dataset continues to work identically to current behavior for all user-facing functionality
- Internal state shape (`state.dataset`) is unchanged — no consumer of the Zustand dataset slice is modified

## Scope Boundaries

- **No new dataset types** — No spatial, map layer, or CF-driven datasets are added. Only the template serialization format changes.
- **No multi-dataset UI** — The template editor, export dialog, and field assignment UI continue to show a single dataset.
- **No internal state restructuring** — `state.dataset` in both the root visual store and app-core store remains singular. Restructuring to `state.datasets` is deferred to when multi-dataset functionality is actually built.
- **No v1→v2 migration outside of template import** — The current branch is v2 development. v1 template import is the only migration path needed.
- **No changes to Power BI data role** — `DATASET_DEFAULT_NAME` stays `'dataset'`, capabilities.json is unchanged.
- **No incremental update changes** — `performIncrementalUpdate` continues to target the single default dataset. Multi-dataset incremental updates are deferred.

## Key Decisions

- **Keep 'dataset' as the default key**: Changing to 'primary' or 'main' would ripple into capabilities.json and existing specs. Not worth the churn — future datasets will have their own descriptive keys.
- **Dot separator for placeholders**: `__dataset.0__` not `__dataset_0__`. Dot cannot appear in dataset names, making the separator unambiguous regardless of dataset name content. Natural namespace convention.
- **Dataset-scoped placeholders now**: Prevents a breaking template format change when multi-dataset actually ships. Low migration cost since only v1 templates need rewriting.
- **Key-based replacement**: Placeholder replacement matches the field's `key` property directly rather than array index. This provides real namespace isolation, not cosmetic prefixing.
- **Schema-only scope**: Template schema (external contract) changes now. Internal state restructuring (69+ references across 28+ files, two separate Zustand stores) is deferred until multi-dataset is actually needed — the blast radius is not justified for speculative preparation.
- **Error on ambiguous templates**: Templates with both `dataset` and `datasets` are rejected via the schema's existing `additionalProperties: false` constraint.
- **TabularDataset shape unchanged**: Each dataset entry remains `{ fields, values }`. Future dataset types (spatial etc.) will be addressed when relevant.

## Dependencies / Assumptions

- V2 templates are not in the wild — modifying the v2 schema in-place is safe. No workspace packages are published to npm with the current v2 template types.
- All v1 templates use `usermeta.dataset` as a flat `UsermetaDatasetField[]` array.
- V1 placeholders follow the `__[N]__` pattern (sequential numeric).

## Outstanding Questions

### Deferred to Planning

- [Affects R6][Technical] Final regex pattern for dataset-scoped placeholders — `^__[a-zA-Z0-9_]+\.\d+__$` is proposed but needs validation against edge cases (e.g., dataset names with leading/trailing underscores).
- [Affects R9][Technical] How `getPublishableUsermeta` (which uses dynamic key access `usermeta?.[DATASET_DEFAULT_NAME]`) and `getUpdatedExportMetadata` transition to the new `usermeta.datasets` structure.
- [Affects R8][Technical] Whether `getTemplateReplacedForDataset` needs a full rewrite for key-based replacement or can be adapted incrementally from the current index-based approach.

## Next Steps

-> `/ce:plan` for structured implementation planning
