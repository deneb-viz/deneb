# Support Field Configuration UI — Phase 2 Design

## Problem

Phase 1 built the engine for per-field support field configuration, but there is no UI for users to configure it. Additionally, support field changes (e.g., toggling cross-filter/cross-highlight) don't propagate to the debug pane dataset viewer because the viewer listens to the Vega view rather than the store, and config-only changes don't trigger a Vega view data update.

## Scope (Phase 2)

- Dataset accordion item in the Settings pane with per-field support field toggles
- Volatile change detection for `supportFieldConfiguration` changes
- MessageBar warnings for cross-highlight configuration mismatches
- Debug pane dataset viewer fix (resolved as side effect of volatile change detection)

## Dataset Accordion Item in Settings Pane

### Placement

A new `SettingsAccordionItem` titled "Dataset" in the Settings pane, positioned after Performance and before platform-injected components (interactivity settings). This keeps all configuration in one place — no pane-hopping between a separate Dataset pane and Settings for cross-highlight/cross-filter toggles.

### Structure

The accordion item contains:

1. **MessageBar(s)** at the top — contextual warnings/info about cross-highlight state
2. **Fluent UI Tree** with checkbox selection — one top-level node per source dataset field, all expanded by default

### Tree Node Structure

Each source dataset field renders as a tree node:

- **Label:** Encoded field name (e.g., "Product", "$ Sales")
- **Role indicator:** Icon + tooltip distinguishing column vs. measure (explains why different fields show different support field options)
- **Child nodes:** Checkboxes for each applicable support field, all expanded by default

**Measure fields show:**
- Highlight value
- Highlight status
- Highlight comparator
- Format string
- Formatted value

**Column fields show:**
- Format string
- Formatted value

Only applicable toggles are shown per field — no greyed-out inapplicable options. The role indicator tooltip explains why certain fields have fewer options.

### Highlight Toggle Disabled State

When the cross-highlight master setting is off, highlight checkboxes (highlight value, highlight status, highlight comparator) are visually disabled and not interactive. Their checked state is preserved (memoized) so toggling cross-highlight back on restores previous configuration.

### Data Source

The tree reads field metadata from the app-core dataset state (`state.dataset.fields`), filtered to source fields only (`isSupportField !== true`). Field role is derived from each field's `role` property (`'grouping'` = column, `'aggregation'` = measure).

### Checked State

Derived from `supportFieldConfiguration` in the project slice. For unconfigured fields (absent from the sparse config), the checked state reflects resolved defaults via `resolveFieldDefaults()` from `@deneb-viz/data-core/support-fields`. This means the tree accurately shows what the engine will produce, even before the user touches anything.

### Write Behavior

When a user checks or unchecks any support field for a field, all flags for that field are written to the configuration. This matches the Phase 1 "write all on first touch" contract — distinguishing "never configured, use defaults" (absent) from "user has configured" (present with all flags).

## MessageBar Logic

Two scenarios, positioned above the Tree within the accordion item.

### Case 1: Cross-highlight disabled (info)

- **Condition:** `interactivity.highlight === false`
- **Intent:** `info`
- **Content:** "Cross-highlighting is disabled. Highlight fields are not available." + action link "Enable cross-highlighting" that toggles the setting
- **Effect:** Highlight checkboxes disabled in the tree

### Case 2: Cross-highlight on but no highlight fields selected (warning)

- **Condition:** `interactivity.highlight === true` AND every measure field has all three highlight flags set to `false`
- **Intent:** `warning`
- **Content:** "Cross-highlighting is enabled but no highlight fields are selected. Visual interactions may not work as expected."
- **Effect:** No disabled state — user can immediately fix by checking flags

Only one MessageBar shows at a time. Case 1 takes precedence (if cross-highlight is off, Case 2 is irrelevant).

Cross-filtering is excluded from this UI — `__selected__` is non-negotiable when the interactivity setting is enabled, and this is explained via the existing info label and doc link on the cross-filter toggle further down in the Settings pane.

## Volatile Change Detection

When `supportFieldConfiguration` changes, it must trigger a full dataset reprocess.

### Mechanism

1. Config is persisted to Power BI's `stateManagement` property bag via the existing sync mapping (Phase 1)
2. Power BI sends an `update()` call with the new property values
3. `hasDataViewChanged` in `src/lib/dataset/processing.ts` detects the config change via a new `prevSupportFieldConfiguration` reference, alongside existing `prevEnableSelection`/`prevEnableHighlight`
4. Returns `true` → dataset reprocesses with new flags
5. New dataset flows to Vega view → debug pane dataset viewer picks it up via its existing `addDataListener`

This follows the same pattern as cross-filter/cross-highlight toggle detection. The debug pane dataset viewer bug is resolved as a side effect — no viewer-specific changes needed.

## Built-in Template Catalog Updates

The built-in template catalog (`packages/app-core/src/catalog/`) provides starter templates for new visuals. Each template that uses support fields should include an appropriate `supportFieldConfiguration` in its usermeta so that:

1. New visuals created from catalog templates get the correct per-field flags from the start
2. The configuration is testable end-to-end (create from template → verify flags in Dataset accordion → verify fields in debug pane)

**Interactive templates** (e.g., `vl-bar-interactive`, `v-bar-interactive`) use `__highlight` and `__selected__` fields — these should have highlight flags explicitly enabled for their measure fields.

**Simple/empty templates** can omit `supportFieldConfiguration` (empty/absent triggers new-spec defaults via the engine).

The `getNewIncludedTemplateMetadata` helper in `packages/app-core/src/catalog/index.ts` can accept an optional `supportFieldConfiguration` parameter, or each template can set it directly in its usermeta spread.

## Hotkey Update

The existing editor pane hotkeys shift to accommodate Settings remaining at its current position:

- `Ctrl+Alt+1` — Spec (unchanged)
- `Ctrl+Alt+2` — Config (unchanged)
- `Ctrl+Alt+3` — Settings (unchanged — Dataset is an accordion item within Settings, not a separate pane)

No hotkey changes needed.

## Testing Strategy

### Component Tests (app-core)

- Dataset accordion item renders with correct fields from store
- Measure fields show all five toggles, column fields show only format/formatted
- Highlight toggles disabled when cross-highlight master setting off
- MessageBar Case 1 shows when cross-highlight disabled
- MessageBar Case 2 shows when cross-highlight enabled but no highlight fields selected
- Case 1 takes precedence over Case 2
- Checking a toggle writes all flags for that field to the config
- Unconfigured fields show resolved defaults as checked state

### Integration Tests (root visual)

- Config change triggers dataset reprocess via `hasDataViewChanged`
- Debug pane dataset viewer reflects support field changes after reprocess

### Coverage Target

90%+ for new components. Tests match requirements/behavior, not implementation details.
