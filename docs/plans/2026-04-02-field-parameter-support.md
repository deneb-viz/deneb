# Field Parameter Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Power BI field parameters to consolidate component fields into stable, parameter-named array columns in the Deneb dataset, with support for passthrough mode, per-field "treat as field parameter" flagging, and template integration.

**Architecture:** Extends the existing support field processing plan pattern with a new `'field-parameter'` role and `ParameterProcessingInstruction` type. Power BI-specific detection groups fields by `sourceFieldParameters` metadata. A global `consolidateFieldParameters` setting (persisted in `stateManagement`) controls the mode. Per-field "treat as field parameter" toggles allow manual array wrapping. Template export/import uses a new `'parameter'` kind in `UsermetaDatasetFieldKind`.

**Tech Stack:** Power BI Visuals API 5.11 (`sourceFieldParameters`), `@deneb-viz/data-core` (processing plan), `@fabric-msft/svg-icons` (`TableColumnQuestion`), Zustand, Fluent UI

**Ref:** [#238](https://github.com/deneb-viz/deneb/issues/238)

---

### Task 1: Extend data-core types for field parameters

Add the `'field-parameter'` role, parameter-specific processing instruction type, and the `__names` field suffix constant.

**Files:**
- Modify: `packages/data-core/src/lib/field/types.ts:4`
- Modify: `packages/data-core/src/lib/field/constants.ts`
- Modify: `packages/data-core/src/lib/support-fields/types.ts:57-75`

- [ ] **Step 1: Add `'field-parameter'` to DatasetFieldRole**

In `packages/data-core/src/lib/field/types.ts`, change line 4:

```typescript
export type DatasetFieldRole = 'grouping' | 'aggregation' | 'field-parameter';
```

- [ ] **Step 2: Add `PARAMETER_NAMES_SUFFIX` constant**

In `packages/data-core/src/lib/field/constants.ts`, add after `FORMATTED_FIELD_SUFFIX`:

```typescript
/**
 * For a field parameter, this is suffixed to the parameter name to denote
 * the array of component field display names.
 */
export const PARAMETER_NAMES_SUFFIX = '__names';
```

- [ ] **Step 3: Add `ParameterProcessingInstruction` type**

In `packages/data-core/src/lib/support-fields/types.ts`, add after `FieldProcessingInstruction`:

```typescript
/**
 * Pre-computed instruction for a consolidated field parameter.
 * Component fields are merged into array-valued columns at row execution time.
 */
export type ParameterProcessingInstruction = {
    kind: 'parameter';
    /** Encoded name of the field parameter (used as the column name). */
    encodedName: string;
    /**
     * Indices into the baseValues array for each component field.
     * Order matches the DataView order.
     */
    componentIndices: number[];
    /**
     * Pre-built array of component field display names (row-invariant).
     * The same reference is reused for every row.
     */
    namesArray: string[];
    /**
     * Pre-built array of format strings for component fields (row-invariant
     * for columns; measures may need per-row resolution via provider).
     * undefined when format emission is disabled.
     */
    formatStringsArray?: string[];
    /** Whether to emit the __format companion field. */
    emitFormat: boolean;
    /** Whether to emit the __formatted companion field. */
    emitFormatted: boolean;
};
```

- [ ] **Step 4: Add discriminant to `FieldProcessingInstruction`**

Update the existing `FieldProcessingInstruction` to include a `kind` discriminant:

```typescript
export type FieldProcessingInstruction = {
    kind: 'field';
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

- [ ] **Step 5: Update `ProcessingPlan` to use a union type**

Update `ProcessingPlan` in the same file:

```typescript
/**
 * A single instruction in the processing plan — either a regular field
 * or a consolidated field parameter.
 */
export type ProcessingInstruction =
    | FieldProcessingInstruction
    | ParameterProcessingInstruction;

/**
 * Complete processing plan, built once before the row loop.
 */
export type ProcessingPlan = {
    fields: ProcessingInstruction[];
    emitSelected: boolean;
    hasHighlights: boolean;
};
```

- [ ] **Step 6: Add `'parameter'` to `UsermetaDatasetFieldKind`**

In `packages/data-core/src/lib/field/types.ts`, update `UsermetaDatasetFieldKind`:

```typescript
export type UsermetaDatasetFieldKind = 'column' | 'measure' | 'parameter' | 'any';
```

- [ ] **Step 7: Update `roleToKind` and `kindToRole` for field parameters**

In `packages/data-core/src/lib/field/template-metadata.ts`, update:

```typescript
export const roleToKind = (
    role?: DatasetFieldRole
): UsermetaDatasetFieldKind | undefined => {
    if (role === 'aggregation') return 'measure';
    if (role === 'grouping') return 'column';
    if (role === 'field-parameter') return 'parameter';
    return undefined;
};

export const kindToRole = (
    kind?: UsermetaDatasetFieldKind
): DatasetFieldRole | undefined => {
    if (kind === 'measure') return 'aggregation';
    if (kind === 'column') return 'grouping';
    if (kind === 'parameter') return 'field-parameter';
    return undefined;
};
```

- [ ] **Step 8: Update existing tests that may break**

The `kind: 'field'` discriminant added to `FieldProcessingInstruction` will break existing tests for `buildProcessingPlan` and `buildDataRow`. Update all existing test fixtures to include `kind: 'field'` in expected instruction objects.

Run: `npm run test`
Fix any failures by adding `kind: 'field'` to test expectations.

- [ ] **Step 9: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile (after fixing type errors from the discriminant addition).

- [ ] **Step 10: Commit**

```
feat(data-core): add field-parameter types and processing instruction

Ref: #238
```

---

### Task 2: Update plan building for the `kind` discriminant

The existing `buildProcessingPlan` needs to emit `kind: 'field'` on every instruction. This is a minimal change to maintain backward compatibility before adding parameter support.

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/build-processing-plan.ts:43-62`

- [ ] **Step 1: Add `kind: 'field'` to instruction output**

In `packages/data-core/src/lib/support-fields/build-processing-plan.ts`, update the return object in the `fields.map()` callback (line ~50):

```typescript
        return {
            kind: 'field' as const,
            encodedName: field.encodedName,
            sourceIndex: field.sourceIndex,
            role: field.role,
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        };
```

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: All pass (tests were updated in Task 1 Step 8).

- [ ] **Step 3: Commit**

```
feat(data-core): emit kind discriminant in processing plan instructions

Ref: #238
```

---

### Task 3: Update row building for the discriminated union

Update `buildDataRow` to handle the `kind` discriminant. For now, only `'field'` is processed — `'parameter'` support comes in Task 5.

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/build-data-row.ts:37-88`

- [ ] **Step 1: Add kind check in the row loop**

In `packages/data-core/src/lib/support-fields/build-data-row.ts`, wrap the existing per-field logic in a `kind === 'field'` check. The loop body becomes:

```typescript
    for (let i = 0; i < plan.fields.length; i++) {
        const instruction = plan.fields[i]!;

        if (instruction.kind === 'field') {
            const { encodedName } = instruction;
            const baseValue = baseValues[i] as PrimitiveValue;

            row[encodedName] = baseValue;

            // ... existing highlight/format/formatted logic unchanged ...
        }
        // 'parameter' kind will be handled in Task 5
    }
```

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 3: Commit**

```
refactor(data-core): guard row building with kind discriminant

Ref: #238
```

---

### Task 4: Field parameter detection and grouping

Create a Power BI-specific module that detects `sourceFieldParameters` metadata and groups fields by parameter name.

**Files:**
- Create: `src/lib/dataset/field-parameter-detection.ts`
- Create: `src/lib/dataset/__test__/field-parameter-detection.test.ts`

- [ ] **Step 1: Write tests**

Create `src/lib/dataset/__test__/field-parameter-detection.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    detectFieldParameterGroups,
    type FieldParameterGroup,
    type DetectableField
} from '../field-parameter-detection';

const makeField = (
    displayName: string,
    sourceIndex: number,
    isMeasure: boolean,
    parameterName?: string
): DetectableField => ({
    displayName,
    sourceIndex,
    isMeasure,
    sourceFieldParameters: parameterName
        ? [{ displayName: parameterName }]
        : undefined
});

describe('detectFieldParameterGroups', () => {
    it('should return empty groups when no fields have parameters', () => {
        const fields = [
            makeField('Year', 0, false),
            makeField('$ Sales', 0, true)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(result.parameterGroups).toEqual({});
        expect(result.regularFieldIndices).toEqual([0, 1]);
    });

    it('should group fields by parameter name', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Dynamic Category'),
            makeField('Segment', 1, false, 'Dynamic Category'),
            makeField('Product', 2, false, 'Dynamic Category'),
            makeField('$ Sales', 0, true)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Dynamic Category'
        ]);
        const group = result.parameterGroups['Dynamic Category'];
        expect(group.parameterName).toBe('Dynamic Category');
        expect(group.componentNames).toEqual([
            'Country Code',
            'Segment',
            'Product'
        ]);
        expect(group.componentFieldIndices).toEqual([0, 1, 2]);
        expect(result.regularFieldIndices).toEqual([3]);
    });

    it('should handle multiple parameters', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Dynamic Category'),
            makeField('Segment', 1, false, 'Dynamic Category'),
            makeField('$ Sales', 0, true, 'Dynamic Measure'),
            makeField('# Units', 1, true, 'Dynamic Measure'),
            makeField('Year', 2, false)
        ];
        const result = detectFieldParameterGroups(fields);
        expect(Object.keys(result.parameterGroups)).toEqual([
            'Dynamic Category',
            'Dynamic Measure'
        ]);
        expect(
            result.parameterGroups['Dynamic Category'].componentFieldIndices
        ).toEqual([0, 1]);
        expect(
            result.parameterGroups['Dynamic Measure'].componentFieldIndices
        ).toEqual([2, 3]);
        expect(result.regularFieldIndices).toEqual([4]);
    });

    it('should preserve DataView order within groups', () => {
        const fields = [
            makeField('Product', 0, false, 'Dynamic Category'),
            makeField('Country Code', 1, false, 'Dynamic Category'),
            makeField('Segment', 2, false, 'Dynamic Category')
        ];
        const result = detectFieldParameterGroups(fields);
        const group = result.parameterGroups['Dynamic Category'];
        expect(group.componentNames).toEqual([
            'Product',
            'Country Code',
            'Segment'
        ]);
    });

    it('should detect mixed column/measure parameters', () => {
        const fields = [
            makeField('Country Code', 0, false, 'Mixed Param'),
            makeField('$ Sales', 0, true, 'Mixed Param')
        ];
        const result = detectFieldParameterGroups(fields);
        const group = result.parameterGroups['Mixed Param'];
        expect(group.hasMixedRoles).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dataset/__test__/field-parameter-detection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the detection module**

Create `src/lib/dataset/field-parameter-detection.ts`:

```typescript
/**
 * Minimal field shape needed for parameter detection.
 * Avoids coupling to the full Power BI DataViewMetadataColumn type.
 */
export type DetectableField = {
    displayName: string;
    sourceIndex: number;
    isMeasure: boolean;
    sourceFieldParameters?: Array<{ displayName: string }>;
};

/**
 * A group of fields that belong to the same field parameter.
 */
export type FieldParameterGroup = {
    /** The display name of the field parameter. */
    parameterName: string;
    /** Display names of the component fields, in DataView order. */
    componentNames: string[];
    /** Indices into the original fields array for each component. */
    componentFieldIndices: number[];
    /** Whether the group contains both columns and measures. */
    hasMixedRoles: boolean;
};

/**
 * Result of field parameter detection.
 */
export type FieldParameterDetectionResult = {
    /** Groups keyed by parameter name. Insertion order matches first occurrence. */
    parameterGroups: Record<string, FieldParameterGroup>;
    /** Indices of fields that do NOT belong to any field parameter. */
    regularFieldIndices: number[];
};

/**
 * Detect field parameter groups from an array of detectable fields.
 * Fields are grouped by the first entry in their `sourceFieldParameters`
 * array. Fields without `sourceFieldParameters` are classified as regular.
 *
 * Pure function — no side effects, fully testable.
 */
export const detectFieldParameterGroups = (
    fields: DetectableField[]
): FieldParameterDetectionResult => {
    const parameterGroups: Record<string, FieldParameterGroup> = {};
    const regularFieldIndices: number[] = [];

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const paramName = field.sourceFieldParameters?.[0]?.displayName;

        if (!paramName) {
            regularFieldIndices.push(i);
            continue;
        }

        if (!parameterGroups[paramName]) {
            parameterGroups[paramName] = {
                parameterName: paramName,
                componentNames: [],
                componentFieldIndices: [],
                hasMixedRoles: false
            };
        }

        const group = parameterGroups[paramName];
        group.componentNames.push(field.displayName);
        group.componentFieldIndices.push(i);

        // Check for mixed roles
        if (group.componentFieldIndices.length > 1) {
            const firstIsMeasure =
                fields[group.componentFieldIndices[0]].isMeasure;
            if (field.isMeasure !== firstIsMeasure) {
                group.hasMixedRoles = true;
            }
        }
    }

    return { parameterGroups, regularFieldIndices };
};
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/dataset/__test__/field-parameter-detection.test.ts`
Expected: All pass.

- [ ] **Step 5: Commit**

```
feat: add field parameter detection and grouping

Ref: #238
```

---

### Task 5: Implement parameter row building

Extend `buildDataRow` to handle `ParameterProcessingInstruction` — assembling array values, reusing pre-built `namesArray`, and optionally building format/formatted arrays.

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/build-data-row.ts`
- Create: `packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts`

- [ ] **Step 1: Write tests for parameter row building**

Create `packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildDataRow } from '../build-data-row';
import type {
    ProcessingPlan,
    ParameterProcessingInstruction,
    SupportFieldValueProvider
} from '../types';

const mockProvider: SupportFieldValueProvider = {
    getFormatString: () => '',
    getFormattedValue: (value) => `formatted:${value}`,
    getHighlightValue: (_fi, _ri, base) => base
};

const makeParameterInstruction = (
    overrides?: Partial<ParameterProcessingInstruction>
): ParameterProcessingInstruction => ({
    kind: 'parameter',
    encodedName: 'Dynamic Category',
    componentIndices: [0, 1, 2],
    namesArray: ['Country Code', 'Segment', 'Product'],
    emitFormat: false,
    emitFormatted: false,
    ...overrides
});

describe('buildDataRow — parameter instructions', () => {
    it('should produce array values for a parameter', () => {
        const plan: ProcessingPlan = {
            fields: [makeParameterInstruction()],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 'Channel Partners', 'Amarilla'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual([
            'CA',
            'Channel Partners',
            'Amarilla'
        ]);
    });

    it('should reuse the same namesArray reference for every row', () => {
        const namesArray = ['Country Code', 'Segment', 'Product'];
        const plan: ProcessingPlan = {
            fields: [makeParameterInstruction({ namesArray })],
            emitSelected: false,
            hasHighlights: false
        };
        const row1 = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 'X', 'Y'],
            rowIndex: 0,
            locale: 'en-US'
        });
        const row2 = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['DE', 'X', 'Y'],
            rowIndex: 1,
            locale: 'en-US'
        });
        expect(row1['Dynamic Category__names']).toBe(namesArray);
        expect(row2['Dynamic Category__names']).toBe(namesArray);
    });

    it('should emit format and formatted arrays when enabled', () => {
        const formatProvider: SupportFieldValueProvider = {
            getFormatString: (fi) => [`$#,0`, `#,0`, `text`][fi] ?? '',
            getFormattedValue: (value, fmt) => `${fmt}:${value}`,
            getHighlightValue: (_fi, _ri, base) => base
        };
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    emitFormat: true,
                    emitFormatted: true,
                    formatStringsArray: ['$#,0', '#,0', 'text']
                })
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: formatProvider,
            baseValues: [100, 200, 'hello'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category__format']).toEqual([
            '$#,0',
            '#,0',
            'text'
        ]);
        expect(row['Dynamic Category__formatted']).toEqual([
            '$#,0:100',
            '#,0:200',
            'text:hello'
        ]);
    });

    it('should handle single-element parameter (treat-as mode)', () => {
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    componentIndices: [0],
                    namesArray: ['Country Code']
                })
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA'],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual(['CA']);
        expect(row['Dynamic Category__names']).toEqual(['Country Code']);
    });

    it('should coexist with regular field instructions', () => {
        const plan: ProcessingPlan = {
            fields: [
                makeParameterInstruction({
                    componentIndices: [0, 1],
                    namesArray: ['Country Code', 'Segment']
                }),
                {
                    kind: 'field',
                    encodedName: '$ Sales',
                    sourceIndex: 2,
                    role: 'aggregation',
                    emitHighlight: false,
                    emitHighlightStatus: false,
                    emitHighlightComparator: false,
                    emitFormat: false,
                    emitFormatted: false
                }
            ],
            emitSelected: false,
            hasHighlights: false
        };
        const row = buildDataRow({
            plan,
            provider: mockProvider,
            baseValues: ['CA', 'Channel Partners', 2552747],
            rowIndex: 0,
            locale: 'en-US'
        });
        expect(row['Dynamic Category']).toEqual(['CA', 'Channel Partners']);
        expect(row['$ Sales']).toBe(2552747);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts`
Expected: FAIL — parameter kind not handled.

- [ ] **Step 3: Implement parameter handling in buildDataRow**

In `packages/data-core/src/lib/support-fields/build-data-row.ts`, add the `PARAMETER_NAMES_SUFFIX`, `FORMAT_FIELD_SUFFIX`, and `FORMATTED_FIELD_SUFFIX` imports, then add the parameter branch in the loop:

```typescript
import {
    // ... existing imports ...
    PARAMETER_NAMES_SUFFIX
} from '../field/constants';
```

In the loop body, after the `if (instruction.kind === 'field')` block, add:

```typescript
        if (instruction.kind === 'parameter') {
            const { encodedName, componentIndices, namesArray } = instruction;

            // Assemble array of values from component fields
            const values: PrimitiveValue[] = componentIndices.map(
                (idx) => baseValues[idx] as PrimitiveValue
            );
            row[encodedName] = values;

            // Reuse the pre-built names array (same reference every row)
            row[encodedName + PARAMETER_NAMES_SUFFIX] = namesArray;

            // Format strings array (row-invariant if pre-built, per-row otherwise)
            if (instruction.emitFormat) {
                if (instruction.formatStringsArray) {
                    row[encodedName + FORMAT_FIELD_SUFFIX] =
                        instruction.formatStringsArray;
                } else {
                    row[encodedName + FORMAT_FIELD_SUFFIX] =
                        componentIndices.map((idx) =>
                            provider.getFormatString(idx, rowIndex)
                        );
                }
            }

            // Formatted values (always per-row)
            if (instruction.emitFormatted) {
                const formatStrings =
                    instruction.formatStringsArray ??
                    componentIndices.map((idx) =>
                        provider.getFormatString(idx, rowIndex)
                    );
                row[encodedName + FORMATTED_FIELD_SUFFIX] =
                    componentIndices.map((idx, j) =>
                        provider.getFormattedValue(
                            baseValues[idx] as PrimitiveValue,
                            formatStrings[j],
                            locale
                        )
                    );
            }
        }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts`
Expected: All pass.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 6: Commit**

```
feat(data-core): implement parameter array assembly in row builder

Ref: #238
```

---

### Task 6: Extend plan building for field parameters

Add a new `buildParameterInstruction` function and integrate it into the plan builder. The plan builder needs to accept pre-grouped parameter information.

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/build-processing-plan.ts`
- Create: `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`

- [ ] **Step 1: Write tests**

Create `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildProcessingPlan } from '../build-processing-plan';
import type { SupportFieldConfiguration } from '../types';

describe('buildProcessingPlan — field parameters', () => {
    const masterSettings = {
        crossHighlightEnabled: false,
        crossFilterEnabled: false
    };

    it('should produce a parameter instruction for grouped fields', () => {
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping' as const
                },
                {
                    encodedName: 'Segment',
                    sourceIndex: 1,
                    role: 'grouping' as const
                },
                {
                    encodedName: '$ Sales',
                    sourceIndex: 0,
                    role: 'aggregation' as const
                }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Country Code', 'Segment'],
                    formatStrings: undefined
                }
            ]
        });

        expect(plan.fields).toHaveLength(2);
        expect(plan.fields[0]).toMatchObject({
            kind: 'parameter',
            encodedName: 'Dynamic Category',
            componentIndices: [0, 1],
            namesArray: ['Country Code', 'Segment']
        });
        expect(plan.fields[1]).toMatchObject({
            kind: 'field',
            encodedName: '$ Sales'
        });
    });

    it('should respect explicit support field config for parameters', () => {
        const config: SupportFieldConfiguration = {
            'Dynamic Category': {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: true
            }
        };
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping' as const
                }
            ],
            configuration: config,
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0],
                    componentNames: ['Country Code'],
                    formatStrings: ['']
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.emitFormat).toBe(true);
            expect(instr.emitFormatted).toBe(true);
        }
    });

    it('should produce only regular instructions when no parameter groups', () => {
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Year',
                    sourceIndex: 0,
                    role: 'grouping' as const
                }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false
        });

        expect(plan.fields).toHaveLength(1);
        expect(plan.fields[0].kind).toBe('field');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`
Expected: FAIL — `parameterGroups` not accepted by `buildProcessingPlan`.

- [ ] **Step 3: Extend `BuildProcessingPlanParams` and implementation**

In `packages/data-core/src/lib/support-fields/build-processing-plan.ts`, add the parameter group input type and update the function:

```typescript
import type { DatasetFieldRole } from '../field/types';
import { getEncodedFieldName } from '../field/encoding';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings,
    FieldProcessingInstruction,
    ParameterProcessingInstruction,
    ProcessingInstruction,
    ProcessingPlan
} from './types';
import { resolveFieldDefaults } from './resolve-defaults';

/**
 * Pre-grouped field parameter information, built by the platform-specific
 * detection layer before plan building.
 */
export type PlanParameterGroup = {
    parameterName: string;
    /** Indices into the `fields` array for each component field. */
    componentFieldIndices: number[];
    /** Display names of the component fields, in DataView order. */
    componentNames: string[];
    /**
     * Pre-resolved format strings for component fields (row-invariant).
     * undefined if format emission is not applicable.
     */
    formatStrings?: string[];
};

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
    /**
     * Field parameter groups detected by the platform.
     * When provided, component fields are merged into parameter instructions
     * instead of individual field instructions.
     */
    parameterGroups?: PlanParameterGroup[];
};

export const buildProcessingPlan = (
    params: BuildProcessingPlanParams
): ProcessingPlan => {
    const {
        fields,
        configuration,
        masterSettings,
        hasHighlights,
        isLegacy,
        parameterGroups = []
    } = params;

    // Build a set of field indices that belong to parameter groups
    const parameterFieldIndices = new Set<number>();
    for (const group of parameterGroups) {
        for (const idx of group.componentFieldIndices) {
            parameterFieldIndices.add(idx);
        }
    }

    const instructions: ProcessingInstruction[] = [];

    // Emit parameter instructions for each group
    for (const group of parameterGroups) {
        const encodedName = getEncodedFieldName(group.parameterName);

        // Resolve flags using the parameter name in config
        const explicit = configuration[encodedName];
        const flags =
            explicit !== undefined
                ? explicit
                : resolveFieldDefaults({
                      masterSettings,
                      fieldRole: 'field-parameter',
                      isLegacy
                  });

        instructions.push({
            kind: 'parameter',
            encodedName,
            componentIndices: group.componentFieldIndices,
            namesArray: group.componentNames,
            formatStringsArray: flags.format
                ? group.formatStrings
                : undefined,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        });
    }

    // Emit regular field instructions for non-parameter fields
    for (let i = 0; i < fields.length; i++) {
        if (parameterFieldIndices.has(i)) continue;

        const field = fields[i];
        const explicit = configuration[field.encodedName];
        const flags =
            explicit !== undefined
                ? explicit
                : resolveFieldDefaults({
                      masterSettings,
                      fieldRole: field.role,
                      isLegacy
                  });

        instructions.push({
            kind: 'field',
            encodedName: field.encodedName,
            sourceIndex: field.sourceIndex,
            role: field.role as 'grouping' | 'aggregation',
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        });
    }

    return {
        fields: instructions,
        emitSelected: masterSettings.crossFilterEnabled,
        hasHighlights
    };
};
```

- [ ] **Step 4: Update `resolveFieldDefaults` for `'field-parameter'` role**

In `packages/data-core/src/lib/support-fields/resolve-defaults.ts`, add handling for the new role. Field parameters get `__names` by default (handled at plan level, not via flags). For support fields, they follow column defaults (format/formatted off by default, no highlight support):

```typescript
export const resolveFieldDefaults = ({
    masterSettings,
    fieldRole,
    isLegacy
}: ResolveFieldDefaultsParams): SupportFieldFlags => {
    const isMeasure = fieldRole === 'aggregation';
    const isParameter = fieldRole === 'field-parameter';
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

    // Field parameters: no highlight support, format/formatted off by default
    if (isParameter) {
        return {
            highlight: false,
            highlightStatus: false,
            highlightComparator: false,
            format: false,
            formatted: false
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

- [ ] **Step 5: Check for `getEncodedFieldName` import**

Verify that `getEncodedFieldName` is importable from `data-core`. If it doesn't exist in data-core (it's currently in `src/lib/dataset/fields.ts`), we need to add it to data-core or inline the encoding. Check:

Run: `grep -rn "getEncodedFieldName" packages/data-core/`

If not found in data-core, create a simple encoding utility in `packages/data-core/src/lib/field/encoding.ts`:

```typescript
/**
 * Encode a field display name for use as a dataset column key.
 * Replaces characters that are problematic in JSON or Vega expressions.
 */
export const getEncodedFieldName = (displayName: string): string =>
    displayName?.replace(/([\\".[\]])/g, '_') || '';
```

And export it from the field subpath.

- [ ] **Step 6: Run tests**

Run: `npx vitest run packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`
Expected: All pass.

- [ ] **Step 7: Run full test suite**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 8: Commit**

```
feat(data-core): extend plan builder for field parameter groups

Ref: #238
```

---

### Task 7: Add `consolidateFieldParameters` to persistence, project state, and sync

Follow the established pattern from `scaleToZoom` — capabilities.json property, persistence model, project type/state, sync mapping.

**Files:**
- Modify: `capabilities.json`
- Modify: `src/lib/persistence/model/constants.ts`
- Modify: `src/lib/persistence/model/settings-state-management.ts`
- Modify: `stringResources/en-US/resources.resjson`
- Modify: `packages/app-core/src/lib/project/types.ts`
- Modify: `packages/app-core/src/state/project.ts`
- Modify: `src/lib/state/project-sync-mappings.ts`

- [ ] **Step 1: Add to capabilities.json**

Inside `stateManagement.properties`, after `scaleToZoom`:

```json
                "consolidateFieldParameters": {
                    "type": { "bool": true }
                }
```

- [ ] **Step 2: Add default to constants**

In `DEFAULTS.stateManagement`, after `scaleToZoom`:

```typescript
        /**
         * Whether to consolidate field parameter component fields into
         * parameter-named array columns (true) or pass through individually (false).
         */
        consolidateFieldParameters: true
```

- [ ] **Step 3: Add to settings model**

In `SettingsStateManagementGroupProjectMetadata`, after `scaleToZoom`:

```typescript
    consolidateFieldParameters = new formattingSettings.ToggleSwitch({
        name: 'consolidateFieldParameters',
        displayNameKey: 'Objects_StateManagement_ConsolidateFieldParameters',
        descriptionKey:
            'Objects_StateManagement_ConsolidateFieldParameters_Description',
        value: DEFAULTS.stateManagement.consolidateFieldParameters
    });
```

Update the `slices` array to include it.

- [ ] **Step 4: Add i18n keys for Power BI property pane**

In `stringResources/en-US/resources.resjson`:

```json
    "Objects_StateManagement_ConsolidateFieldParameters": "Consolidate field parameters",
    "Objects_StateManagement_ConsolidateFieldParameters_Description": "Whether to consolidate field parameter component fields into parameter-named array columns.",
```

- [ ] **Step 5: Add to DenebProject type**

In `packages/app-core/src/lib/project/types.ts`, after `scaleToZoom`:

```typescript
    consolidateFieldParameters: boolean;
```

- [ ] **Step 6: Add to project state**

In `packages/app-core/src/state/project.ts`:

Add to `ProjectSliceProperties` type:
```typescript
        setConsolidateFieldParameters: (value: boolean) => void;
```

Add initial state:
```typescript
            consolidateFieldParameters: true,
```

Add setter:
```typescript
            setConsolidateFieldParameters: (consolidateFieldParameters: boolean) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            consolidateFieldParameters
                        }
                    }),
                    false,
                    'project.setConsolidateFieldParameters'
                ),
```

- [ ] **Step 7: Add sync mapping**

In `src/lib/state/project-sync-mappings.ts`:

Add `'setConsolidateFieldParameters'` to the `ProjectSyncKey` exclusion list.

Add mapping after `scaleToZoom`:

```typescript
    {
        sliceKey: 'consolidateFieldParameters',
        getVisualValue: (s) =>
            s.stateManagement.projectMetadata?.consolidateFieldParameters
                ?.value ?? true,
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'consolidateFieldParameters'
        }
    }
```

- [ ] **Step 8: Handle legacy default**

In `src/lib/dataset/processing.ts`, in the legacy migration block (~line 247-272), after stamping `denebMetaVersion`, also set `consolidateFieldParameters` to `false` for legacy specs:

```typescript
                state.project.setConsolidateFieldParameters(false);
```

- [ ] **Step 9: Verify build and tests**

Run: `npm run webpack:build && npm run test`
Expected: Clean compile, all tests pass.

- [ ] **Step 10: Commit**

```
feat: add consolidateFieldParameters to persistence and project state

Ref: #238
```

---

### Task 8: Wire field parameter detection into `processing.ts`

Integrate the detection and grouping into the main dataset processing flow, gated by the `consolidateFieldParameters` setting.

**Files:**
- Modify: `src/lib/dataset/processing.ts:194-310`

- [ ] **Step 1: Import detection utilities**

Add imports at the top of `processing.ts`:

```typescript
import {
    detectFieldParameterGroups,
    type DetectableField
} from './field-parameter-detection';
import type { PlanParameterGroup } from '@deneb-viz/data-core/support-fields';
```

- [ ] **Step 2: Add detection after source field filtering**

After `planSourceColumns` is built (~line 279) and before the plan is built (~line 294), add parameter detection when consolidation is enabled:

```typescript
            // Detect field parameters (when consolidation is enabled)
            const consolidate =
                state.project.consolidateFieldParameters ?? true;
            let planParameterGroups: PlanParameterGroup[] | undefined;

            if (consolidate) {
                const detectableFields: DetectableField[] =
                    planSourceColumns.map((c) => ({
                        displayName: c.column.displayName,
                        sourceIndex: c.sourceIndex,
                        isMeasure: c.column.isMeasure ?? false,
                        sourceFieldParameters:
                            c.column.sourceFieldParameters as
                                | Array<{ displayName: string }>
                                | undefined
                    }));
                const detection =
                    detectFieldParameterGroups(detectableFields);

                if (Object.keys(detection.parameterGroups).length > 0) {
                    planParameterGroups = Object.values(
                        detection.parameterGroups
                    ).map((group) => ({
                        parameterName: group.parameterName,
                        componentFieldIndices: group.componentFieldIndices,
                        componentNames: group.componentNames,
                        formatStrings: group.componentFieldIndices.map(
                            (idx) => {
                                const col = planSourceColumns[idx];
                                return col?.column?.format ?? '';
                            }
                        )
                    }));
                }
            }
```

- [ ] **Step 3: Pass parameter groups to plan builder**

Update the `buildProcessingPlan` call to include `parameterGroups`:

```typescript
            const plan = buildProcessingPlan({
                fields: planSourceColumns.map((c) => ({
                    encodedName:
                        c.encodedName ??
                        getEncodedFieldName(c.column.displayName),
                    sourceIndex: c.sourceIndex,
                    role: c.column.isMeasure
                        ? ('aggregation' as const)
                        : ('grouping' as const)
                })),
                configuration: supportFieldConfig,
                masterSettings,
                hasHighlights,
                isLegacy: legacy,
                parameterGroups: planParameterGroups
            });
```

- [ ] **Step 4: Preserve component fields in the selection queue**

**Critical:** When parameters are consolidated, their component fields disappear from the dataset but must still participate in Selection ID generation. Power BI requires the original component columns/measures to be chained into `InteractivityManager.addRowSelector()` for cross-filtering and selection to work correctly.

In the selection queue building block (~line 322-342), component fields of consolidated parameters must still be added to `selectionQueueBase` using their original source (category/measure) and source index — NOT the parameter name. Only the Vega-facing dataset columns change; the interactivity pipeline must see the original fields.

This means the `fields` object modification (marking components as `isSupportField`) must happen AFTER the selection queue is built, or the selection queue must explicitly include parameter component fields regardless of their `isSupportField` status.

- [ ] **Step 5: Update fields metadata for consolidated parameters**

After building `fields` from `getDatumFieldsFromMetadata(columns)`, if consolidation produced parameter groups, update the `fields` object to include parameter entries and mark component fields as support fields:

```typescript
            if (planParameterGroups) {
                for (const group of planParameterGroups) {
                    const encodedParamName = getEncodedFieldName(
                        group.parameterName
                    );
                    // Add the parameter as a field
                    fields[encodedParamName] = {
                        role: 'field-parameter',
                        dataType: 'other'
                    };
                    // Mark component fields as support fields
                    for (const name of group.componentNames) {
                        const encodedName = getEncodedFieldName(name);
                        if (fields[encodedName]) {
                            fields[encodedName].isSupportField = true;
                        }
                    }
                }
            }
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 6: Manual test**

In Power BI Desktop with a field parameter:
1. Add the field parameter's fields to Deneb's Values
2. With `consolidateFieldParameters: true` → dataset viewer should show parameter-named columns with array values
3. With `consolidateFieldParameters: false` → dataset viewer should show individual field names as before

- [ ] **Step 7: Commit**

```
feat: wire field parameter detection into dataset processing

Ref: #238
```

---

### Task 9: Add "Semantic model integration" settings UI

Create the Power BI-injected settings accordion item with the consolidation toggle.

**Files:**
- Create: `src/app/settings/semantic-model-settings.tsx`
- Modify: `src/app/app.tsx:183-188`
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add i18n keys**

In `packages/app-core/src/i18n/en-US.json`:

```json
    "Text_Settings_SemanticModel": "Semantic model integration",
    "Text_Setting_ConsolidateFieldParameters": "Consolidate field parameters",
    "Assistive_Text_ConsolidateFieldParameters": "When enabled, fields belonging to a Power BI field parameter are grouped into array-valued columns named after the parameter, with companion __names, __format, and __formatted fields. When disabled, all fields pass through individually with their actual names. Disable this if you use a modeling workaround for stable field names."
```

- [ ] **Step 2: Create the settings component**

Create `src/app/settings/semantic-model-settings.tsx`:

```typescript
import { useCallback } from 'react';
import { Field, InfoLabel, Switch } from '@fluentui/react-components';

import { useDenebState } from '@deneb-viz/app-core';
import {
    SettingsAccordionItem,
    useSettingsPaneTooltip
} from '@deneb-viz/app-core/editor';

export const SemanticModelSettings = () => {
    const {
        consolidateFieldParameters,
        setConsolidateFieldParameters,
        translate
    } = useDenebState((state) => ({
        consolidateFieldParameters:
            state.project.consolidateFieldParameters,
        setConsolidateFieldParameters:
            state.project.setConsolidateFieldParameters,
        translate: state.i18n.translate
    }));
    const tooltipMountNode = useSettingsPaneTooltip();
    const onChange = useCallback(
        (_ev: unknown, data: { checked: boolean }) =>
            setConsolidateFieldParameters(data.checked),
        [setConsolidateFieldParameters]
    );
    return (
        <SettingsAccordionItem
            value='semantic-model'
            heading={translate('Text_Settings_SemanticModel')}
        >
            <Field
                label={
                    <InfoLabel
                        info={translate(
                            'Assistive_Text_ConsolidateFieldParameters'
                        )}
                        infoButton={{
                            inline: false,
                            popover: { mountNode: tooltipMountNode }
                        }}
                    >
                        {translate(
                            'Text_Setting_ConsolidateFieldParameters'
                        )}
                    </InfoLabel>
                }
            >
                <Switch
                    checked={consolidateFieldParameters}
                    onChange={onChange}
                />
            </Field>
        </SettingsAccordionItem>
    );
};
```

Note: The exact import paths for `SettingsAccordionItem` and `useSettingsPaneTooltip` may need adjusting based on the app-core exports. Check the existing platform settings components (e.g., `TooltipSettings`) for the correct import pattern.

- [ ] **Step 3: Add to the platform component array**

In `src/app/app.tsx`, add to the `settingsPanePlatformComponent` array (after `CrossHighlightSettings`):

```typescript
                settingsPanePlatformComponent: [
                    <TooltipSettings key='tooltips' />,
                    <ContextMenuSettings key='contextmenu' />,
                    <CrossFilterSettings key='crossfilter' />,
                    <CrossHighlightSettings key='crosshighlight' />,
                    <SemanticModelSettings key='semantic-model' />
                ],
```

Add the import at the top of the file:
```typescript
import { SemanticModelSettings } from './settings/semantic-model-settings';
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 5: Commit**

```
feat: add 'Semantic model integration' settings pane section

Ref: #238
```

---

### Task 10: Per-field "Treat as field parameter" toggle

Extend the dataset settings to show a "Treat as field parameter" toggle for individual fields when consolidation is enabled. This toggle wraps a regular field in a single-element array.

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings-utils.ts`
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add i18n keys**

In `packages/app-core/src/i18n/en-US.json`:

```json
    "Text_SupportField_TreatAsParameter": "Treat as field parameter",
    "Assistive_Text_SupportField_TreatAsParameter": "Wraps this field's values in a single-element array with companion __names field, making it compatible with specifications designed for field parameters. For compatibility and debugging purposes. Will be exported as a parameter field in templates."
```

- [ ] **Step 2: Add the toggle in the field tree**

In `dataset-settings.tsx`, this requires adding a Switch control as the first item in each field's tree expansion, before the support field checkboxes. The toggle is only shown when `consolidateFieldParameters` is true and the field is NOT already auto-detected as a parameter.

This is a UI-intensive change. The per-field "treat as parameter" state should be stored in the `SupportFieldConfiguration` as an additional flag, or in a separate configuration object. Given the existing sparse configuration pattern, extending `SupportFieldFlags` with `treatAsParameter: boolean` is the most consistent approach.

Add to `SupportFieldFlags` in `packages/data-core/src/lib/support-fields/types.ts`:

```typescript
export type SupportFieldFlags = {
    highlight: boolean;
    highlightStatus: boolean;
    highlightComparator: boolean;
    format: boolean;
    formatted: boolean;
    treatAsParameter?: boolean;
};
```

The `treatAsParameter` flag is optional so existing serialized configs don't break. When `true`, the plan builder treats this field as a single-element parameter group.

- [ ] **Step 3: Update the plan builder to handle `treatAsParameter`**

In `buildProcessingPlan`, after processing explicit parameter groups, check for fields with `treatAsParameter: true` in their configuration and create single-element parameter instructions for them. This can be done by checking each regular field's config before emitting a field instruction.

- [ ] **Step 4: Update `dataset-settings.tsx` to render the toggle**

Add a `Switch` component at the top of each field's tree expansion that toggles `treatAsParameter`. The switch is:
- Only shown when `consolidateFieldParameters` is true
- Not shown for fields that are auto-detected as parameters (they're already consolidated)
- When toggled on, the field's support field options change to match parameter-applicable flags

- [ ] **Step 5: Verify build and tests**

Run: `npm run webpack:build && npm run test`
Expected: Clean compile, all tests pass.

- [ ] **Step 6: Commit**

```
feat(app-core): add per-field 'treat as field parameter' toggle

Ref: #238
```

---

### Task 11: Template integration for field parameters

Update the template export/import flow to handle `'field-parameter'` role fields. On export, parameter fields use the `'parameter'` kind. On import, parameter slots show the appropriate icon and auto-flag regular fields as "treat as parameter" if assigned.

**Files:**
- Modify: `packages/data-core/src/lib/field/template-metadata.ts` (already done in Task 1)
- Modify: `packages/app-core/src/features/project-create/components/` (field mapping UI)
- Modify: `packages/json-processing/src/` (if template validation needs updating)

- [ ] **Step 1: Ensure `__names` companion field is tokenized correctly**

**Critical:** The `__names` companion field (e.g., `Dynamic Category__names`) must be tokenized and detokenized during template export/import using the same pattern as other support field suffixes (`__format`, `__formatted`, `__highlight`, etc.). This ensures that when a template placeholder like `__0__` is replaced with the user's actual field name during import, the `__names` reference in the spec is also correctly swapped.

Verify that the existing field tracking/tokenization in `@deneb-viz/json-processing` handles `PARAMETER_NAMES_SUFFIX` (`__names`) the same way it handles `FORMAT_FIELD_SUFFIX` and `FORMATTED_FIELD_SUFFIX`. If the tokenizer uses a suffix list, add `__names` to it. If it uses a regex pattern, verify `__names` matches.

- [ ] **Step 2: Verify roleToKind mapping**

Already done in Task 1: `'field-parameter'` → `'parameter'` in `roleToKind`, and `'parameter'` → `'field-parameter'` in `kindToRole`. Verify this works end-to-end by checking template export in the UI.

- [ ] **Step 2: Add `TableColumnQuestion` icon for parameter fields**

Install the icon package if not already available:
```bash
npm install @fabric-msft/svg-icons
```

In the field mapping UI components, add the icon for fields with `kind === 'parameter'`:

```typescript
import { TableColumnQuestion16Regular } from '@fabric-msft/svg-icons';
```

Note: The exact import path may differ. Check the package exports. If `@fabric-msft/svg-icons` doesn't provide React components directly, a wrapper may be needed.

- [ ] **Step 3: Handle import mismatch**

In the create/remap dialog, when a template field has `kind === 'parameter'` but the user assigns a regular column/measure:
1. Show a warning message explaining the template was designed for a field parameter
2. Auto-flag the assigned field as `treatAsParameter: true` so single-element array wrapping is applied

- [ ] **Step 4: Auto-enable consolidation on parameter import**

When importing a template that contains `kind === 'parameter'` fields and the user assigns an actual field parameter, set `consolidateFieldParameters: true` on the project.

- [ ] **Step 5: Verify build and tests**

Run: `npm run webpack:build && npm run test`
Expected: Clean compile, all tests pass.

- [ ] **Step 6: Commit**

```
feat: template export/import support for field parameters

Ref: #238
```

---

### Task 12: Update template usermeta schema

The `UsermetaDatasetFieldKind` type now includes `'parameter'`. The JSON schema used for template validation needs regenerating.

**Files:**
- Modify: `packages/template-usermeta/dist/schema.deneb-template-usermeta.json` (regenerated)

- [ ] **Step 1: Regenerate the schema**

Run: `cd packages/template-usermeta && npm run build:schema`

Verify: The generated schema includes `"parameter"` in the `kind` enum for dataset fields.

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: All pass. Template validation tests should accept `kind: 'parameter'`.

- [ ] **Step 3: Commit**

```
chore(template-usermeta): regenerate schema for parameter field kind

Ref: #238
```

---

### Task 13: Update documentation

Update the data-core developer documentation to cover field parameter processing.

**Files:**
- Modify: `packages/data-core/doc/support-fields.md`

- [ ] **Step 1: Add field parameter section**

Add a section covering:
- The `'field-parameter'` role and `ParameterProcessingInstruction` type
- How `detectFieldParameterGroups()` works (platform-agnostic interface)
- How parameter groups feed into `buildProcessingPlan()`
- Row output format (array values, `__names` companion, format/formatted arrays)
- The `treatAsParameter` flag for single-field wrapping
- Default resolution for field parameters

- [ ] **Step 2: Commit**

```
docs(data-core): add field parameter processing documentation

Ref: #238
```

---

## Verification

1. **Consolidate mode (Power BI)**: Add field parameter fields to Deneb → parameter-named columns appear with array values, `__names` companion present
2. **Multiple parameters**: Two parameters in same visual → both consolidate independently
3. **Mixed column/measure parameter**: Parameter with both types → `__format` and `__formatted` arrays handle mixed types
4. **Passthrough mode**: Toggle off consolidation → individual field names appear, support fields work as regular columns/measures
5. **Treat as parameter**: Toggle on for a regular field → single-element array wrapping, `__names` companion present
6. **Flatten transform**: Apply `flatten` to parameter columns → individual rows with correct values
7. **Template export**: Export with field parameter → template metadata has `kind: 'parameter'`
8. **Template import (happy path)**: Import template, assign field parameter → consolidation auto-enabled
9. **Template import (mismatch)**: Assign regular field to parameter slot → warning shown, auto-flagged as treat-as-parameter
10. **Legacy specs**: Pre-2.0 specs get passthrough mode by default
11. **Settings persistence**: Toggle consolidation, save report, reopen → setting preserved
12. **Selection queue**: Verify Power BI interactivity still works with consolidated parameters
13. `npm run test` — all suites pass
14. `npm run eslint` — all packages clean
