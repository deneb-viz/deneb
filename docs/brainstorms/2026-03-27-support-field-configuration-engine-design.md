# Support Field Configuration Engine — Phase 1 Design

## Problem

Deneb automatically adds support fields (`__highlight*`, `__format`, `__formatted`, etc.) to every eligible dataset field when master settings are enabled. Users cannot selectively disable individual support fields per field, leading to bloated datasets that hurt performance and complicate development. ([#506](https://github.com/deneb-viz/deneb/issues/506))

## Scope (Phase 1)

This phase covers the engine: data model, processing changes, defaults, migration, memoization, persistence, format field expansion to columns, and platform abstraction via `data-core`. Phase 2 (separate spec) covers UI for configuration and template integration UI.

## Configuration Data Model

### Support Field Flags

Per-field configuration of which support fields to generate:

```typescript
// @deneb-viz/data-core — platform-agnostic
type SupportFieldFlags = {
    highlight: boolean;
    highlightStatus: boolean;
    highlightComparator: boolean;
    format: boolean;
    formatted: boolean;
};
```

### Sparse Configuration Object

Keyed by encoded field name (matching existing field tracking/templating conventions). Only fields the user has explicitly configured are present. Absent fields fall through to defaults.

```typescript
type SupportFieldConfiguration = Record<string, SupportFieldFlags>;
```

When a user touches any flag for a field, all flags for that field are written. This distinguishes "never configured, use defaults" (absent) from "user has spoken, respect it" (present with all flags).

### Row-Level Support Fields (Not Per-Field Configurable)

- `__row__` — always present, not configurable
- `__selected__` — present when cross-filter enabled, not configurable per-field

## Defaults Resolution

Pure function: given master settings, field role, whether an explicit config entry exists, and whether this is a legacy spec → returns resolved `SupportFieldFlags`.

### New Spec Defaults

| Flag | Measure | Column |
|---|---|---|
| `highlight` | On (if cross-highlight enabled) | N/A (highlight only applies to measures) |
| `highlightStatus` | Off | N/A |
| `highlightComparator` | Off | N/A |
| `format` | Off | Off |
| `formatted` | Off | Off |

### Legacy Spec Defaults (Migration)

All flags resolve to "on" for whatever the master settings allow. This matches current behavior exactly — existing specs produce identical output with no configuration object present.

### Distinguishing New vs. Legacy

A spec is legacy if it has non-default `jsonSpec` content but no `supportFieldConfiguration` property persisted. A brand new spec has the default template value for `jsonSpec`.

## Platform Abstraction

### Value Provider Interface

Platforms inject handlers for value resolution. The engine always produces support fields when flags say so; the platform determines the values.

```typescript
// @deneb-viz/data-core
type SupportFieldValueProvider = {
    /** Resolve format string for a field at a given row. Returns '' if unavailable. */
    getFormatString: (fieldIndex: number, rowIndex: number) => string;
    /** Produce a formatted display value from a raw value and format string. */
    getFormattedValue: (value: PrimitiveValue, formatString: string, locale: string) => PrimitiveValue;
    /** Get the highlight value for a field at a given row. Returns the base value if highlights unavailable. */
    getHighlightValue: (fieldIndex: number, rowIndex: number, baseValue: PrimitiveValue) => PrimitiveValue;
};
```

### Platform Implementations

**Power BI:** Draws from `DataViewValueColumn.source.format`, `objects[index].general.formatString`, `values[i].highlights`, and `powerbi-compat/formatting`.

**Generic/web client default:** Format string → `''`, formatted value → base value as-is, highlight value → base value (effectively equal), selection status → `'neutral'`. A spec authored against Power BI with highlights works identically on a web client — the spec doesn't break, it gracefully degrades.

The provider is passed into the processing pipeline at call time, not stored as global state. This keeps the engine pure and testable.

## Processing Plan

All configuration resolution happens once before the row loop. The loop executes a pre-computed plan with no config lookups or branching on settings.

### Plan Types

```typescript
// @deneb-viz/data-core
type FieldProcessingInstruction = {
    encodedName: string;
    sourceIndex: number;
    role: 'grouping' | 'aggregation';
    emitHighlight: boolean;
    emitHighlightStatus: boolean;
    emitHighlightComparator: boolean;
    emitFormat: boolean;
    emitFormatted: boolean;
};

type ProcessingPlan = {
    fields: FieldProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
```

### Plan Building

Pure function: takes field metadata array, support field configuration (sparse), master settings → produces `ProcessingPlan`. The platform provider is not needed at plan-build time — it is only used during row execution.

- Iterates fields once
- For each field: checks config for explicit entry, falls through to `resolveFieldDefaults()` if absent
- Produces flat instruction array

### Row Execution

```
for each row:
    set __row__
    if plan.emitSelected: set __selected__
    for each instruction in plan.fields:
        set base value
        if instruction.emitHighlight: set highlight value (via provider)
        if instruction.emitHighlightStatus: set highlight status
        if instruction.emitHighlightComparator: set highlight comparator
        if instruction.emitFormat: set format string (via provider)
        if instruction.emitFormatted: set formatted value (via provider)
```

The `emit*` booleans are constant for the entire loop — cheap branch prediction, no function calls or config lookups per iteration.

## Format Field Expansion

Format and formatted support fields are extended to columns (categorical fields), not just measures. No eligibility filtering — if the flag is on, pass through whatever the semantic model provides. For new specs, format/formatted are off by default for all field roles, so this adds no processing overhead unless explicitly opted in.

## Package Responsibilities

### `@deneb-viz/data-core` (platform-agnostic)

- `SupportFieldFlags`, `SupportFieldConfiguration` types
- `SupportFieldValueProvider` interface
- `resolveFieldDefaults()` — pure function for flag resolution
- `buildProcessingPlan()` — pure function producing `ProcessingPlan`
- `buildDataRow()` — pure function executing plan for a single row
- Default provider factory (neutral/passthrough values)
- All existing field constants (already here)

### `src/lib/dataset/` (root visual, Power BI-specific)

- `getMappedDataset()` — orchestrator stays here, delegates row building to data-core's plan executor
- Power BI `SupportFieldValueProvider` implementation
- Selection queue building (`InteractivityManager`)
- `hasDataViewChanged()` — reference-based change detection
- `getUpdatedDatasetSelectors()` — selection state updates

### `src/lib/persistence/`

- Support field configuration as a named property in `stateManagement` (capabilities.json)
- Slice ↔ state sync uses this path
- Migration logic: detect absence of config → treat as legacy

### App-core project slice

- Stores the config alongside spec/config
- Exposes for template export

## Persistence & Migration

### Storage

The `SupportFieldConfiguration` is persisted as a JSON string in the `stateManagement` object in Power BI's property bag (capabilities.json), named `supportFieldConfiguration`. Synced via slice ↔ state sync, following the same pattern as viewport state.

### Migration Scenarios

| Scenario | Config property | Behavior |
|---|---|---|
| Brand new spec | Absent/empty | Apply new defaults (highlight on, everything else off) |
| Existing spec (pre-2.0) | Absent | Apply legacy defaults (everything on that master settings allow) |
| Configured spec | Present, parsed | Use explicit flags, defaults for unconfigured fields |

### Volatile Change Handling

Changes to the support field configuration trigger a full dataset reprocess, same as `enableSelection`/`enableHighlight` changes. The config reference is included in change detection — if it changes, `shouldProcess` flips.

### Memoization

Inherent in the sparse model. If a user explicitly configures `Amount.highlightStatus = false`, then toggles cross-highlight off and back on, the explicit entry persists and is honoured. Only unconfigured fields re-derive from defaults when master settings change.

## Template Integration (Phase 1 Engine Support)

The engine supports template export/import of the configuration. UI for this is Phase 2.

- **Export:** `SupportFieldConfiguration` is captured in template usermeta alongside `dataset`, `interactivity`, `config`.
- **Import:** Config keys are remapped during field remapping (template placeholder → actual field name), following the existing tokenization/detokenization pattern.
- **No config in template:** Treated as legacy — apply defaults based on master settings and the template's build version.

## Developer Documentation

The `data-core` package public API must include developer-facing documentation sufficient for third-party integrators to build their own platform implementations without reading the Power BI reference implementation. This includes:

- **API reference** for all exported types (`SupportFieldFlags`, `SupportFieldConfiguration`, `SupportFieldValueProvider`, `ProcessingPlan`, `FieldProcessingInstruction`)
- **Integration guide** covering: how to implement `SupportFieldValueProvider` for a new platform, how to call `buildProcessingPlan()` and execute the plan via `buildDataRow()`, and how the default provider factory works as a starting point
- **Behavioral contract** for each provider method (e.g., `getFormatString` returns `''` when unavailable, `getHighlightValue` returns the base value when highlights are unsupported)
- **Example** showing a minimal platform integration using the default provider with one override

Documentation should live alongside the `data-core` package source (e.g., a `README.md` or `docs/` directory within the package) so it ships with the package and stays in sync with the code.

## Testing Strategy

### `data-core` Tests (Unit, Pure Functions)

- **`resolveFieldDefaults()`** — matrix of: new vs legacy x measure vs column x each master setting combination → verify correct flag values. Highest-value test surface.
- **`buildProcessingPlan()`** — given field metadata + sparse config + master settings → verify correct `emit*` flags. Cover: unconfigured fields use defaults, configured fields use explicit values, master setting off suppresses related flags.
- **`buildDataRow()`** — given plan instruction + mock provider + row data → verify correct support field entries. Cover: each flag on/off, provider returning empty strings/base values.
- **Default provider factory** — verify neutral/passthrough behavior.

### Root Visual Tests (Integration, Power BI-Specific)

- Power BI `SupportFieldValueProvider` — given mock DataView structures → verify format strings, highlight values, formatted values.
- Migration detection — given presence/absence of config property + spec state → verify correct legacy flag.
- Config persistence round-trip — serialize → deserialize → verify equality.

### Coverage Target

90%+ for all new code. Tests match requirements/behavior, not implementation details.

### Not Tested in Phase 1

- UI interactions (Phase 2)
- Template field remapping with config UI (Phase 2)
