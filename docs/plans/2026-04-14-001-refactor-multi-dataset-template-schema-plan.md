---
title: "refactor: Multi-dataset template schema"
type: refactor
status: active
date: 2026-04-14
origin: docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md
---

# refactor: Multi-dataset template schema

## Overview

Restructure the template usermeta from singular `usermeta.dataset` (flat array) to plural `usermeta.datasets` (keyed object), with dataset-scoped placeholders using dot separators (`__dataset.0__`). Internal runtime state is unchanged — only the template serialization format and related pipeline code are modified. This stabilizes the external template contract before v2 ships.

## Problem Frame

The template schema currently supports only one dataset. Future multi-dataset features would require a breaking schema change. Since v2 is unreleased, restructuring now avoids a v2→v3 migration later. The scope is limited to the template serialization format — internal state (`state.dataset`) is untouched. (see origin: `docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md`)

## Requirements Trace

- R1. `usermeta.dataset` (array) → `usermeta.datasets` (object keyed by dataset name). Default key: `'dataset'`
- R2. JSON schema auto-regenerated from updated TypeScript types; key regex allows dot-separated placeholders
- R3. V1 `usermeta.dataset` migrated to `usermeta.datasets.dataset` during import, before schema validation
- R4. V1 placeholders `__0__` rewritten to `__dataset.0__` during import
- R5. Templates with both `dataset` and `datasets` rejected via `additionalProperties: false`
- R6. Placeholders become `__[datasetName].[N]__` with dot separator
- R7. Schema key regex updated: `^__[a-zA-Z0-9_]+\.\d+__$`
- R8. Placeholder replacement becomes key-based (matching field's `key` property) not index-based
- R9. Serialization boundary adapter: code reading/writing `usermeta.dataset` updated to `usermeta.datasets[DATASET_DEFAULT_NAME]`

## Scope Boundaries

- **No internal state restructuring** — `state.dataset` in Zustand stores remains singular
- **No incremental update changes** — `performIncrementalUpdate` continues to target single dataset
- **No new dataset types** — only structural foundation changes
- **No multi-dataset UI** — template editor, export dialog, field assignment show single dataset
- **No capabilities.json changes** — `DATASET_DEFAULT_NAME` stays `'dataset'`

## Context & Research

### Relevant Code and Patterns

**Type and schema generation:**
- `packages/template-usermeta/src/types.ts` — `UsermetaTemplate` type (schema source of truth)
- `packages/template-usermeta/bin/generate-project-schema.js` — `ts-json-schema-generator` auto-generates JSON schema from types
- `packages/template-usermeta/src/constants.ts` — `TEMPLATE_USERMETA_VERSION`

**Placeholder pipeline (three generation sites — must all be updated):**
- `packages/data-core/src/lib/field/tokenization.ts` — `getPlaceholderKey(i)` (canonical)
- `packages/data-core/src/lib/field/extraction.ts` — hardcoded `` `__${i}__` `` (line 29)
- `packages/data-core/src/lib/field/template-metadata.ts` — hardcoded `` `__${i}__` `` (line 87)

**Import pipeline (order matters):**
1. `getTemplateResolvedForLegacyVersions` (patches v1.0 providerVersion)
2. `getTemplateResolvedForLegacyConfig` (moves v1.7 config into usermeta)
3. **[NEW: dataset migration goes here]** — before schema validation
4. Schema validation via AJV-compiled validator
5. `getTemplateResolvedForPlaceholderAssignment` (splits spec/config)

**Export pipeline:**
- `getPublishableUsermeta` — reads `usermeta?.[DATASET_DEFAULT_NAME]` (dynamic key access)
- `getExportTemplate` — orchestrates tokenization and usermeta injection
- `getNewTemplateMetadata` — creates blank template with `dataset: []`

**Field tracking:**
- `packages/json-processing/src/lib/spec-processing/workers/field-tracking.ts` — assigns `placeholder: getPlaceholderKey(fieldIndex)` dynamically

**Built-in templates (8 files):**
- `packages/app-core/src/catalog/vega-lite/vl-bar-simple.ts`, `vl-bar-interactive.ts`, `vl-empty.ts`, `vl-empty-config.ts`
- `packages/app-core/src/catalog/vega/v-bar-simple.ts`, `v-bar-interactive.ts`, `v-empty.ts`, `v-empty-config.ts`
- All embed `dataset: UsermetaDatasetField[]` with `__0__`/`__1__` keys and spec references

### Institutional Learnings

- **Export pipeline awareness** (`docs/solutions/ui-bugs/export-dialog-empty-dataset-fields-2026-04-13.md`): Field tracking and export metadata are separate pipelines with a reconciliation step (`reconcileExportDatasetFields`). Changes must maintain this sync.

## Key Technical Decisions

- **Dot separator for placeholders**: `__dataset.0__` not `__dataset_0__`. Dot cannot appear in dataset names, making parsing unambiguous. Regex: `^__[a-zA-Z0-9_]+\.\d+__$`.
- **Key-based replacement**: `getTemplateReplacedForDataset` changes from `dataset.reduce((result, value, index) => getFieldPattern(index))` to matching each field's `key` property directly. This provides real namespace isolation.
- **Consolidate placeholder generation**: Three sites hardcode the `__N__` pattern — consolidate all through `getPlaceholderKey` before changing the format. This prevents inconsistency.
- **Migration before validation**: New `getTemplateResolvedForLegacyDataset` function runs in the import pipeline before schema validation, matching the pattern of existing legacy migrations.
- **Schema auto-generates from types**: Changing `UsermetaTemplate.dataset` to `UsermetaTemplate.datasets` and running `npm run build:schema` in `packages/template-usermeta` produces the correct JSON schema automatically. No hand-editing needed.
- **`getPlaceholderKey` gains a dataset name parameter**: Signature becomes `getPlaceholderKey(datasetName: string, index: number)`. Callers currently pass `DATASET_DEFAULT_NAME` as the dataset name.

## Open Questions

### Resolved During Planning

- **`getPublishableUsermeta` dynamic key access**: Currently reads `usermeta?.[DATASET_DEFAULT_NAME]` (equals `usermeta['dataset']`). Changes to `usermeta?.datasets?.[DATASET_DEFAULT_NAME]` — resolves the accidental coupling between property name and constant value.
- **Schema key regex**: `^__[a-zA-Z0-9_]+\.\d+__$` — allows alphanumeric + underscore dataset names, dot separator, numeric index. Validated against `__dataset.0__`, `__map_layer.0__`, rejects `__0__` (no dot).
- **`metaVersion` range**: The `@minimum 1` / `@maximum 2` JSDoc annotations on `UsermetaDeneb.metaVersion` remain unchanged — v2 is being modified in-place, not bumped.

- **`reconcileExportDatasetFields` signature**: Unchanged — callers extract `metadata.datasets[DATASET_DEFAULT_NAME]` and pass the dataset array. The function itself continues to receive `UsermetaDatasetField[]` without needing a dataset name parameter.
- **Field tracking placeholder assignment**: Field tracking MUST generate dataset-scoped placeholders (`__dataset.N__`), not internal `__N__`. Reason: `getPublishableUsermeta` propagates `tracked?.placeholder` directly to `item.key` in the exported template (line 227). If tracking uses `__N__` while the schema requires `__dataset.N__`, exports would fail schema validation.

### Deferred to Implementation

- **`ts-json-schema-generator` cross-package resolution**: Whether the generator follows `@deneb-viz/data-core/field` import paths when generating the schema from `template-usermeta/src/types.ts`. Verify after `npm run build:schema` that the `@pattern` annotation from `data-core/types.ts` appears in the generated schema.

## Implementation Units

- [ ] **Unit 1: Consolidate placeholder generation through `getPlaceholderKey`**

**Goal:** Eliminate hardcoded `` `__${i}__` `` patterns so there's a single function to change.

**Requirements:** Prerequisite for R6

**Dependencies:** None

**Files:**
- Modify: `packages/data-core/src/lib/field/tokenization.ts`
- Modify: `packages/data-core/src/lib/field/extraction.ts`
- Modify: `packages/data-core/src/lib/field/template-metadata.ts`
- Test: `packages/data-core/src/lib/field/__tests__/tokenization.test.ts`
- Test: `packages/data-core/src/lib/field/__tests__/template-metadata.test.ts`
- Test: `packages/data-core/src/lib/field/__tests__/extraction.test.ts`

**Approach:**
- Replace inline `` `__${i}__` `` in `extraction.ts` (line 29) and `template-metadata.ts` (line 87) with calls to `getPlaceholderKey(i)`
- Verify existing tests still pass — this is a no-behavior-change refactor

**Execution note:** Characterization-first — run existing tests to confirm they pass before and after the consolidation.

**Patterns to follow:**
- `field-tracking.ts` line 230 already calls `getPlaceholderKey(fieldIndex)` — follow this pattern

**Test scenarios:**
- Happy path: `getDatasetTemplateFieldsFromMetadata` with 3 fields → produces `__0__`, `__1__`, `__2__` keys (unchanged behavior)
- Happy path: `toUsermetaDatasetFields` with 2 entries → produces `__0__`, `__1__` keys (unchanged behavior)
- Integration: Full export round-trip produces identical output before and after consolidation

**Verification:**
- All existing tests pass without modification
- Grep confirms no remaining inline `__${i}__` patterns outside `getPlaceholderKey`

---

- [ ] **Unit 2: Update `getPlaceholderKey` to dataset-scoped format**

**Goal:** Change placeholder generation from `__N__` to `__datasetName.N__` format.

**Requirements:** R6, R7

**Dependencies:** Unit 1

**Files:**
- Modify: `packages/data-core/src/lib/field/tokenization.ts`
- Modify: `packages/data-core/src/lib/field/extraction.ts` (pass dataset name)
- Modify: `packages/data-core/src/lib/field/template-metadata.ts` (pass dataset name)
- Test: `packages/data-core/src/lib/field/__tests__/tokenization.test.ts`
- Test: `packages/data-core/src/lib/field/__tests__/template-metadata.test.ts`
- Test: `packages/data-core/src/lib/field/__tests__/extraction.test.ts`

**Approach:**
- Add `datasetName` parameter to `getPlaceholderKey`: signature becomes `(datasetName: string, index: number) => string`
- Output format: `__${datasetName}.${index}__`
- Update `getEscapedReplacerPattern` if needed (dot needs escaping in regex)
- Update all callers to pass `DATASET_DEFAULT_NAME` as the dataset name
- Update `getDatasetTemplateFieldsFromMetadata` and `toUsermetaDatasetFields` to accept and forward a dataset name parameter

**Patterns to follow:**
- Existing `getPlaceholderKey` pattern — extend, don't replace

**Test scenarios:**
- Happy path: `getPlaceholderKey('dataset', 0)` → `'__dataset.0__'`
- Happy path: `getPlaceholderKey('dataset', 5)` → `'__dataset.5__'`
- Happy path: `getPlaceholderKey('map_layer', 0)` → `'__map_layer.0__'`
- Edge case: `getPlaceholderKey('dataset', -3)` → `'__dataset.3__'` (abs applied, matching existing behavior)
- Happy path: `getDatasetTemplateFieldsFromMetadata` with 3 fields → produces `__dataset.0__`, `__dataset.1__`, `__dataset.2__`
- Happy path: `toUsermetaDatasetFields` with dataset name 'dataset' → produces dot-separated keys
- Edge case: `getEscapedReplacerPattern('__dataset.0__')` → properly escaped regex (dot literal, not wildcard)

**Verification:**
- All placeholder generation produces `__datasetName.N__` format
- Existing tokenizer and remapper tests updated and passing with new format

---

- [ ] **Unit 3: Update `UsermetaTemplate` type and regenerate schema**

**Goal:** Change the template type from `dataset: UsermetaDatasetField[]` to `datasets: Record<string, UsermetaDatasetField[]>` and update the key regex.

**Requirements:** R1, R2, R5, R7

**Dependencies:** Unit 2 (placeholder format must be finalized)

**Files:**
- Modify: `packages/template-usermeta/src/types.ts`
- Modify: `packages/data-core/src/lib/field/types.ts` (key pattern annotation)
- Regenerate: `packages/template-usermeta/dist/schema.deneb-template-usermeta.json` (via `npm run build:schema`)

**Approach:**
- In `UsermetaTemplate`, replace `dataset: UsermetaDatasetField[]` with `datasets: Record<string, UsermetaDatasetField[]>`
- Add explicit `@additionalProperties false` JSDoc annotation to `UsermetaTemplate` (currently relies on implicit `ts-json-schema-generator` default — make it explicit as a tripwire against config changes, matching the pattern on `UsermetaInteractivity` and `UsermetaDeneb`)
- Update the `@pattern` JSDoc annotation on `UsermetaDatasetField.key` from `^__[a-zA-Z0-9]+__$` to `^__[a-zA-Z0-9_]+\.\d+__$`
- Run `npm run build:schema` in `packages/template-usermeta` to regenerate the JSON schema
- Verify the generated schema has `datasets` as an object property with `additionalProperties` allowing `UsermetaDatasetField[]` values
- Verify the generated schema has `additionalProperties: false` on `UsermetaTemplate` (explicit annotation ensures this)
- Verify the `@pattern` from `data-core/types.ts` propagated into the generated schema (grep for old pattern to confirm absence)
- Note: `Record<string, T[]>` produces `additionalProperties` in the schema, which allows any string key for dataset names. Dataset name validation (alphanumeric + underscore only) is enforced at import time, not by the schema — document this in the approach

**Patterns to follow:**
- Existing type → schema generation pipeline via `ts-json-schema-generator`

**Test scenarios:**
- Happy path: Generated schema accepts `{ datasets: { dataset: [{ key: "__dataset.0__", name: "Field", type: "text" }] } }`
- Happy path: Generated schema accepts `{ datasets: { dataset: [...], mapLayer: [...] } }` (forward compatibility)
- Error path: Generated schema rejects `{ dataset: [{ key: "__0__", ... }] }` (old singular form)
- Error path: Generated schema rejects `{ datasets: { dataset: [{ key: "__0__", ... }] } }` (old key format)
- Edge case: Generated schema rejects template with both `dataset` and `datasets` (via `additionalProperties: false`)

**Verification:**
- `npm run build:schema` completes
- Schema validation tests updated and passing with new structure

---

- [ ] **Unit 4: V1 template migration in import pipeline**

**Goal:** Add legacy migration that converts `usermeta.dataset` to `usermeta.datasets.dataset` and rewrites V1 placeholders, running before schema validation.

**Requirements:** R3, R4

**Dependencies:** Unit 3 (new schema must exist)

**Files:**
- Modify: `packages/json-processing/src/template-usermeta.ts`
- Test: `packages/json-processing/src/__test__/template-usermeta.test.ts`

**Approach:**
- Create `getTemplateResolvedForLegacyDataset(template)` function:
  - If template has `usermeta.dataset` (array) and NOT `usermeta.datasets`: wrap into `{ datasets: { [DATASET_DEFAULT_NAME]: dataset } }`, remove `dataset` property, rewrite placeholder keys from `__N__` to `__${DATASET_DEFAULT_NAME}.N__`
  - If template has `usermeta.datasets` already: pass through unchanged
  - If template has both: pass through unchanged (schema validation will reject via `additionalProperties: false`)
- Insert the call in `getValidatedTemplate` after `getTemplateResolvedForLegacyConfig` and before `getTemplateMetadata` / schema validation — matching the existing legacy migration pattern
- The placeholder rewriting in the migration must also search-and-replace `__N__` references in the spec body (not just the field key), converting them to `__${DATASET_DEFAULT_NAME}.N__`
- **Validation flow note:** The JSON schema only validates the v2 `datasets` shape — it does NOT need version-discriminated logic (if metaVersion=1 then `dataset`, if metaVersion=2 then `datasets`). This works because `getValidatedTemplate` is the sole validation entry point (called only from `import-dropzone.tsx`) and migration always runs before validation. By the time the schema validator executes, any v1 template has already been converted to v2 form. Built-in catalog templates are TypeScript objects that bypass schema validation entirely and are updated to v2 format in Unit 7.

**Patterns to follow:**
- `getTemplateResolvedForLegacyVersions` and `getTemplateResolvedForLegacyConfig` in the same file — follow the same pure-function pattern

**Test scenarios:**
- Happy path: V1 template with `usermeta.dataset: [{key: "__0__", name: "Sales", type: "numeric"}]` → migrated to `usermeta.datasets.dataset: [{key: "__dataset.0__", name: "Sales", type: "numeric"}]`
- Happy path: V1 template with spec containing `"field": "__0__"` → spec updated to `"field": "__dataset.0__"`
- Happy path: V1 template with multiple fields → all placeholders migrated sequentially
- Happy path: V2 template with `usermeta.datasets` → passes through unchanged
- Edge case: V1 template with empty `dataset: []` → migrated to `datasets: { dataset: [] }`
- Edge case: V1 template with compound placeholder `__1____highlight` in spec → migrated to `__dataset.1____highlight` (support field suffix preserved, not treated as separate placeholder)
- Edge case: V1 template with compound placeholders `__0____format` and `__0____formatted` → both migrated correctly
- Edge case: V1 template with 11+ fields (indices 0–10) → all placeholders migrated correctly, no partial matches between `__1__` and `__10__` (use `getEscapedReplacerPattern`-based regex; process replacements in reverse index order to prevent `__1__` matching within `__10__`)
- Edge case: Vega expression string `datum['__0__']` in spec → migrated to `datum['__dataset.0__']`
- Integration: Full V1 import round-trip: migrate → validate → resolve for assignment → all steps succeed
- Integration: Migration runs before schema validation — verified by a V1 template that would fail the new schema without migration

**Verification:**
- V1 templates import successfully through the full pipeline
- V2 templates continue to import without modification
- All existing import tests pass (updated for new structure)

---

- [ ] **Unit 5: Update export pipeline and serialization boundary**

**Goal:** Update all code that reads/writes `usermeta.dataset` to use `usermeta.datasets[DATASET_DEFAULT_NAME]`.

**Requirements:** R9

**Dependencies:** Unit 3 (type must be updated)

**Files:**
- Modify: `packages/json-processing/src/template-usermeta.ts` (`getPublishableUsermeta`, `getNewTemplateMetadata`, `getExportTemplate`)
- Modify: `packages/json-processing/src/template-dataset.ts`
- Modify: `packages/app-core/src/state/project.ts` (3 access sites: `initializeFromTemplate`, `setSupportFieldConfiguration`, `handleSyncProjectData`)
- Modify: `packages/app-core/src/state/dataset.ts` (`reconcileExportDatasetFields` — receives dataset array from `metadata.datasets[DATASET_DEFAULT_NAME]` instead of `metadata.dataset`; signature unchanged, caller extracts the right dataset)
- Modify: `packages/app-core/src/state/export.ts` (`handleUpdateExportDataset` — spreads `dataset` on metadata, must change to write into `datasets[DATASET_DEFAULT_NAME]`)
- Modify: `packages/app-core/src/features/project-create/components/create-button.tsx`
- Modify: `packages/app-core/src/features/project-export/components/export-pane.tsx`
- Modify: `packages/app-core/src/components/template-metadata/data-name-column-field.tsx` (string selector `${DATASET_DEFAULT_NAME}.${index}.name` → `datasets.${DATASET_DEFAULT_NAME}.${index}.name` — TypeScript cannot catch this)
- Modify: `packages/app-core/src/components/template-metadata/data-description-column-field.tsx` (same string selector pattern)
- Test: `packages/json-processing/src/__test__/template-usermeta.test.ts`
- Test: `packages/json-processing/src/__test__/template-dataset.test.ts`

**Approach:**
- `getNewTemplateMetadata`: change `dataset: []` to `datasets: { [DATASET_DEFAULT_NAME]: [] }`
- `getPublishableUsermeta`: change read path from `usermeta?.[DATASET_DEFAULT_NAME]` to `usermeta?.datasets?.[DATASET_DEFAULT_NAME]`; change output structure from `{ ...usermeta, dataset: [...] }` to `{ ...usermeta, datasets: { [DATASET_DEFAULT_NAME]: [...] } }` (nested object, not simple rename)
- `handleUpdateExportDataset` in `export.ts`: change from spreading `dataset` directly on metadata to writing into `datasets[DATASET_DEFAULT_NAME]`
- `reconcileExportDatasetFields`: signature unchanged — callers extract `metadata.datasets[DATASET_DEFAULT_NAME]` and pass the array
- Deep path selectors in `data-name-column-field.tsx` and `data-description-column-field.tsx`: update from `${DATASET_DEFAULT_NAME}.${index}.name` to `datasets.${DATASET_DEFAULT_NAME}.${index}.name` — these are **string selectors split by '.' in `handleSetMetadataPropertyBySelector`**, invisible to TypeScript
- All consumer sites reading `metadata?.dataset` change to `metadata?.datasets?.[DATASET_DEFAULT_NAME]`
- TypeScript compiler surfaces most remaining references, but string-based selectors must be found manually

**Patterns to follow:**
- Existing `getPublishableUsermeta` structure — update the access path, preserve the map/filter logic

**Test scenarios:**
- Happy path: `getNewTemplateMetadata()` → returns template with `datasets: { dataset: [] }` not `dataset: []`
- Happy path: `getPublishableUsermeta` with 2 tracked fields → produces `datasets.dataset` array with `__dataset.0__`, `__dataset.1__` keys
- Happy path: Export round-trip: create metadata → update with fields → publish → produces valid v2 template with `datasets` structure
- Edge case: `getPublishableUsermeta` with empty metadata → `datasets.dataset` defaults to `[]`
- Integration: Full export pipeline produces a template that passes schema validation (Unit 3's schema)

**Verification:**
- Export produces templates with `datasets` (plural) structure
- TypeScript compilation clean (`tsc --noEmit`)
- All existing export tests updated and passing

---

- [ ] **Unit 6: Update key-based replacement and import substitution**

**Goal:** Change `getTemplateReplacedForDataset` from index-based to key-based placeholder replacement, and update for the `datasets` structure.

**Requirements:** R8

**Dependencies:** Unit 4 (migration must work), Unit 5 (export must produce new format)

**Files:**
- Modify: `packages/json-processing/src/template-usermeta.ts` (`getTemplateReplacedForDataset`, `getFieldPattern`)
- Test: `packages/json-processing/src/__test__/template-usermeta.test.ts`

**Approach:**
- `getTemplateReplacedForDataset` currently iterates `dataset.reduce((result, value, index) => ...)` and uses `getFieldPattern(index)` to match `__<index>__`
- Change to: accept `datasets` object, iterate each dataset's fields, use `value.key` (e.g., `__dataset.0__`) to build the regex pattern instead of deriving from array index
- `getFieldPattern` changes from `(index: number)` to `(key: string)` — builds regex from the field's actual key property
- This provides real namespace isolation: each field's placeholder is matched by its explicit key, not positional index

**Patterns to follow:**
- Existing `getFieldPattern` / `getEscapedReplacerPattern` chain — extend for key-based matching

**Test scenarios:**
- Happy path: Template with `__dataset.0__` in spec + field with `key: "__dataset.0__"` and `suppliedObjectName: "Sales"` → `__dataset.0__` replaced with `Sales` in output
- Happy path: Template with two fields → both replaced correctly by key, not by position
- Edge case: Field key containing regex-special characters (dot) → properly escaped in regex
- Edge case: Spec contains both `__dataset.0__` and the literal string `"__dataset.0__"` → both replaced (matching existing behavior)
- Integration: Full import flow: V1 template → migrate (Unit 4) → assign fields → replace → produces correct output with actual field names

**Verification:**
- Import substitution works correctly with key-based matching
- Reordering fields in the dataset array does not affect replacement (key-based, not position-based)

---

- [ ] **Unit 7: Update built-in templates and field tracking**

**Goal:** Update built-in catalog templates and field tracking worker for the new placeholder format and `datasets` structure.

**Requirements:** R1, R6

**Dependencies:** Unit 2 (new placeholder format), Unit 3 (new type)

**Files:**
- Modify: `packages/app-core/src/catalog/vega-lite/vl-bar-simple.ts`
- Modify: `packages/app-core/src/catalog/vega-lite/vl-bar-interactive.ts`
- Modify: `packages/app-core/src/catalog/vega-lite/vl-empty.ts`
- Modify: `packages/app-core/src/catalog/vega-lite/vl-empty-config.ts`
- Modify: `packages/app-core/src/catalog/vega/v-bar-simple.ts`
- Modify: `packages/app-core/src/catalog/vega/v-bar-interactive.ts`
- Modify: `packages/app-core/src/catalog/vega/v-empty.ts`
- Modify: `packages/app-core/src/catalog/vega/v-empty-config.ts`
- Modify: `packages/json-processing/src/lib/spec-processing/workers/field-tracking.ts`
- Modify: `packages/json-processing/src/lib/spec-processing/workers/tokenizer.ts` (if needed)
- Test: `packages/json-processing/src/lib/spec-processing/workers/__tests__/tokenizer.test.ts`

**Approach:**
- Built-in templates: change `dataset: UsermetaDatasetField[]` to `datasets: { [DATASET_DEFAULT_NAME]: UsermetaDatasetField[] }`. Update placeholder keys from `__0__` to `__dataset.0__`. Update spec body references from `__0__` to `__dataset.0__`.
- Field tracking: update `getPlaceholderKey` call to pass `DATASET_DEFAULT_NAME` as the dataset name
- Tokenizer/remapper: these use `TrackedFieldProperties.placeholder` which already carries the full placeholder string — should work automatically once field tracking generates the new format

**Patterns to follow:**
- Existing built-in template structure in `vl-bar-simple.ts`

**Test scenarios:**
- Happy path: `getIncludedTemplates()` returns templates with `datasets` structure
- Happy path: Built-in template placeholders match the new `__dataset.N__` format
- Happy path: Field tracking assigns `__dataset.N__` placeholders to tracked fields
- Integration: Creating a visual from a built-in template → field assignment works → spec renders with correct field names

**Verification:**
- All built-in templates use `datasets` structure and `__dataset.N__` placeholders
- Field tracking produces scoped placeholders
- Tokenizer and remapper round-trip correctly with new format

## System-Wide Impact

- **Interaction graph:** Changes flow through: types → schema generation → import migration → export pipeline → field tracking → tokenizer → remapper → built-in templates. No new callbacks or middleware.
- **Error propagation:** V1 import failures surface as schema validation errors (existing mechanism). No new error surfaces.
- **State lifecycle risks:** Internal Zustand state (`state.dataset`) is unchanged. The `reconcileExportDatasetFields` function receives the dataset array from `metadata.datasets[DATASET_DEFAULT_NAME]` instead of `metadata.dataset` — the array shape is identical.
- **API surface parity:** Template import, export, and create-from-template all consume the same `UsermetaTemplate` type. Changing the type once propagates to all surfaces via TypeScript.
- **Unchanged invariants:** Internal dataset state, Vega view data binding, incremental updates, compilation pipeline, and Power BI data role are not modified. The serialization adapter ensures the internal/external boundary is clean.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Missed `metadata.dataset` reference after type change | TypeScript compiler surfaces all remaining references. Run `tsc --noEmit` after Unit 3. |
| Schema generation produces unexpected output for `Record<string, T[]>` | Verify generated schema after `npm run build:schema`. The generator handles `Record` types as `additionalProperties` objects. |
| V1 placeholder rewriting misses references in spec body | Import migration searches spec body string, not just field keys. Test with realistic V1 templates containing inline placeholder references. |
| Built-in template updates missed in one of 8 files | TypeScript enforces `UsermetaTemplate` shape — any template with `dataset` instead of `datasets` fails to compile. |
| `getEscapedReplacerPattern` doesn't escape dot in new placeholder format | Dot must be escaped as `\\.` in regex. Add explicit test for this. |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md](docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md)
- Related code: `packages/template-usermeta/src/types.ts` (UsermetaTemplate type)
- Related code: `packages/data-core/src/lib/field/tokenization.ts` (getPlaceholderKey)
- Related code: `packages/json-processing/src/template-usermeta.ts` (import/export pipeline)
- Export pipeline awareness: `docs/solutions/ui-bugs/export-dialog-empty-dataset-fields-2026-04-13.md`
