# Field Parameter Improvements — Design Spec

## Goal

Incremental improvements to the field parameter feature (#238) discovered during testing and review. Six changes: restructure template format, add parameter highlights, editor autocomplete for support fields, auto-flag on import kind mismatch, change `__names` default to off, and translation awareness.

## Architecture

These are independent changes that share the field parameter infrastructure. They can be implemented and tested incrementally. Template metaVersion stays at 2 (pre-release, safe to change structure). Migration path is metaVersion 1→2 only.

## Tech Stack

TypeScript, React, Zustand, Fluent UI, Monaco Editor, Vega/Vega-Lite, Power BI Visuals API

---

## 1. Inline supportFieldConfiguration in template dataset entries

### Problem
Template export stores `dataset` and `supportFieldConfiguration` as separate top-level usermeta properties, requiring a lookup join on placeholder key.

### Design
Move each field's support field flags into its `UsermetaDatasetField` entry as an optional `supportFieldConfiguration` property. Remove the top-level `supportFieldConfiguration` from `UsermetaTemplate` entirely. Clean break — metaVersion 1 templates never had `supportFieldConfiguration`.

**Template format (after):**
```json
{
  "dataset": [
    {
      "key": "__0__", "name": "Sales", "kind": "measure", "type": "numeric",
      "supportFieldConfiguration": { "highlight": true, "highlightStatus": false, "highlightComparator": false, "format": false, "formatted": false }
    },
    { "key": "__1__", "name": "Category", "kind": "column", "type": "text" }
  ]
}
```

Fields with no explicit config omit the property (sparse convention preserved). Internal project state storage is unchanged — `supportFieldConfiguration` remains a `Record<string, SupportFieldFlags>` keyed by field name.

### Key changes
- `UsermetaDatasetField`: add optional `supportFieldConfiguration?: SupportFieldFlags`
- `UsermetaTemplate`: remove `supportFieldConfiguration` property
- Export: embed config per field in `getPublishableUsermeta` (eliminate `remapSupportFieldConfigurationForExport` and `buildNameToTrackedFieldMap`)
- Import: `remapSupportFieldConfigurationForImport` reads from `dataset[i].supportFieldConfiguration` instead of top-level property
- Regenerate JSON schema

---

## 2. Highlight fields for parameters

### Problem
`ParameterProcessingInstruction` has no highlight emit flags. Parameters can contain measures with highlight values from Power BI.

### Design
Add `emitHighlight`, `emitHighlightStatus`, `emitHighlightComparator` to `ParameterProcessingInstruction`. Add `componentRoles: ('grouping' | 'aggregation')[]` so the row builder knows which components are measures.

During row building, per component:
- **Measure:** call `provider.getHighlightValue` — real highlight value
- **Column:** use `baseValue` — passthrough (highlight doesn't apply)

Result: `__highlight` is an array like `[realHighlight, passthrough, realHighlight]`.

**Defaults:** `highlight: crossHighlightEnabled` (same as regular measures), `highlightStatus: false`, `highlightComparator: false`. User-configurable per parameter in the settings pane.

Settings UI: show highlight flags for parameters when `crossHighlightEnabled` is true (same rule as measures).

---

## 3. Autocomplete hints for support fields

### Problem
Monaco editor only suggests base field names. Support field companions must be typed manually.

### Design
Extend the completion provider in `editor-init-service.ts` to suggest active support field companions. For each source field, resolve its support field configuration (explicit or defaults via `resolveFieldDefaults`) and generate completion items for each enabled flag.

Suggestions use `CompletionItemKind.Property` (vs `Field` for base fields), with documentation strings describing each companion's purpose. Only active (enabled) companions are suggested — no noise.

---

## 4. Auto-flag treatAsParameter on import kind mismatch

### Problem
Design spec says to auto-flag `treatAsParameter: true` when a regular field is assigned to a parameter placeholder. Never implemented.

### Design
In the `CreateButton` handler, after field assignment: if `dataset[i].kind === 'parameter'` and the supplied field's role is `'grouping'` or `'aggregation'`, auto-set `treatAsParameter: true` on that field's config entry and auto-enable `consolidateFieldParameters: true` on the project.

This is low-friction — the user can still disable both settings after import.

---

## 5. Change `__names` default to off

### Problem
`resolve-defaults.ts` returns `names: true` for field parameters. `__names` is a convenience field, not mandatory — should be opt-in.

### Design
- `resolve-defaults.ts`: parameter default `names: true` → `names: false`
- `build-processing-plan.ts`: `flags.names ?? true` → `flags.names ?? false`
- Templates wanting `__names` explicitly enable it in their inline config

---

## 6. Translation awareness

The user will manually edit translation files. Before any commit or write touching i18n/translation files, re-read current content to absorb external changes. Never overwrite without reading first.

---

## Out of scope

- Template metaVersion bump (stays at 2)
- User-facing documentation (handled in separate docs repo)
- Template import mismatch warning dialog (auto-flag is sufficient)
