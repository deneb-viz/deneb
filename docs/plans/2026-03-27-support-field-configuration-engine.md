# Support Field Configuration Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable per-field configuration of support fields (highlight, format, formatted) in Deneb's dataset processing, with platform-agnostic engine in `data-core` and Power BI-specific integration in the root visual.

**Architecture:** New types and pure functions in `@deneb-viz/data-core` define the configuration model, defaults resolution, processing plan building, and row execution. The root visual provides a Power BI-specific value provider, persistence via `stateManagement`, and migration logic. The processing plan pattern pre-computes all flag resolution before the row loop to preserve hot-path performance.

**Tech Stack:** TypeScript 5.6, Vitest, Zustand, Power BI Visuals API

**Spec:** `docs/superpowers/specs/2026-03-27-support-field-configuration-engine-design.md`

---

### Task 1: Support Field Types & Interfaces in data-core

**Files:**
- Create: `packages/data-core/src/lib/support-fields/types.ts`
- Create: `packages/data-core/src/lib/support-fields/index.ts`
- Modify: `packages/data-core/package.json` (add export)

- [ ] **Step 1: Create the types module**

```typescript
// packages/data-core/src/lib/support-fields/types.ts
import type { PrimitiveValue } from '../value/types';

/**
 * Per-field flags controlling which support fields are generated.
 * When all flags for a field are written (user has configured), the
 * entry is present in the sparse configuration. Absent entries fall
 * through to defaults.
 */
export type SupportFieldFlags = {
    highlight: boolean;
    highlightStatus: boolean;
    highlightComparator: boolean;
    format: boolean;
    formatted: boolean;
};

/**
 * Sparse configuration: keyed by encoded field name.
 * Only fields explicitly configured by the user are present.
 */
export type SupportFieldConfiguration = Record<string, SupportFieldFlags>;

/**
 * Master settings that influence default flag resolution.
 */
export type SupportFieldMasterSettings = {
    crossHighlightEnabled: boolean;
    crossFilterEnabled: boolean;
};

/**
 * Platform-injected handlers for resolving support field values.
 * The engine always produces support fields when flags say so;
 * the platform determines the values.
 */
export type SupportFieldValueProvider = {
    /** Resolve format string for a field at a given row. Returns '' if unavailable. */
    getFormatString: (fieldIndex: number, rowIndex: number) => string;
    /** Produce a formatted display value from a raw value and format string. */
    getFormattedValue: (
        value: PrimitiveValue,
        formatString: string,
        locale: string
    ) => PrimitiveValue;
    /** Get the highlight value for a field at a given row. Returns base value if unavailable. */
    getHighlightValue: (
        fieldIndex: number,
        rowIndex: number,
        baseValue: PrimitiveValue
    ) => PrimitiveValue;
};

/**
 * Pre-computed instruction for a single field in the processing plan.
 * All flag resolution happens at plan-build time, not during the row loop.
 */
export type FieldProcessingInstruction = {
    encodedName: string;
    sourceIndex: number;
    role: 'grouping' | 'aggregation';
    emitHighlight: boolean;
    emitHighlightStatus: boolean;
    emitHighlightComparator: boolean;
    emitFormat: boolean;
    emitFormatted: boolean;
};

/**
 * Complete processing plan, built once before the row loop.
 */
export type ProcessingPlan = {
    fields: FieldProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
```

- [ ] **Step 2: Create the index module**

```typescript
// packages/data-core/src/lib/support-fields/index.ts
export type {
    SupportFieldFlags,
    SupportFieldConfiguration,
    SupportFieldMasterSettings,
    SupportFieldValueProvider,
    FieldProcessingInstruction,
    ProcessingPlan
} from './types';
```

- [ ] **Step 3: Add package export**

Add to `packages/data-core/package.json` exports:

```json
"./support-fields": {
    "types": "./dist/lib/support-fields/index.d.ts",
    "default": "./dist/lib/support-fields/index.js"
}
```

- [ ] **Step 4: Build and verify**

Run: `cd packages/data-core && npm run build`
Expected: Clean build, new dist files generated for support-fields

- [ ] **Step 5: Commit**

```bash
git add packages/data-core/src/lib/support-fields/ packages/data-core/package.json
git commit -m "feat(data-core): add support field configuration types and interfaces"
```

---

### Task 2: Default Resolution with TDD

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__tests__/resolve-defaults.test.ts`
- Create: `packages/data-core/src/lib/support-fields/resolve-defaults.ts`
- Modify: `packages/data-core/src/lib/support-fields/index.ts`

- [ ] **Step 1: Write failing tests for resolveFieldDefaults**

```typescript
// packages/data-core/src/lib/support-fields/__tests__/resolve-defaults.test.ts
import { describe, expect, it } from 'vitest';
import { resolveFieldDefaults } from '../resolve-defaults';
import type { SupportFieldMasterSettings } from '../types';

const HIGHLIGHT_ON: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: false
};

const ALL_OFF: SupportFieldMasterSettings = {
    crossHighlightEnabled: false,
    crossFilterEnabled: false
};

describe('resolveFieldDefaults', () => {
    describe('new spec defaults', () => {
        describe('measure fields', () => {
            it('should enable highlight only when cross-highlight is on', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.highlight).toBe(true);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable all highlight flags when cross-highlight is off', () => {
                const result = resolveFieldDefaults({
                    masterSettings: ALL_OFF,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.highlight).toBe(false);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable format and formatted by default', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.format).toBe(false);
                expect(result.formatted).toBe(false);
            });
        });

        describe('column fields', () => {
            it('should disable all highlight flags regardless of master setting', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'grouping',
                    isLegacy: false
                });
                expect(result.highlight).toBe(false);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable format and formatted by default', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'grouping',
                    isLegacy: false
                });
                expect(result.format).toBe(false);
                expect(result.formatted).toBe(false);
            });
        });
    });

    describe('legacy spec defaults', () => {
        it('should enable all highlight flags for measures when cross-highlight is on', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'aggregation',
                isLegacy: true
            });
            expect(result.highlight).toBe(true);
            expect(result.highlightStatus).toBe(true);
            expect(result.highlightComparator).toBe(true);
        });

        it('should enable format and formatted for measures', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'aggregation',
                isLegacy: true
            });
            expect(result.format).toBe(true);
            expect(result.formatted).toBe(true);
        });

        it('should disable highlight flags for columns even in legacy mode', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'grouping',
                isLegacy: true
            });
            expect(result.highlight).toBe(false);
            expect(result.highlightStatus).toBe(false);
            expect(result.highlightComparator).toBe(false);
        });

        it('should disable format and formatted for columns in legacy mode', () => {
            const result = resolveFieldDefaults({
                masterSettings: ALL_OFF,
                fieldRole: 'grouping',
                isLegacy: true
            });
            expect(result.format).toBe(false);
            expect(result.formatted).toBe(false);
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/resolve-defaults.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement resolveFieldDefaults**

```typescript
// packages/data-core/src/lib/support-fields/resolve-defaults.ts
import type {
    SupportFieldFlags,
    SupportFieldMasterSettings
} from './types';
import type { DatasetFieldRole } from '../field/types';

export type ResolveFieldDefaultsParams = {
    masterSettings: SupportFieldMasterSettings;
    fieldRole: DatasetFieldRole;
    isLegacy: boolean;
};

/**
 * Resolve default support field flags for a field that has no explicit
 * configuration. Pure function — no side effects, fully testable.
 *
 * New specs: highlight on for measures (if cross-highlight enabled),
 * everything else off.
 *
 * Legacy specs: everything on that master settings allow, matching
 * pre-2.0 behavior exactly.
 */
export const resolveFieldDefaults = ({
    masterSettings,
    fieldRole,
    isLegacy
}: ResolveFieldDefaultsParams): SupportFieldFlags => {
    const isMeasure = fieldRole === 'aggregation';
    const highlightApplicable =
        isMeasure && masterSettings.crossHighlightEnabled;

    if (isLegacy) {
        return {
            highlight: highlightApplicable,
            highlightStatus: highlightApplicable,
            highlightComparator: highlightApplicable,
            format: isMeasure,
            formatted: isMeasure
        };
    }

    return {
        highlight: highlightApplicable,
        highlightStatus: false,
        highlightComparator: false,
        format: false,
        formatted: false
    };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/resolve-defaults.test.ts`
Expected: All PASS

- [ ] **Step 5: Export from index and commit**

Add to `packages/data-core/src/lib/support-fields/index.ts`:
```typescript
export {
    resolveFieldDefaults,
    type ResolveFieldDefaultsParams
} from './resolve-defaults';
```

```bash
git add packages/data-core/src/lib/support-fields/
git commit -m "feat(data-core): add resolveFieldDefaults with TDD"
```

---

### Task 3: Processing Plan Builder with TDD

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan.test.ts`
- Create: `packages/data-core/src/lib/support-fields/build-processing-plan.ts`
- Modify: `packages/data-core/src/lib/support-fields/index.ts`

- [ ] **Step 1: Write failing tests**

Tests should cover:
- Unconfigured fields use defaults (new spec, legacy spec)
- Configured fields use explicit flags
- Master setting off suppresses all related flags for unconfigured fields
- `emitSelected` derived from `crossFilterEnabled`
- `hasHighlights` passed through
- Empty field list produces empty plan
- Mix of configured and unconfigured fields

The function signature:

```typescript
export type BuildProcessingPlanParams = {
    fields: Array<{
        encodedName: string;
        sourceIndex: number;
        role: DatasetFieldRole;
    }>;
    configuration: SupportFieldConfiguration;
    masterSettings: SupportFieldMasterSettings;
    hasHighlights: boolean;
    isLegacy: boolean;
};

export const buildProcessingPlan = (
    params: BuildProcessingPlanParams
): ProcessingPlan;
```

Write tests following the same pattern as Task 2: describe blocks for each scenario, explicit assertions on each `emit*` flag per field instruction. Verify the plan's `emitSelected` and `hasHighlights` properties.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/build-processing-plan.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement buildProcessingPlan**

The function iterates `params.fields` once. For each field, it checks `params.configuration[field.encodedName]`. If present, uses those flags directly. If absent, calls `resolveFieldDefaults()` with the field's role + master settings + legacy flag. Returns a `ProcessingPlan` with the instruction array and row-level flags.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/build-processing-plan.test.ts`
Expected: All PASS

- [ ] **Step 5: Export and commit**

Add exports to index, commit:
```bash
git commit -m "feat(data-core): add buildProcessingPlan with TDD"
```

---

### Task 4: Row Builder with TDD

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__tests__/build-data-row.test.ts`
- Create: `packages/data-core/src/lib/support-fields/build-data-row.ts`
- Modify: `packages/data-core/src/lib/support-fields/index.ts`

- [ ] **Step 1: Write failing tests**

Tests should cover:
- Base value always emitted for each field
- Highlight value emitted only when `emitHighlight` is true
- Highlight status and comparator emitted only when respective flags are true
- Format string emitted only when `emitFormat` is true
- Formatted value emitted only when `emitFormatted` is true
- Provider methods called with correct indices
- Provider returning empty string / base value (default provider behavior)
- `__row__` always set
- `__selected__` set only when `plan.emitSelected` is true

The function should accept:
```typescript
export type BuildDataRowParams = {
    plan: ProcessingPlan;
    provider: SupportFieldValueProvider;
    baseValues: PrimitiveValue[];  // One per field in plan, in same order
    rowIndex: number;
    selectionStatus?: string;  // e.g., 'neutral', 'on', 'off'
    locale: string;
};
```

And return a `VegaDatum`.

Use a mock `SupportFieldValueProvider` in tests — simple object with vi.fn() methods returning predictable values.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/build-data-row.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement buildDataRow**

Iterate `plan.fields`. For each instruction:

1. Set the base value: `row[instruction.encodedName] = baseValues[i]`
2. If `emitHighlight`: get highlight value from provider via `provider.getHighlightValue(instruction.sourceIndex, rowIndex, baseValues[i])`, set as `row[encodedName + HIGHLIGHT_FIELD_SUFFIX]`
3. If `emitHighlightStatus`: **derive** from base value + highlight value using `getHighlightStatusValue(plan.hasHighlights, baseValue, highlightValue)` from `../value/highlight.ts` → `'on'`/`'off'`/`'neutral'`
4. If `emitHighlightComparator`: **derive** from base value + highlight value using `getHighlightComparatorValue(baseValue, highlightValue)` from `../value/highlight.ts` → `'eq'`/`'lt'`/`'gt'`/`'neq'`
5. If `emitFormat`: get format string from provider via `provider.getFormatString(instruction.sourceIndex, rowIndex)`, set as `row[encodedName + FORMAT_FIELD_SUFFIX]`
6. If `emitFormatted`: get formatted value from provider via `provider.getFormattedValue(baseValue, formatString, locale)`, set as `row[encodedName + FORMATTED_FIELD_SUFFIX]`

Note: steps 3-4 depend on the highlight value from step 2. If `emitHighlightStatus` or `emitHighlightComparator` is true but `emitHighlight` is false, the highlight value still needs to be resolved (via the provider) for the derivation — it just isn't written to the row. Handle this by always resolving the highlight value when any highlight flag is on, then conditionally emitting each field.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/build-data-row.test.ts`
Expected: All PASS

- [ ] **Step 5: Export and commit**

```bash
git commit -m "feat(data-core): add buildDataRow with TDD"
```

---

### Task 5: Default Provider Factory with TDD

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__tests__/default-provider.test.ts`
- Create: `packages/data-core/src/lib/support-fields/default-provider.ts`
- Modify: `packages/data-core/src/lib/support-fields/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/data-core/src/lib/support-fields/__tests__/default-provider.test.ts
import { describe, expect, it } from 'vitest';
import { createDefaultProvider } from '../default-provider';

describe('createDefaultProvider', () => {
    const provider = createDefaultProvider();

    describe('getFormatString', () => {
        it('should return empty string for any field and row', () => {
            expect(provider.getFormatString(0, 0)).toBe('');
            expect(provider.getFormatString(5, 100)).toBe('');
        });
    });

    describe('getFormattedValue', () => {
        it('should return the base value as-is', () => {
            expect(provider.getFormattedValue(42, '', 'en-US')).toBe(42);
            expect(provider.getFormattedValue('hello', '', 'en-US')).toBe('hello');
            expect(provider.getFormattedValue(null, '#,0', 'en-US')).toBe(null);
        });
    });

    describe('getHighlightValue', () => {
        it('should return the base value (no highlight data available)', () => {
            expect(provider.getHighlightValue(0, 0, 100)).toBe(100);
            expect(provider.getHighlightValue(3, 5, 'text')).toBe('text');
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/default-provider.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement createDefaultProvider**

```typescript
// packages/data-core/src/lib/support-fields/default-provider.ts
import type { SupportFieldValueProvider } from './types';

/**
 * Create a default (passthrough) support field value provider.
 * Suitable for platforms that don't support highlights or formatting,
 * or as a base for partial overrides.
 *
 * Behavior:
 * - Format strings: '' (empty)
 * - Formatted values: base value as-is
 * - Highlight values: base value (equal to source, effectively 'eq')
 */
export const createDefaultProvider = (): SupportFieldValueProvider => ({
    getFormatString: () => '',
    getFormattedValue: (value) => value,
    getHighlightValue: (_fieldIndex, _rowIndex, baseValue) => baseValue
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/data-core && npx vitest run src/lib/support-fields/__tests__/default-provider.test.ts`
Expected: All PASS

- [ ] **Step 5: Export and commit**

Add to index:
```typescript
export { createDefaultProvider } from './default-provider';
```

```bash
git commit -m "feat(data-core): add default support field value provider with TDD"
```

---

### Task 6: Power BI Value Provider

**Files:**
- Create: `src/lib/dataset/support-field-provider.ts`
- Create: `src/lib/dataset/__test__/support-field-provider.test.ts`

- [ ] **Step 1: Write failing tests**

Test the Power BI provider implementation. Use mock `DataViewValueColumn` and `DataViewCategoryColumn` objects. Test:
- `getFormatString` returns column-level format, falls back to row-level format, falls back to `''`
- `getFormattedValue` calls Power BI formatting (mock `getFormattedValue` from `@deneb-viz/powerbi-compat/formatting`)
- `getHighlightValue` returns highlight value when available, base value when not

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dataset/__test__/support-field-provider.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the Power BI provider**

The provider captures references to `DataViewCategoryColumn[]` and `DataViewValueColumns` at construction time (once per `getMappedDataset` call). Methods resolve values from these references by field index and row index. This follows the existing pattern in `src/lib/dataset/values.ts` where value arrays are pre-extracted.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Power BI support field value provider with TDD"
```

---

### Task 7: Persistence — Capabilities, Settings Model, Sync Mapping

**Files:**
- Modify: `capabilities.json` (add `supportFieldConfiguration` to `stateManagement`)
- Modify: `src/lib/persistence/model/settings-state-management.ts` (add property)
- Create: `src/lib/state/support-field-sync-mappings.ts` (or add to project sync mappings)
- Modify: `packages/app-core/src/state/project.ts` (add to project slice)
- Modify: `src/lib/state/sync.ts` (wire up sync)

- [ ] **Step 1: Add capability property**

Add to `stateManagement.properties` in `capabilities.json`:
```json
"supportFieldConfiguration": {
    "type": { "text": true }
}
```

- [ ] **Step 2: Add to settings model**

Add `supportFieldConfiguration` as a `ReadOnlyText` property in `SettingsStateManagement`, following the same pattern as `viewportHeight`/`viewportWidth`.

- [ ] **Step 3: Add to project slice**

Add `supportFieldConfiguration: SupportFieldConfiguration` to `ProjectSliceProperties`. Initialize as `{}` (empty — triggers defaults). Add to `syncProjectData` payload handling and `initializeFromTemplate` for template import.

- [ ] **Step 4: Add sync mapping**

Add a mapping entry to the project sync mappings:
```typescript
{
    sliceKey: 'supportFieldConfiguration',
    getVisualValue: (settings) => {
        const raw = settings.stateManagement?.stateProperties?.supportFieldConfiguration?.value;
        return raw ? JSON.parse(raw) : {};
    },
    persistence: {
        objectName: 'stateManagement',
        propertyName: 'supportFieldConfiguration'
    }
}
```

The `onPersist` serializes to JSON string for Power BI storage.

- [ ] **Step 5: Build and verify sync round-trip**

Run: `npm run webpack:build`
Expected: Clean build. Manually verify in Power BI dev tools that the property appears in stateManagement.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add supportFieldConfiguration persistence and sync"
```

---

### Task 8: Migration Logic

**Files:**
- Create: `src/lib/dataset/support-field-migration.ts`
- Create: `src/lib/dataset/__test__/support-field-migration.test.ts`

- [ ] **Step 1: Write failing tests**

Test `isLegacySpec`:
- Returns `true` when `jsonSpec` is non-default AND `supportFieldConfiguration` is absent/empty
- Returns `false` when `supportFieldConfiguration` is present with entries
- Returns `false` when `jsonSpec` is the default template (brand new spec)

- [ ] **Step 2: Implement isLegacySpec**

```typescript
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

export const isLegacySpec = (
    jsonSpec: string,
    supportFieldConfiguration: SupportFieldConfiguration
): boolean => {
    const hasProject = jsonSpec !== PROJECT_DEFAULTS.spec;
    const hasConfig = Object.keys(supportFieldConfiguration).length > 0;
    return hasProject && !hasConfig;
};
```

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add support field migration detection with TDD"
```

---

### Task 9: Wire into getMappedDataset

**Files:**
- Modify: `src/lib/dataset/processing.ts`

This is the integration task. Replace the current inline row-building logic with the plan-based approach.

- [ ] **Step 1: Import new modules**

Add imports for `buildProcessingPlan`, `buildDataRow`, `isLegacySpec`, and the Power BI provider factory.

- [ ] **Step 2: Build processing plan before the row loop**

In `getMappedDataset`, after field metadata extraction and before the row loop:
- Get `supportFieldConfiguration` from visual state
- Determine `isLegacy` via `isLegacySpec()`
- Build `SupportFieldMasterSettings` from `isCrossFilterPropSet()` and `isCrossHighlightPropSet()`
- Create the Power BI `SupportFieldValueProvider`
- Call `buildProcessingPlan()` to get the plan

- [ ] **Step 3: Replace the row loop**

Replace the current row loop (lines 292-310) with plan-based execution:

```typescript
const values: VegaDatum[] = [];
for (let r = 0; r < rowsLoaded; r++) {
    selectionQueue.rowNumber = r;
    const selector = InteractivityManager.addRowSelector(selectionQueue);
    const row = buildDataRow({
        plan,
        provider: pbiProvider,
        baseValues: fieldValues.map(fv => fv[r]),
        rowIndex: r,
        selectionStatus: plan.emitSelected ? selector?.status : undefined,
        locale
    });
    values.push(row);
}
```

Note: The `baseValues` extraction may need optimization — pre-extracting per-row values avoids creating arrays per iteration. Profile and adjust based on the existing pattern of iterating `fields` with `values[fi][rowIndex]`.

- [ ] **Step 4: Remove superseded code**

Remove the old `getDataRow()` function and the inline support field logic from `getMappedDataset`. Keep the selection queue building (Power BI-specific, not part of the generic engine).

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: All existing tests pass. Any failures indicate integration issues to fix.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`
Load a Power BI report with:
- A spec with cross-highlight enabled → verify highlight fields still appear
- A spec with format fields → verify format/formatted still appear
- A plain spec → verify no support fields beyond `__row__`

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: wire support field processing plan into getMappedDataset"
```

---

### Task 10: Template Export/Import Support

**Files:**
- Modify: `packages/template-usermeta/src/types.ts` (add `supportFieldConfiguration` to template type)
- Modify: `packages/app-core/src/state/export.ts` (capture config in export metadata)
- Modify: `packages/app-core/src/state/project.ts` (restore config on template import)

- [ ] **Step 1: Add to template type**

Add `supportFieldConfiguration?: SupportFieldConfiguration` to `UsermetaTemplate` interface. Optional for backward compatibility with templates that predate this feature.

- [ ] **Step 2: Capture on export**

In the export metadata flow, include `supportFieldConfiguration` from the project slice. The sparse object is serialized as-is — field names are tokenized during the existing field tokenization pass.

- [ ] **Step 3: Restore on import**

In `initializeFromTemplate`, if the template includes `supportFieldConfiguration`, remap the keys from template placeholders to actual field names (following the field remap mapping), then set on the project slice. If absent, leave as `{}` (defaults apply).

- [ ] **Step 4: Test round-trip**

Write a test that exports a template with support field configuration, then imports it and verifies the configuration is restored with remapped field names.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add support field configuration to template export/import"
```

---

### Task 11: Developer Documentation

**Files:**
- Create: `packages/data-core/doc/support-fields.md`

- [ ] **Step 1: Write API reference**

Document all exported types and functions from `@deneb-viz/data-core/support-fields`:
- Type definitions with descriptions
- `resolveFieldDefaults()` — params, return, behavior
- `buildProcessingPlan()` — params, return, behavior
- `buildDataRow()` — params, return, behavior
- `createDefaultProvider()` — return, behavior

- [ ] **Step 2: Write integration guide**

Cover:
- How to implement `SupportFieldValueProvider` for a new platform
- How to call `buildProcessingPlan()` and execute via `buildDataRow()`
- How the default provider works as a starting point for partial overrides
- Behavioral contracts (empty string for unavailable format strings, base value for unavailable highlights)

- [ ] **Step 3: Write minimal example**

Show a complete example of a platform integration using the default provider with one method overridden (e.g., custom format string resolution).

- [ ] **Step 4: Commit**

```bash
git commit -m "docs(data-core): add support field API documentation for integrators"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass across all packages.

- [ ] **Step 2: Run linter**

Run: `npm run eslint`
Expected: No new errors.

- [ ] **Step 3: Check coverage**

Run: `cd packages/data-core && npx vitest run --coverage`
Expected: 90%+ coverage on all new files in `src/lib/support-fields/`.

- [ ] **Step 4: Build production**

Run: `npm run webpack:build`
Expected: Clean build, no type errors.

- [ ] **Step 5: Manual end-to-end test**

In Power BI dev environment:
1. Load existing spec → verify legacy behavior (all support fields present)
2. Create new spec → verify new defaults (only highlight for measures)
3. Toggle cross-highlight off and on → verify memoized config preserved
4. Export template → verify config included in usermeta
5. Import template → verify config restored with remapped field names
