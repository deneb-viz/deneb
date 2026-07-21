# Field Parameter Support Design

## Problem

Power BI field parameters allow report authors to dynamically swap fields (columns or measures) in and out of a visual via slicer selections. When a user changes their field parameter selection, Power BI adds or removes columns from the DataView. This breaks Vega/Vega-Lite specifications that reference fields by name, because the field names change depending on the selection.

Since API version 5.10.0, Power BI provides `sourceFieldParameters` metadata on `DataViewMetadataColumn`, indicating which parameter a field belongs to and the parameter's display name. This enables Deneb to detect field parameters and consolidate their component fields into stable, parameter-named dataset columns.

GitHub issue: [#238](https://github.com/deneb-viz/deneb/issues/238)

## Solution

Two modes controlled by a global setting:

### Consolidate Mode (Default for New Specs)

Fields belonging to a field parameter are merged into array-valued columns named after the parameter. Each parameter produces:

- `[Parameter Name]` — array of values (one per component field, DataView order)
- `[Parameter Name]__names` — array of component field display names (row-invariant, built once at plan time)
- `[Parameter Name]__format` — array of format strings (if enabled, row-invariant for columns, per-row for measures)
- `[Parameter Name]__formatted` — array of formatted display values (if enabled, per-row)

The field gets `DatasetFieldRole = 'field-parameter'`. Users apply Vega/Vega-Lite `flatten` transforms to decompose arrays when needed.

**Example with 3 category fields in `Dynamic Category` parameter:**

| \_\_row\_\_ | Dynamic Category | Dynamic Category\_\_names | $ Sales |
|---|---|---|---|
| 0 | `['CA', 'Channel Partners', 'Amarilla']` | `['Country Code', 'Segment', 'Product']` | 2552747.28 |
| 1 | `['CA', 'Channel Partners', 'Carratera']` | `['Country Code', 'Segment', 'Product']` | 3122579.16 |

After a `flatten` transform:

| \_\_row\_\_ | Value | Field | $ Sales |
|---|---|---|---|
| 0 | CA | Country Code | 2552747.28 |
| 0 | Channel Partners | Segment | 2552747.28 |
| 0 | Amarilla | Product | 2552747.28 |

The original `__row__` value is preserved, allowing Power BI interactivity to continue working.

**Mixed column/measure parameters:** All parameters are assumed to potentially contain both columns and measures. The `__format` and `__formatted` companion fields are always available (when enabled) — columns with no format string produce `null` entries.

### Passthrough Mode

Fields are kept as individual columns with their actual display names. Each field is assigned its underlying `DatasetFieldRole` (grouping or aggregation) based on the semantic model metadata. Support fields work identically to non-parameter fields. This mode exists for:

- Legacy spec compatibility (existing specs that reference individual field names)
- Users employing the [modeling workaround](https://github.com/deneb-viz/deneb/issues/238#issuecomment-1501033734) (renaming the parameter table's first column to a constant)

## Per-Field "Treat as Field Parameter" Flag

When the global consolidation setting is enabled, any dataset field can be manually flagged as "treat as field parameter" in the dataset field configuration, regardless of platform or Power BI metadata. This flag is not available in passthrough mode. When enabled:

- The field's value is wrapped in a single-element array
- `__names` contains the field's display name as a single-element array
- The field's role becomes `'field-parameter'` with parameter-appropriate support field options
- An InfoLabel explains this is for compatibility/debugging purposes and the field will be exported as a parameter in templates

When disabled, the field reverts to its detected role (column or measure) with standard support field options.

This flag serves several purposes:

- **Import compatibility:** When a template expects a field parameter but the user assigns a regular field, wrapping it in a single-element array keeps the spec's `flatten` transforms functional
- **Web client / generic platform:** No Power BI metadata available, so manual flagging is the only way to produce parameter-shaped data
- **Debugging:** Allows testing parameter-aware specs with regular fields

## Data Flow (Consolidate Mode)

```
Power BI DataView
  categories: [Country Code, Segment, Product, Year]
  values: [$ Sales]
  metadata: Country Code.sourceFieldParameters = [{displayName: 'Dynamic Category'}]
            Segment.sourceFieldParameters = [{displayName: 'Dynamic Category'}]
            Product.sourceFieldParameters = [{displayName: 'Dynamic Category'}]
            Year.sourceFieldParameters = undefined

    ↓ Field analysis (detection + grouping)

Parameter groups: { 'Dynamic Category': [Country Code(0), Segment(1), Product(2)] }
Regular fields: [Year(3), $ Sales(0)]

    ↓ Plan building

ProcessingPlan.fields = [
  ParameterInstruction { encodedName: 'Dynamic Category', componentIndices: [0,1,2],
    namesArray: ['Country Code','Segment','Product'], ... },
  FieldInstruction { encodedName: 'Year', sourceIndex: 3, role: 'grouping', ... },
  FieldInstruction { encodedName: '$ Sales', sourceIndex: 0, role: 'aggregation', ... }
]

    ↓ Row execution

{ __row__: 0, 'Dynamic Category': ['CA','Channel Partners','Amarilla'],
  'Dynamic Category__names': namesArrayRef, 'Year': 2024, '$ Sales': 2552747.28 }
```

Row-invariant arrays (`__names`, `__format` for columns) are built once at plan time and reused as the same reference for every row.

## Settings

### Global: Consolidate Field Parameters

- **Location:** "Semantic model integration" accordion item in the Power BI-injected settings pane section, underneath Supporting Fields
- **Label:** TBD (e.g., "Consolidate field parameters")
- **Default:** `true` for new specs, `false` for legacy specs (detected via `denebMetaVersion`)
- **Persistence:** `consolidateFieldParameters` in `stateManagement` (boolean, same pattern as `scaleToZoom`)
- **Effect:** When true, detected field parameters are grouped into array columns. When false, all fields pass through individually.

### Per-field: Treat as Field Parameter

- **Location:** Dataset field configuration in the dataset settings (platform-agnostic, app-core)
- **Availability:** Only shown when the global consolidation setting is enabled. Hidden in passthrough mode.
- **Default:** Auto-detected from `sourceFieldParameters` metadata when consolidation is enabled. Off for fields without parameter metadata.
- **InfoLabel:** Explains this is for compatibility/debugging and will export as a parameter in templates
- **Effect:** Wraps the field in single-element arrays, changes role to `'field-parameter'`, adjusts available support field options

## Processing Plan Integration

The existing support field processing plan pattern is extended:

### New Types in `@deneb-viz/data-core`

- `DatasetFieldRole` gains `'field-parameter'` value
- `FieldProcessingInstruction` is extended (or a new `ParameterProcessingInstruction` discriminated union variant is added) with:
  - `componentIndices: number[]` — indices into the base values array for each component field
  - `namesArray: string[]` — pre-built array of component display names (row-invariant)
  - `formatStringsArray?: string[]` — pre-built array of format strings (row-invariant portion)
- `ProcessingPlan` may need a pre-processing step that groups detected parameters before the main plan is built

### Plan Building

1. Scan field metadata for `sourceFieldParameters` (Power BI-specific, done in `processing.ts`)
2. Group fields by parameter name, respecting DataView order
3. For consolidated parameters: produce a single `ParameterProcessingInstruction` per parameter group
4. For manual "treat as" fields: produce a `ParameterProcessingInstruction` with a single component
5. For passthrough/regular fields: produce standard `FieldProcessingInstruction` as today

### Row Execution

For parameter instructions:
- Collect base values from each component index into an array
- Assign the array to `row[parameterName]`
- Assign the pre-built `namesArray` reference to `row[parameterName + '__names']`
- If format enabled: collect format strings into array (column formats are row-invariant from plan; measure formats resolved per-row via provider)
- If formatted enabled: collect formatted values into array (per-row via provider)

## Template Integration

### Export

- Consolidated parameter fields export with role `'field-parameter'` in template metadata
- Component fields are not individually listed — the parameter is the tracked unit
- The `consolidateFieldParameters` setting is NOT included in template metadata (it's a per-project preference)

### Import

- Template field with role `'field-parameter'` shows the `TableColumnQuestion` icon in the field mapping UI
- **Happy path:** User assigns a field parameter → consolidation is auto-enabled for the project
- **Mismatch:** User assigns a regular column/measure → warning shown explaining the template was designed for a field parameter and results may not be consistent. If the user proceeds, the field is auto-flagged as "treat as field parameter" (single-element array wrapping) so the spec's transforms don't break.

## UI

### Data Type Icon

Field parameters use the `TableColumnQuestion` icon from `@fabric-msft/svg-icons`. This icon is used consistently in:

- Dataset field list in the editor
- Template create/import field mapping dialogs
- Template export field selection

### Settings Pane

The "Semantic model integration" accordion item is added to the Power BI-injected settings pane section (below Supporting Fields). It contains the global consolidation toggle.

### Dataset Viewer

Array-valued cells in the data viewer need appropriate rendering. The arrays should display as a readable representation (e.g., comma-separated or JSON-like) rather than `[object Array]`.

## Package Responsibilities

### `@deneb-viz/data-core` (platform-agnostic)

- `'field-parameter'` value for `DatasetFieldRole`
- Extended processing plan types (parameter instruction variant)
- Row builder handles array assembly for parameter instructions
- Default provider returns passthrough behavior for parameter fields

### `src/lib/dataset/` (Power BI-specific)

- Detection of `sourceFieldParameters` on `DataViewMetadataColumn`
- Grouping logic (fields → parameter groups, respecting DataView order)
- Provider extension for resolving per-component format strings and formatted values across mixed column/measure parameters

### `@deneb-viz/app-core`

- "Semantic model integration" accordion item (Power BI-injected section)
- Per-field "treat as field parameter" toggle in dataset field configuration
- `TableColumnQuestion` icon integration (from `@fabric-msft/svg-icons`)
- Dataset viewer rendering for array-valued cells
- Template field mapping UI with parameter role awareness

### Persistence (`src/lib/persistence/`)

- `consolidateFieldParameters: boolean` in `stateManagement` capabilities
- Sync mapping following `scaleToZoom` pattern

## Legacy Handling

- `denebMetaVersion < 2`: `consolidateFieldParameters` defaults to `false` (passthrough) — existing specs continue to work unchanged
- `denebMetaVersion >= 2`: `consolidateFieldParameters` defaults to `true` (consolidate) — new specs get the improved experience
- No `TEMPLATE_USERMETA_VERSION` bump needed (staying at 2, not yet released)

## Testing Strategy

### `data-core` Tests (Unit, Pure Functions)

- **Parameter grouping:** Given field metadata with mixed parameter/non-parameter fields → verify correct grouping by parameter name in DataView order
- **Plan building with parameters:** Given grouped parameters + configuration → verify `ParameterProcessingInstruction` with correct component indices and pre-built arrays
- **Row execution with parameters:** Given parameter instruction + mock provider → verify array-valued output, shared `__names` reference across rows
- **Single-element wrapping:** Given "treat as field parameter" flag on a regular field → verify single-element array output
- **Passthrough mode:** Given consolidate=false → verify all fields produce standard scalar instructions

### Root Visual Tests (Power BI-specific)

- **`sourceFieldParameters` detection:** Given mock DataView with parameter metadata → verify correct grouping
- **Mixed column/measure parameter:** Given parameter with both types → verify format/formatted arrays handle mixed types
- **Legacy migration:** Given pre-2.0 spec → verify passthrough mode

### Coverage Target

90%+ for all new code. Tests match requirements/behavior, not implementation details.

## Known Limitation: Field Parameter Ordering

Component fields within a consolidated parameter are ordered by their position in the Power BI DataView. The `DataViewSourceFieldParameterMetadata` interface does not provide an explicit sort order. If Power BI changes the DataView field order between updates (e.g., when the user reorders fields in the parameter slicer), the array ordering may shift.

## Out of Scope

- Custom grouping UI for manually creating multi-field parameter groups (manual flag only supports single-field wrapping)
- Drill-down integration with field parameters ([#196](https://github.com/deneb-viz/deneb/issues/196))
- Auto-completion hints for parameter fields in the Monaco editor (future enhancement)
- Highlight values for parameter fields — consolidated parameters may contain measures that participate in cross-highlighting, but the array-valued highlight companion fields need design work to determine how highlight status/comparator values should be represented across mixed-type component fields
