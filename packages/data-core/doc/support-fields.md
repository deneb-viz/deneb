# Support Fields Engine

## 1. Overview

Support fields are derived dataset columns that are appended to each data row alongside the primary field values. They provide consumers (e.g., Vega specifications) with pre-computed metadata about each data point: formatted display values, format strings, highlight values, highlight status flags, and highlight comparators.

The engine is **platform-agnostic**. It separates flag resolution (which fields to emit) from value resolution (how to compute those values). Flag resolution is handled entirely within the engine using pure functions. Value resolution is delegated to a `SupportFieldValueProvider` that the calling platform supplies. This means the same processing plan and row-builder can run against Power BI's data APIs, a test harness, or any future host without modification.

The engine is organized around a two-phase design:

1. **Plan phase** (`buildProcessingPlan`) — resolve all flags once, before the row loop.
2. **Row phase** (`buildDataRow`) — execute the plan for each row, calling the provider only for values that are actually needed.

---

## 2. API Reference

### Types

#### `SupportFieldFlags`

Per-field boolean flags that control which support columns are generated for a given field.

```typescript
type SupportFieldFlags = {
    highlight: boolean;
    highlightStatus: boolean;
    highlightComparator: boolean;
    format: boolean;
    formatted: boolean;
};
```

| Flag | Generated column | Description |
|---|---|---|
| `highlight` | `<field>__highlight` | Raw highlight value from the platform |
| `highlightStatus` | `<field>__highlightStatus` | Selection-like status: `'neutral'`, `'on'`, or `'off'` |
| `highlightComparator` | `<field>__highlightComparator` | Ordinal comparison of highlight vs. base: `'eq'`, `'lt'`, `'gt'`, or `'neq'` |
| `format` | `<field>__format` | Format string for the field |
| `formatted` | `<field>__formatted` | Display-ready formatted value |

---

#### `SupportFieldConfiguration`

A sparse record keyed by encoded field name. Only fields explicitly configured by the user are present. Fields absent from this record fall through to defaults computed by `resolveFieldDefaults`.

```typescript
type SupportFieldConfiguration = Record<string, SupportFieldFlags>;
```

---

#### `SupportFieldMasterSettings`

Master toggle settings that influence default flag resolution. These mirror the visual-level settings that enable or disable cross-highlight and cross-filter capabilities.

```typescript
type SupportFieldMasterSettings = {
    crossHighlightEnabled: boolean;
    crossFilterEnabled: boolean;
};
```

| Property | Effect |
|---|---|
| `crossHighlightEnabled` | When `true`, highlight-related flags default to `true` for measures |
| `crossFilterEnabled` | When `true`, `__selected__` is emitted on each row |

---

#### `SupportFieldValueProvider`

Interface for platform-specific value resolution. Implement this to supply actual data values during the row phase. The engine calls these methods only when the corresponding flag is `true` in the processing plan.

```typescript
type SupportFieldValueProvider = {
    getFormatString: (fieldIndex: number, rowIndex: number) => string;
    getFormattedValue: (value: PrimitiveValue, formatString: string, locale: string) => PrimitiveValue;
    getHighlightValue: (fieldIndex: number, rowIndex: number, baseValue: PrimitiveValue) => PrimitiveValue;
};
```

| Method | Parameters | Return |
|---|---|---|
| `getFormatString` | `fieldIndex` — source data index; `rowIndex` — row being processed | Format string, or `''` if unavailable |
| `getFormattedValue` | `value` — raw value; `formatString` — from `getFormatString`; `locale` — BCP 47 locale string | Formatted display value, or `value` as-is if formatting is unavailable |
| `getHighlightValue` | `fieldIndex` — source data index; `rowIndex` — row being processed; `baseValue` — the field's base value | Highlight value from the platform, or `baseValue` when highlights are unsupported |

---

#### `FieldProcessingInstruction`

Pre-computed instruction for a single field. Built once during `buildProcessingPlan` so the row loop performs no additional flag resolution.

```typescript
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
```

---

#### `ProcessingPlan`

The complete plan built before the row loop. Passed unchanged to every `buildDataRow` call.

```typescript
type ProcessingPlan = {
    fields: FieldProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
```

| Property | Description |
|---|---|
| `fields` | Ordered list of per-field instructions, one per input field |
| `emitSelected` | Whether to write `__selected__` on each row (derived from `crossFilterEnabled`) |
| `hasHighlights` | Whether the current data view has active highlights (affects `__highlightStatus__` computation) |

---

#### `ResolveFieldDefaultsParams`

Parameter bag for `resolveFieldDefaults`.

```typescript
type ResolveFieldDefaultsParams = {
    masterSettings: SupportFieldMasterSettings;
    fieldRole: DatasetFieldRole;  // 'grouping' | 'aggregation'
    isLegacy: boolean;
};
```

---

#### `BuildProcessingPlanParams`

Parameter bag for `buildProcessingPlan`.

```typescript
type BuildProcessingPlanParams = {
    fields: Array<{
        encodedName: string;
        sourceIndex: number;
        role: 'grouping' | 'aggregation';
    }>;
    configuration: SupportFieldConfiguration;
    masterSettings: SupportFieldMasterSettings;
    hasHighlights: boolean;
    isLegacy: boolean;
};
```

---

#### `BuildDataRowParams`

Parameter bag for `buildDataRow`.

```typescript
type BuildDataRowParams = {
    plan: ProcessingPlan;
    provider: SupportFieldValueProvider;
    baseValues: PrimitiveValue[];
    rowIndex: number;
    selectionStatus?: string;
    locale: string;
};
```

| Property | Description |
|---|---|
| `plan` | The plan returned by `buildProcessingPlan` |
| `provider` | Platform-specific value provider |
| `baseValues` | Raw values for each field, in the same order as `plan.fields` |
| `rowIndex` | Zero-based row index; written as `__row__` on the output object |
| `selectionStatus` | Optional selection status string; only written when `plan.emitSelected` is `true` and this is not `undefined` |
| `locale` | BCP 47 locale string passed through to `getFormattedValue` |

---

### Functions

#### `resolveFieldDefaults(params)`

Resolves default `SupportFieldFlags` for a field that has no explicit entry in `SupportFieldConfiguration`. Pure function with no side effects.

**Params:** `ResolveFieldDefaultsParams`

**Returns:** `SupportFieldFlags`

**Behavior:**

- For **new specs** (`isLegacy: false`): only `highlight` is set to `true`, and only when `crossHighlightEnabled` is `true` and the field role is `'aggregation'`. All other flags default to `false`.
- For **legacy specs** (`isLegacy: true`): mirrors pre-2.0 behavior. Highlight-related flags (`highlight`, `highlightStatus`, `highlightComparator`) are `true` when `crossHighlightEnabled && role === 'aggregation'`. Format flags (`format`, `formatted`) are `true` when `role === 'aggregation'`.

In both modes, columns (`role === 'grouping'`) never receive highlight or format flags by default.

---

#### `buildProcessingPlan(params)`

Builds a `ProcessingPlan` from the field list, sparse configuration, and master settings. All flag resolution happens here — once — before the row loop begins. Pure function with no side effects.

**Params:** `BuildProcessingPlanParams`

**Returns:** `ProcessingPlan`

**Behavior:**

For each field in `params.fields`:
1. If `params.configuration[field.encodedName]` exists, those flags are used directly (user-configured, no defaults applied).
2. Otherwise, `resolveFieldDefaults` is called with `masterSettings`, `field.role`, and `isLegacy`.

The resulting flags are stored as `emitXxx` booleans on each `FieldProcessingInstruction`.

`plan.emitSelected` is set to `masterSettings.crossFilterEnabled`. `plan.hasHighlights` is passed through from `params.hasHighlights`.

---

#### `buildDataRow(params)`

Executes the processing plan for a single row. Returns a plain object (`VegaDatum`) containing all base values plus any support field values the plan requires.

**Params:** `BuildDataRowParams`

**Returns:** `VegaDatum` (a `Record<string, PrimitiveValue>`)

**Behavior:**

1. Writes `__row__: rowIndex` unconditionally.
2. If `plan.emitSelected` is `true` and `selectionStatus` is not `undefined`, writes `__selected__: selectionStatus`.
3. For each field instruction:
   - Writes `encodedName: baseValues[i]`.
   - If any of `emitHighlight`, `emitHighlightStatus`, or `emitHighlightComparator` is `true`, calls `provider.getHighlightValue` once and reuses the result for all three.
   - Writes `<encodedName>__highlight` if `emitHighlight`.
   - Writes `<encodedName>__highlightStatus` if `emitHighlightStatus` (value: `'neutral'` | `'on'` | `'off'`).
   - Writes `<encodedName>__highlightComparator` if `emitHighlightComparator` (value: `'eq'` | `'lt'` | `'gt'` | `'neq'`).
   - If `emitFormat` or `emitFormatted`, calls `provider.getFormatString` once.
   - Writes `<encodedName>__format` if `emitFormat`.
   - Writes `<encodedName>__formatted` if `emitFormatted` (calls `provider.getFormattedValue`).

Provider methods are only called when the corresponding flag is `true`. There are no redundant calls.

---

#### `createDefaultProvider()`

Creates a passthrough `SupportFieldValueProvider` suitable for platforms that do not support formatting or highlights, or as a starting point for partial overrides.

**Params:** none

**Returns:** `SupportFieldValueProvider`

**Behavior:**

| Method | Return value |
|---|---|
| `getFormatString` | `''` always |
| `getFormattedValue` | `value` as-is (the first argument) |
| `getHighlightValue` | `baseValue` as-is (the third argument) |

When this provider is used with a plan that has `emitHighlight: true`, the highlight column will equal the base value, producing an `'eq'` comparator for every row.

---

## 3. Integration Guide

### Implementing `SupportFieldValueProvider` for a new platform

Create an object (or factory function) that satisfies the three-method interface. All three methods are required; there are no optional members.

```typescript
import type { SupportFieldValueProvider } from '@deneb-viz/data-core/support-fields';

const myProvider: SupportFieldValueProvider = {
    getFormatString(fieldIndex, rowIndex) {
        // Return the format string from the platform data source.
        // Return '' if the platform does not expose format strings,
        // or if this particular field/row has no format string.
        return myDataView.getFormatString(fieldIndex) ?? '';
    },

    getFormattedValue(value, formatString, locale) {
        // Apply formatString to value using the platform formatter.
        // Return value as-is when no formatting is available or
        // when formatString is '' (the passthrough contract).
        if (!formatString) return value;
        return myFormatter.format(value, formatString, locale);
    },

    getHighlightValue(fieldIndex, rowIndex, baseValue) {
        // Return the highlight value from the platform data source.
        // Return baseValue when the platform does not support highlights
        // for this field/row. Returning baseValue produces an 'eq'
        // comparator and a 'neutral' / 'on' status, which is safe.
        return myDataView.getHighlight(fieldIndex, rowIndex) ?? baseValue;
    }
};
```

**Behavioral contracts:**

- `getFormatString` **must** return `''` (empty string) when no format string is available. Returning `null` or `undefined` will cause unexpected behavior in `getFormattedValue`.
- `getFormattedValue` **must** return the `value` argument as-is when formatting is unavailable. This preserves the raw value in the `__formatted__` column rather than producing `null`.
- `getHighlightValue` **must** return `baseValue` when the platform does not support highlights. This results in an `'eq'` comparator and does not corrupt the `__highlight__` column.

**Using the default provider as a starting point:**

```typescript
import { createDefaultProvider } from '@deneb-viz/data-core/support-fields';

const base = createDefaultProvider();

const myProvider: SupportFieldValueProvider = {
    ...base,
    // Override only the methods your platform supports:
    getHighlightValue(fieldIndex, rowIndex, baseValue) {
        return myDataView.getHighlight(fieldIndex, rowIndex) ?? baseValue;
    }
};
```

---

## 4. Usage Example

Complete minimal example from plan construction to row output:

```typescript
import {
    buildProcessingPlan,
    buildDataRow,
    createDefaultProvider
} from '@deneb-viz/data-core/support-fields';

// 1. Create provider (or use default)
const provider = createDefaultProvider();

// 2. Build plan (once, before row loop)
const plan = buildProcessingPlan({
    fields: [
        { encodedName: 'Sales', sourceIndex: 0, role: 'aggregation' },
        { encodedName: 'Region', sourceIndex: 0, role: 'grouping' }
    ],
    configuration: {},  // empty = use defaults for all fields
    masterSettings: { crossHighlightEnabled: false, crossFilterEnabled: false },
    hasHighlights: false,
    isLegacy: false
});

// 3. Build rows (call once per row)
const row = buildDataRow({
    plan,
    provider,
    baseValues: [15000, 'North'],
    rowIndex: 0,
    locale: 'en-US'
});
// row = { __row__: 0, Sales: 15000, Region: 'North' }
// (no support fields because all flags are false for a new spec
//  with crossHighlightEnabled: false)
```

With cross-highlight enabled and a platform provider:

```typescript
const plan = buildProcessingPlan({
    fields: [
        { encodedName: 'Sales', sourceIndex: 0, role: 'aggregation' },
        { encodedName: 'Region', sourceIndex: 0, role: 'grouping' }
    ],
    configuration: {},
    masterSettings: { crossHighlightEnabled: true, crossFilterEnabled: true },
    hasHighlights: true,
    isLegacy: false
});

const row = buildDataRow({
    plan,
    provider: myPlatformProvider,  // real highlight/format resolution
    baseValues: [15000, 'North'],
    rowIndex: 0,
    selectionStatus: 'neutral',
    locale: 'en-US'
});
// row = {
//   __row__: 0,
//   __selected__: 'neutral',
//   Sales: 15000,
//   Sales__highlight: <highlight value from provider>,
//   Region: 'North'
// }
```

---

## 5. Default Behavior Table

The table below shows what each flag defaults to when a field has **no** explicit entry in `SupportFieldConfiguration`. Flags from an explicit configuration entry are used verbatim and bypass this table entirely.

### New specs (`isLegacy: false`)

| Flag | Measure (`aggregation`) | Column (`grouping`) |
|---|---|---|
| `highlight` | `crossHighlightEnabled` | `false` |
| `highlightStatus` | `false` | `false` |
| `highlightComparator` | `false` | `false` |
| `format` | `false` | `false` |
| `formatted` | `false` | `false` |

### Legacy specs (`isLegacy: true`)

| Flag | Measure (`aggregation`) | Column (`grouping`) |
|---|---|---|
| `highlight` | `crossHighlightEnabled` | `false` |
| `highlightStatus` | `crossHighlightEnabled` | `false` |
| `highlightComparator` | `crossHighlightEnabled` | `false` |
| `format` | `true` | `false` |
| `formatted` | `true` | `false` |

**Notes:**

- "Measure" means `role === 'aggregation'`; "Column" means `role === 'grouping'`.
- `crossHighlightEnabled` refers to `masterSettings.crossHighlightEnabled`.
- Legacy mode (`isLegacy: true`) matches pre-2.0 behavior exactly, emitting format and formatted fields for all measures by default.
- New specs opt in to each support field explicitly through `SupportFieldConfiguration` (or get only the minimal `highlight` field when cross-highlight is enabled).
