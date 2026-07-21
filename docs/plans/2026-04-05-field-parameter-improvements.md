# Field Parameter Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incremental improvements to field parameter support — restructure template format, add parameter highlights, editor autocomplete for support fields, auto-flag on import, change `__names` default to off.

**Architecture:** Five independent changes that share the field parameter infrastructure. Each task produces a working, testable increment. Template metaVersion stays at 2 (pre-release). Internal project state storage unchanged — template-only format changes.

**Tech Stack:** TypeScript, React, Zustand, Monaco Editor, Vitest

---

### Task 1: Change `__names` default to off

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/resolve-defaults.ts:42-50`
- Modify: `packages/data-core/src/lib/support-fields/build-processing-plan.ts:107-109`
- Modify: `packages/data-core/src/lib/support-fields/__tests__/resolve-defaults.test.ts`
- Modify: `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`
- Modify: `packages/data-core/doc/support-fields.md`

- [ ] **Step 1: Update resolve-defaults for field-parameter**

In `packages/data-core/src/lib/support-fields/resolve-defaults.ts`, change the parameter block (lines 42-50):

```typescript
    if (isParameter) {
        return {
            highlight: false,
            highlightStatus: false,
            highlightComparator: false,
            format: false,
            formatted: false,
            names: false
        };
    }
```

Also update the legacy path (line 38) — change `names: isParameter` to `names: false`:

```typescript
    if (isLegacy) {
        return {
            highlight: highlightApplicable,
            highlightStatus: highlightApplicable,
            highlightComparator: highlightApplicable,
            format: isMeasure,
            formatted: isMeasure,
            names: false
        };
    }
```

- [ ] **Step 2: Update build-processing-plan fallback**

In `packages/data-core/src/lib/support-fields/build-processing-plan.ts`, change line 107-109:

```typescript
            // Default false: __names is opt-in. Configs saved before the
            // names flag was introduced have no names property.
            emitNames: flags.names ?? false,
```

- [ ] **Step 3: Update resolve-defaults tests**

In `packages/data-core/src/lib/support-fields/__tests__/resolve-defaults.test.ts`, find any test asserting `names: true` for field-parameter defaults and change to `names: false`. Specifically, update the test for new-spec field-parameter defaults:

```typescript
    it('should return names false for field-parameter role (new spec)', () => {
        const result = resolveFieldDefaults({
            masterSettings: ALL_OFF,
            fieldRole: 'field-parameter',
            isLegacy: false
        });
        expect(result.names).toBe(false);
    });
```

And the legacy field-parameter test:

```typescript
    it('should return names false for field-parameter role (legacy spec)', () => {
        const result = resolveFieldDefaults({
            masterSettings: ALL_OFF,
            fieldRole: 'field-parameter',
            isLegacy: true
        });
        expect(result.names).toBe(false);
    });
```

- [ ] **Step 4: Update build-processing-plan-parameters tests**

In `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`, update the `makeParameterInstruction` helper or any assertions that expect `emitNames: true` by default — change to `emitNames: false`.

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: All suites pass.

- [ ] **Step 6: Update doc defaults table**

In `packages/data-core/doc/support-fields.md`, update the defaults tables: change the Parameter (`field-parameter`) column for `names` from `true` to `false` in both the new-spec and legacy-spec tables.

- [ ] **Step 7: Commit**

```
fix(data-core): change __names default to off for field parameters

__names is a convenience field, not mandatory. Templates that want it
explicitly enable it in their supportFieldConfiguration.

Ref: #238
```

---

### Task 2: Inline supportFieldConfiguration in template dataset entries

**Files:**
- Modify: `packages/data-core/src/lib/field/types.ts:95-140`
- Modify: `packages/template-usermeta/src/types.ts:9-39`
- Modify: `packages/json-processing/src/template-usermeta.ts`
- Modify: `packages/json-processing/src/__test__/template-usermeta.test.ts`
- Modify: `packages/app-core/src/features/project-create/components/create-button.tsx`
- Modify: `packages/app-core/src/state/project.ts`
- Modify: `packages/app-core/src/state/dataset.ts`

- [ ] **Step 1: Add supportFieldConfiguration to UsermetaDatasetField**

In `packages/data-core/src/lib/field/types.ts`, add after the `namePlaceholder` property (before the closing `}`):

```typescript
    /**
     * Per-field support field configuration captured at export time.
     * Optional — only present for fields with explicit (non-default) configuration.
     * @ignore
     */
    supportFieldConfiguration?: import('../support-fields/types').SupportFieldFlags;
```

- [ ] **Step 2: Remove top-level supportFieldConfiguration from UsermetaTemplate**

In `packages/template-usermeta/src/types.ts`, remove the `supportFieldConfiguration` property (lines 33-38) and remove the `SupportFieldConfiguration` import (line 2):

```typescript
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';
import type { SpecProvider } from '@deneb-viz/vega-runtime/embed';
import type { SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';

export interface UsermetaTemplate {
    deneb: UsermetaDeneb;
    information: UsermetaInformation;
    dataset: UsermetaDatasetField[];
    interactivity?: UsermetaInteractivity;
    config?: string;
}
```

- [ ] **Step 3: Fix TypeScript compilation errors**

Removing the top-level `supportFieldConfiguration` from `UsermetaTemplate` will cause errors wherever it's referenced. The key sites to update:

**`packages/json-processing/src/template-usermeta.ts`:**

Remove `buildNameToTrackedFieldMap` and `remapSupportFieldConfigurationForExport` functions entirely.

Update `getPublishableUsermeta` — remove the `supportFieldConfiguration` spread and instead embed config per field. The dataset mapping becomes:

```typescript
            dataset: (() => {
                const nameMap = buildNameToTrackedFieldMap(
                    options.trackedFields
                );
                return (usermeta?.[DATASET_DEFAULT_NAME] ?? []).map((d) => {
                    const item = { ...d };
                    const tracked = nameMap.get(
                        item.namePlaceholder ?? item.name
                    );
                    item.key = tracked?.placeholder ?? item.key;
                    item.name = getFieldNameForExport(item);
                    return omit(
                        item as unknown as Record<string, unknown>,
                        ['namePlaceholder']
                    ) as Omit<UsermetaDatasetField, 'namePlaceholder'>;
                });
            })()
```

Wait — we actually still need `buildNameToTrackedFieldMap` for the dataset key remapping. Only `remapSupportFieldConfigurationForExport` is removed. The config now travels with the field. The export embedding happens in the `dataset.ts` state layer where export metadata is built.

Actually, let me reconsider: the `supportFieldConfiguration` needs to be embedded per-field at export time. The project state has it as a separate `Record<string, SupportFieldFlags>`. At export time in `getPublishableUsermeta`, we need to look up each field's config and embed it.

Replace the `supportFieldConfiguration: remapSupportFieldConfigurationForExport(...)` line with nothing (remove it). Instead, inside the dataset `.map()`, after setting `item.key` and `item.name`, add:

```typescript
                    // Embed per-field support field config (if any) from the
                    // project-level sparse record, looked up by display name.
                    const fieldConfig =
                        options.supportFieldConfiguration?.[
                            item.namePlaceholder ?? item.name
                        ];
                    if (fieldConfig) {
                        item.supportFieldConfiguration = fieldConfig;
                    }
```

This requires `getPublishableUsermeta` to accept `supportFieldConfiguration` in its options. Update the function signature:

```typescript
export const getPublishableUsermeta = (
    usermeta: UsermetaTemplate,
    options: {
        informationTranslationPlaceholders: {
            [key: string]: string;
        };
        trackedFields: TrackedFields;
        supportFieldConfiguration?: SupportFieldConfiguration;
    }
)
```

And update `getExportTemplate` to pass it through:

```typescript
    const newMetadata = getPublishableUsermeta(metadata, {
        informationTranslationPlaceholders,
        trackedFields,
        supportFieldConfiguration: metadata.supportFieldConfiguration
    });
```

Wait — but we just removed `supportFieldConfiguration` from `UsermetaTemplate`. So `metadata.supportFieldConfiguration` won't exist. The export metadata needs to carry it somewhere. Since the internal project state still has it separately, the caller needs to pass it explicitly.

Update `getExportTemplate` signature to accept `supportFieldConfiguration`:

```typescript
export const getExportTemplate = (options: {
    informationTranslationPlaceholders: { [key: string]: string };
    metadata: UsermetaTemplate;
    tokenizedSpec: string;
    trackedFields: TrackedFields;
    supportFieldConfiguration?: SupportFieldConfiguration;
})
```

And thread it through to `getPublishableUsermeta`.

- [ ] **Step 4: Update remapSupportFieldConfigurationForImport**

The import function now reads from `dataset[i].supportFieldConfiguration` instead of a top-level property. Replace the entire function:

```typescript
export const remapSupportFieldConfigurationForImport = (
    dataset: UsermetaDatasetField[]
): SupportFieldConfiguration => {
    const result: SupportFieldConfiguration = {};
    for (const field of dataset) {
        if (field.supportFieldConfiguration && field.suppliedObjectName) {
            result[field.suppliedObjectName] = field.supportFieldConfiguration;
        }
    }
    return result;
};
```

- [ ] **Step 5: Update CreateButton import call**

In `packages/app-core/src/features/project-create/components/create-button.tsx`, update the `remapSupportFieldConfigurationForImport` call — it now takes just the dataset:

```typescript
        const supportFieldConfiguration =
            remapSupportFieldConfigurationForImport(
                metadata?.dataset ?? []
            );
```

- [ ] **Step 6: Update getUpdatedExportMetadata**

In `packages/json-processing/src/template-usermeta.ts`, remove `supportFieldConfiguration` from the `getUpdatedExportMetadata` function's options and return value — it's no longer a top-level template property.

- [ ] **Step 7: Update setSupportFieldConfiguration in project.ts**

In `packages/app-core/src/state/project.ts`, the `setSupportFieldConfiguration` setter calls `getUpdatedExportMetadata` with `{ supportFieldConfiguration: config }`. Since this is no longer a top-level template property, we need a different approach to keep the export metadata in sync.

The export metadata's `dataset` array entries need their `supportFieldConfiguration` updated. Create a helper or update the setter to embed the config into each matching dataset entry:

```typescript
setSupportFieldConfiguration: (config: SupportFieldConfiguration) =>
    set(
        (state) => {
            const currentDataset =
                state.export.metadata?.dataset ?? [];
            const updatedDataset = currentDataset.map((d) => {
                const fieldConfig =
                    config[d.namePlaceholder ?? d.name];
                if (fieldConfig) {
                    return { ...d, supportFieldConfiguration: fieldConfig };
                }
                const { supportFieldConfiguration: _, ...rest } = d;
                return rest as typeof d;
                });
            const exportMetadata = getUpdatedExportMetadata(
                state.export.metadata as UsermetaTemplate,
                { dataset: updatedDataset }
            );
            return {
                project: {
                    ...state.project,
                    supportFieldConfiguration: config
                },
                export: {
                    ...state.export,
                    metadata: exportMetadata
                }
            };
        },
        false,
        'project.setSupportFieldConfiguration'
    ),
```

- [ ] **Step 8: Update initializeFromTemplate**

In the `initializeFromTemplate` method, the `getUpdatedExportMetadata` call passes `supportFieldConfiguration`. Remove that property from the call. Instead, embed it into the dataset entries if present:

```typescript
const datasetWithConfig = (state.export.metadata?.dataset ?? []).map(
    (d) => {
        const fieldConfig =
            updatedProject.supportFieldConfiguration?.[
                d.namePlaceholder ?? d.name
            ];
        return fieldConfig
            ? { ...d, supportFieldConfiguration: fieldConfig }
            : d;
    }
);
const exportMetadata = getUpdatedExportMetadata(
    state.export.metadata as UsermetaTemplate,
    {
        config: payload.config,
        provider,
        providerVersion,
        interactivity: updatedProject.interactivity,
        dataset: datasetWithConfig
    }
);
```

- [ ] **Step 9: Update export-buttons.tsx**

In `packages/app-core/src/features/project-export/components/export-buttons.tsx`, the `getProcessedExportTemplate` call passes `metadata` and `trackedFields`. It now also needs `supportFieldConfiguration` from the project state. Add it to the selector and pass it to `getExportTemplate`:

```typescript
const supportFieldConfiguration = useDenebState(
    (state) => state.project.supportFieldConfiguration
);
```

Pass it to `getExportTemplate`:

```typescript
getExportTemplate({
    informationTranslationPlaceholders,
    metadata,
    tokenizedSpec,
    trackedFields,
    supportFieldConfiguration
})
```

- [ ] **Step 10: Update reconcileExportDatasetFields**

In `packages/app-core/src/state/dataset.ts`, `reconcileExportDatasetFields` merges fresh fields with previous fields. The previous fields may now carry `supportFieldConfiguration`. Ensure it's preserved from `match`:

The current code already does `{ ...match, ...{ name, namePlaceholder, key } }` — since `match` has the `supportFieldConfiguration` from the previous cycle, it will be preserved. No change needed, but verify.

- [ ] **Step 11: Regenerate JSON schema**

Run: `cd packages/template-usermeta && npm run build:schema`

Verify: `dist/schema.deneb-template-usermeta.json` no longer has a top-level `supportFieldConfiguration` property, and each dataset item now allows an optional `supportFieldConfiguration` object.

- [ ] **Step 12: Update tests**

Update `packages/json-processing/src/__test__/template-usermeta.test.ts`:

- Remove or update tests in the `getPublishableUsermeta — supportFieldConfiguration export remapping` describe block — the top-level property no longer exists.
- Update the `remapSupportFieldConfigurationForImport` tests — the function now takes `dataset` array only (not a separate config + dataset).
- Update the roundtrip test to use inline config on dataset entries.
- Update `getExportTemplate` test to verify inline config appears per-field in the output.
- Update `getUpdatedExportMetadata` tests to remove `supportFieldConfiguration` from options.

- [ ] **Step 13: Run tests**

Run: `npm run test`
Expected: All suites pass.

- [ ] **Step 14: Commit**

```
feat(json-processing): inline supportFieldConfiguration in template dataset entries

Move per-field support field config from a separate top-level usermeta
property into each dataset entry. Simplifies export/import — config
travels with the field, no placeholder key lookup needed.

Ref: #238
```

---

### Task 3: Add highlight fields for parameters

**Files:**
- Modify: `packages/data-core/src/lib/support-fields/types.ts:79-105`
- Modify: `packages/data-core/src/lib/support-fields/build-processing-plan.ts:85-115`
- Modify: `packages/data-core/src/lib/support-fields/build-data-row.ts:42-86`
- Modify: `packages/data-core/src/lib/support-fields/resolve-defaults.ts:42-50`
- Modify: `src/lib/dataset/field-parameter-detection.ts:15-24`
- Modify: `src/lib/dataset/processing.ts:306-360`
- Modify: `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`
- Modify: `packages/data-core/src/lib/support-fields/__tests__/build-processing-plan-parameters.test.ts`
- Modify: `packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts`

- [ ] **Step 1: Add highlight emit flags and componentRoles to ParameterProcessingInstruction**

In `packages/data-core/src/lib/support-fields/types.ts`, update `ParameterProcessingInstruction`:

```typescript
export type ParameterProcessingInstruction = {
    kind: 'parameter';
    encodedName: string;
    componentIndices: number[];
    /** Role of each component field — determines highlight behavior per-element. */
    componentRoles: ('grouping' | 'aggregation')[];
    namesArray: string[];
    formatStringsArray?: string[];
    emitNames: boolean;
    emitHighlight: boolean;
    emitHighlightStatus: boolean;
    emitHighlightComparator: boolean;
    emitFormat: boolean;
    emitFormatted: boolean;
};
```

- [ ] **Step 2: Update resolve-defaults for field-parameter highlight**

In `packages/data-core/src/lib/support-fields/resolve-defaults.ts`, update the parameter block:

```typescript
    if (isParameter) {
        return {
            highlight: isMeasure ? false : highlightApplicable,
            highlightStatus: false,
            highlightComparator: false,
            format: false,
            formatted: false,
            names: false
        };
    }
```

Wait — `isParameter` and `isMeasure` are mutually exclusive in the current code (`isMeasure = fieldRole === 'aggregation'`, `isParameter = fieldRole === 'field-parameter'`). For parameters, the highlight default should follow `crossHighlightEnabled` directly since the parameter may contain measures:

```typescript
    if (isParameter) {
        return {
            highlight: masterSettings.crossHighlightEnabled,
            highlightStatus: false,
            highlightComparator: false,
            format: false,
            formatted: false,
            names: false
        };
    }
```

- [ ] **Step 3: Add componentRoles to FieldParameterGroup and PlanParameterGroup**

In `src/lib/dataset/field-parameter-detection.ts`, add `componentRoles` to `FieldParameterGroup`:

```typescript
export type FieldParameterGroup = {
    parameterName: string;
    componentNames: string[];
    componentFieldIndices: number[];
    componentRoles: ('grouping' | 'aggregation')[];
    hasMixedRoles: boolean;
};
```

In `packages/data-core/src/lib/support-fields/build-processing-plan.ts`, add `componentRoles` to `PlanParameterGroup`:

```typescript
export type PlanParameterGroup = {
    parameterName: string;
    componentFieldIndices: number[];
    componentNames: string[];
    componentRoles: ('grouping' | 'aggregation')[];
    formatStrings?: string[];
};
```

- [ ] **Step 4: Populate componentRoles in detection and processing**

In `src/lib/dataset/field-parameter-detection.ts`, inside the loop that builds groups, populate `componentRoles`:

```typescript
group.componentRoles.push(field.isMeasure ? 'aggregation' : 'grouping');
```

In `src/lib/dataset/processing.ts`, when building `PlanParameterGroup` from detection results, pass `componentRoles` through:

```typescript
componentRoles: group.componentRoles,
```

Also update the manual "treat as parameter" single-element group building to include `componentRoles`.

- [ ] **Step 5: Update buildProcessingPlan for parameter highlight flags**

In `packages/data-core/src/lib/support-fields/build-processing-plan.ts`, update the parameter instruction building:

```typescript
        const instruction: ParameterProcessingInstruction = {
            kind: 'parameter',
            encodedName,
            componentIndices: group.componentFieldIndices,
            componentRoles: group.componentRoles,
            namesArray: group.componentNames,
            formatStringsArray: flags.format ? group.formatStrings : undefined,
            emitNames: flags.names ?? false,
            emitHighlight: flags.highlight,
            emitHighlightStatus: flags.highlightStatus,
            emitHighlightComparator: flags.highlightComparator,
            emitFormat: flags.format,
            emitFormatted: flags.formatted
        };
```

- [ ] **Step 6: Update buildDataRow parameter branch for highlights**

In `packages/data-core/src/lib/support-fields/build-data-row.ts`, after the existing parameter value assembly and before the format section, add highlight handling:

```typescript
        // Highlight arrays — per-component role-aware
        const needsHighlight =
            instruction.emitHighlight ||
            instruction.emitHighlightStatus ||
            instruction.emitHighlightComparator;
        if (needsHighlight) {
            const highlightValues = componentIndices.map((idx, j) => {
                const base = baseValues[idx] as PrimitiveValue;
                // Columns pass through — highlight doesn't apply
                if (instruction.componentRoles[j] === 'grouping') {
                    return base;
                }
                return provider.getHighlightValue(idx, rowIndex, base);
            });
            if (instruction.emitHighlight) {
                row[encodedName + HIGHLIGHT_FIELD_SUFFIX] = highlightValues;
            }
            if (instruction.emitHighlightStatus) {
                row[encodedName + HIGHLIGHT_STATUS_SUFFIX] =
                    componentIndices.map((idx, j) => {
                        const base = baseValues[idx] as PrimitiveValue;
                        return getHighlightStatusValue(
                            plan.hasHighlights,
                            base,
                            highlightValues[j]!
                        );
                    });
            }
            if (instruction.emitHighlightComparator) {
                row[encodedName + HIGHLIGHT_COMPARATOR_SUFFIX] =
                    componentIndices.map((idx, j) => {
                        const base = baseValues[idx] as PrimitiveValue;
                        return getHighlightComparatorValue(
                            base,
                            highlightValues[j]!
                        );
                    });
            }
        }
```

- [ ] **Step 7: Update settings pane for parameter highlight flags**

In `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`, the render section currently uses `COLUMN_FLAGS` for parameters (since parameters weren't measures). Now parameters should show highlight flags when `crossHighlightEnabled` is true, same as measures. Update the `baseFlags` logic in all three locations (or in `getApplicableFlags` — but `baseFlags` is computed before the helper call):

In the render section (and the two memo/callback sections), change the `baseFlags` determination to also give parameters the measure flags when highlight is enabled:

```typescript
const baseFlags = (isMeasure || isParameter)
    ? highlightEnabled
        ? MEASURE_FLAGS
        : COLUMN_FLAGS
    : COLUMN_FLAGS;
```

- [ ] **Step 8: Update tests**

Add tests to `build-processing-plan-parameters.test.ts` verifying:
- Parameter instruction includes highlight emit flags
- Parameter instruction includes `componentRoles`

Add tests to `build-data-row-parameters.test.ts` verifying:
- `__highlight` array emitted with per-component values
- Column components pass through base value for highlight
- Measure components get provider highlight value
- `__highlightStatus` and `__highlightComparator` arrays emitted

Update `resolve-defaults.test.ts` for new parameter highlight default.

- [ ] **Step 9: Run tests**

Run: `npm run test`
Expected: All suites pass.

- [ ] **Step 10: Commit**

```
feat(data-core): add highlight support for field parameters

Parameters can contain measures with highlight values. Emit __highlight,
__highlightStatus, __highlightComparator arrays with per-component
role-aware logic: measures get real highlights, columns pass through.

Ref: #238
```

---

### Task 4: Autocomplete hints for support fields

**Files:**
- Modify: `packages/app-core/src/lib/editor-init/editor-init-service.ts:56-89`
- Modify: `packages/app-core/src/i18n/en-US.json`
- Modify: `packages/app-core/src/lib/editor-init/__tests__/editor-init-service.test.ts`

- [ ] **Step 1: Add i18n documentation strings for support field companions**

In `packages/app-core/src/i18n/en-US.json`, add entries (read the file first to find the right location and absorb any manual changes):

```json
"Completion_SupportField_Highlight": "Cross-highlight value from the platform. Use to build conditional formatting when highlights are active.",
"Completion_SupportField_HighlightStatus": "Highlight status: 'neutral', 'on', or 'off'. Simplifies conditional logic for highlight state.",
"Completion_SupportField_HighlightComparator": "Highlight comparison: 'eq', 'lt', 'gt', or 'neq'. Compare highlight value to base value.",
"Completion_SupportField_Format": "Format string for this field. Use with Vega's format expression function.",
"Completion_SupportField_Formatted": "Pre-formatted display value. Ready for direct use in text marks or tooltips.",
"Completion_SupportField_Names": "Array of component field display names for this field parameter."
```

- [ ] **Step 2: Extend the completion provider**

In `packages/app-core/src/lib/editor-init/editor-init-service.ts`, update the `configureMonacoCompletionProvider` function. After the existing field name suggestions loop, add support field companion suggestions:

```typescript
import {
    resolveFieldDefaults,
    type SupportFieldFlags,
    type SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import {
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    FORMATTED_FIELD_SUFFIX,
    PARAMETER_NAMES_SUFFIX
} from '@deneb-viz/data-core/field';
```

Inside the `provideCompletionItems` callback, after the field name loop:

```typescript
            // Support field companion suggestions
            const {
                project: {
                    supportFieldConfiguration: explicitConfig,
                    interactivity
                }
            } = getDenebState();
            const masterSettings: SupportFieldMasterSettings = {
                crossHighlightEnabled: interactivity?.highlight ?? false,
                crossFilterEnabled: interactivity?.selection ?? false
            };
            const suffixMap: [keyof SupportFieldFlags, string, string][] = [
                ['highlight', HIGHLIGHT_FIELD_SUFFIX, translate('Completion_SupportField_Highlight')],
                ['highlightStatus', HIGHLIGHT_STATUS_SUFFIX, translate('Completion_SupportField_HighlightStatus')],
                ['highlightComparator', HIGHLIGHT_COMPARATOR_SUFFIX, translate('Completion_SupportField_HighlightComparator')],
                ['format', FORMAT_FIELD_SUFFIX, translate('Completion_SupportField_Format')],
                ['formatted', FORMATTED_FIELD_SUFFIX, translate('Completion_SupportField_Formatted')],
                ['names', PARAMETER_NAMES_SUFFIX, translate('Completion_SupportField_Names')]
            ];
            Object.entries(getDenebState().dataset.fields).forEach(
                ([key, field]) => {
                    if (field?.isSupportField) return;
                    const flags =
                        explicitConfig?.[key] ??
                        resolveFieldDefaults({
                            masterSettings,
                            fieldRole: field?.role ?? 'grouping',
                            isLegacy: false
                        });
                    for (const [flagKey, suffix, doc] of suffixMap) {
                        if (flags[flagKey]) {
                            const name = `${key}${suffix}`;
                            fields.push({
                                label: name,
                                insertText: name,
                                documentation: doc,
                                kind: monaco.languages.CompletionItemKind
                                    .Property,
                                range,
                                sortText: `zzzzz__${key}${suffix}`
                            });
                        }
                    }
                }
            );
```

Note: `translate` needs to be accessible. Check if the completion provider already has access to the i18n `translate` function — it accesses `getDenebState()` which has `i18n.translate`. Add:

```typescript
const { translate } = getDenebState().i18n;
```

- [ ] **Step 3: Update tests**

In `packages/app-core/src/lib/editor-init/__tests__/editor-init-service.test.ts`, add a test verifying that the completion provider includes support field companions when config is active. This may require mocking `getDenebState()` to return fields with support field configuration.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: All suites pass.

- [ ] **Step 5: Commit**

```
feat(app-core): add autocomplete hints for active support fields

Extend the Monaco completion provider to suggest support field
companions (__highlight, __format, __names, etc.) for fields that
have them enabled. Only active companions are shown.

Ref: #238
```

---

### Task 5: Auto-flag treatAsParameter on template import kind mismatch

**Files:**
- Modify: `packages/app-core/src/features/project-create/components/create-button.tsx`
- Modify: `packages/app-core/src/state/project.ts:47-63`

- [ ] **Step 1: Add consolidateFieldParameters to InitializeFromTemplatePayload**

In `packages/app-core/src/state/project.ts`, add to `InitializeFromTemplatePayload`:

```typescript
export type InitializeFromTemplatePayload = {
    spec: string;
    config: string;
    provider: SpecProvider;
    renderMode?: SpecRenderMode;
    supportFieldConfiguration?: SupportFieldConfiguration;
    denebMetaVersion?: number;
    /** When true, enable field parameter consolidation for this project. */
    consolidateFieldParameters?: boolean;
};
```

In the `initializeFromTemplate` method, use it:

```typescript
                consolidateFieldParameters:
                    payload.consolidateFieldParameters ??
                    state.project.consolidateFieldParameters,
```

- [ ] **Step 2: Add auto-flag logic in CreateButton**

In `packages/app-core/src/features/project-create/components/create-button.tsx`, after the `remapSupportFieldConfigurationForImport` call, add mismatch detection:

```typescript
        // Auto-flag treatAsParameter for regular fields assigned to parameter placeholders
        let needsConsolidation = false;
        const datasetFields = getDenebState().dataset.fields;
        for (const entry of metadata?.dataset ?? []) {
            if (
                entry.kind === 'parameter' &&
                entry.suppliedObjectName &&
                supportFieldConfiguration
            ) {
                const suppliedField = datasetFields[entry.suppliedObjectName];
                const suppliedRole = suppliedField?.role ?? 'grouping';
                if (
                    suppliedRole === 'grouping' ||
                    suppliedRole === 'aggregation'
                ) {
                    // Regular field assigned to parameter slot — auto-flag
                    supportFieldConfiguration[entry.suppliedObjectName] = {
                        ...(supportFieldConfiguration[
                            entry.suppliedObjectName
                        ] ?? {
                            highlight: false,
                            highlightStatus: false,
                            highlightComparator: false,
                            format: false,
                            formatted: false
                        }),
                        treatAsParameter: true
                    };
                    needsConsolidation = true;
                }
            }
        }
```

Then pass `consolidateFieldParameters` to `initializeFromTemplate`:

```typescript
        initializeFromTemplate({
            spec,
            config,
            provider,
            supportFieldConfiguration,
            denebMetaVersion: metadata?.deneb?.metaVersion,
            consolidateFieldParameters: needsConsolidation || undefined
        });
```

Add the necessary import:

```typescript
import { getDenebState } from '../../../state';
```

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: All suites pass.

- [ ] **Step 4: Commit**

```
feat(app-core): auto-flag treatAsParameter on import kind mismatch

When a regular field is assigned to a parameter placeholder during
template import, auto-set treatAsParameter: true and enable
consolidateFieldParameters on the project.

Ref: #238
```

---

### Task 6: Update documentation

**Files:**
- Modify: `packages/data-core/doc/support-fields.md`

- [ ] **Step 1: Update support-fields.md**

Update sections affected by the changes:
- Defaults table: `names` is now `false` for parameters (Task 1 already did this)
- Parameter processing section: mention highlight support with per-component role-aware behavior
- Template guidance section: update to reflect inline `supportFieldConfiguration` per dataset entry (not top-level)
- Add note about auto-flagging on import

- [ ] **Step 2: Commit**

```
docs(data-core): update support fields doc for parameter improvements

Ref: #238
```

---

## Verification

1. **`__names` default:** Create from clean-slate template with field parameter → verify `__names` NOT in data viewer unless explicitly enabled in settings
2. **Template structure:** Export a template with configured support fields → verify config is inline per dataset entry, no top-level `supportFieldConfiguration`. Import it back → fields get correct config
3. **Highlights:** Enable cross-highlighting with a parameter containing measures → verify `__highlight`, `__highlightStatus`, `__highlightComparator` arrays in data viewer with per-component values (measures get real values, columns pass through)
4. **Autocomplete:** Open spec editor, type a field name → verify support field companions appear for enabled fields only (e.g., `Sales__highlight` when highlight is on)
5. **Import auto-flag:** Import a template with `kind: 'parameter'` → assign a regular column → verify `treatAsParameter: true` is set and consolidation is enabled
6. **Translations:** Make manual translation edits → verify they survive subsequent commits
7. `npm run test` — all suites pass
