# Support Field Configuration UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Dataset accordion item in the Settings pane with per-field support field toggles, and fix volatile change detection so support field configuration changes trigger dataset reprocessing.

**Architecture:** A new `DatasetSettings` component renders inside a `SettingsAccordionItem` in the Settings pane. It uses Fluent UI Tree with checkbox selection to display source dataset fields and their applicable support field toggles. Volatile change detection is extended in `hasDataViewChanged` to track `supportFieldConfiguration` reference changes. Built-in catalog templates are updated with explicit support field configurations.

**Tech Stack:** TypeScript 5.6, React 19, Fluent UI v9 (Tree, MessageBar, Checkbox), Vitest, Zustand

**Spec:** `docs/superpowers/specs/2026-03-28-support-field-ui-design.md`

---

### Task 1: Volatile Change Detection for supportFieldConfiguration

**Files:**
- Modify: `src/lib/dataset/processing.ts`
- Modify: `src/index.ts`

This fixes the debug pane dataset viewer bug as a side effect — config changes now trigger a full reprocess, which updates the Vega view, which the viewer's `addDataListener` picks up.

- [ ] **Step 1: Add prevSupportFieldConfiguration to change detection state**

In `src/lib/dataset/processing.ts`, add after line 67 (`let prevRowCount: number = 0;`):

```typescript
let prevSupportFieldConfiguration: string | undefined;
```

We store the JSON string (not the object reference) because the config is deserialized from Power BI on each update, creating new object references even when content hasn't changed.

- [ ] **Step 2: Add supportFieldConfiguration parameter to hasDataViewChanged**

Update the function signature and add a config check after the enableSelection/enableHighlight check:

```typescript
export const hasDataViewChanged = (
    categorical: DataViewCategorical | undefined,
    enableSelection: boolean,
    enableHighlight: boolean,
    supportFieldConfiguration: SupportFieldConfiguration
): boolean => {
    logTimeStart('hasDataViewChanged');

    // Support field configuration changed
    const configString = JSON.stringify(supportFieldConfiguration);
    if (configString !== prevSupportFieldConfiguration) {
        prevSupportFieldConfiguration = configString;
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: supportFieldConfiguration changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Settings changed
    if (
        enableSelection !== prevEnableSelection ||
        enableHighlight !== prevEnableHighlight
    ) {
        // ... rest unchanged
```

Add the import at top of file:

```typescript
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
```

- [ ] **Step 3: Update the caller in src/index.ts**

In `src/index.ts`, in `resolveDataset()`, pass the config to `hasDataViewChanged`:

```typescript
const supportFieldConfig: SupportFieldConfiguration =
    getDenebState().project.supportFieldConfiguration ?? {};

const dataChanged = hasDataViewChanged(
    categorical,
    enableSelection,
    enableHighlight,
    supportFieldConfig
);
```

Add the import:
```typescript
import { getDenebState } from '@deneb-viz/app-core';
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
```

Note: `getDenebState` may already be imported. Check before adding.

- [ ] **Step 4: Run tests and verify**

Run: `npm run test`
Expected: All pass. The existing `hasDataViewChanged` tests (if any) may need updating for the new parameter.

Run: `npm run eslint`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataset/processing.ts src/index.ts
git commit -m "fix: detect supportFieldConfiguration changes as volatile for reprocessing"
```

---

### Task 2: DatasetSettings Component with TDD

**Depends on:** Task 4 (project slice setter), Task 6 (i18n keys)

**Files:**
- Create: `packages/app-core/src/features/settings-pane/components/__tests__/dataset-settings.test.tsx`
- Create: `packages/app-core/src/features/settings-pane/components/dataset-settings.tsx`

- [ ] **Step 1: Write failing tests**

Tests should cover:

1. **Renders field nodes for source fields only** — given a store with Product (grouping) and $ Sales (aggregation) in `dataset.fields`, renders two tree items. Does not render support fields (those with `isSupportField: true`).

2. **Measure fields show all five toggles** — $ Sales node has children: Highlight value, Highlight status, Highlight comparator, Format string, Formatted value.

3. **Column fields show only format toggles** — Product node has children: Format string, Formatted value only.

4. **Unconfigured fields show resolved defaults** — with empty `supportFieldConfiguration` and cross-highlight on, $ Sales Highlight value checkbox is checked (default on for new specs). Format/formatted unchecked.

5. **Configured fields show explicit flags** — with explicit config entry, checkboxes match the stored flags regardless of defaults.

6. **Highlight toggles disabled when cross-highlight off** — with `interactivity.highlight === false`, highlight checkboxes are disabled (not interactive).

7. **MessageBar Case 1: cross-highlight disabled** — shows info MessageBar with "Cross-highlighting is disabled" text.

8. **MessageBar Case 2: highlight on but no fields selected** — shows warning MessageBar.

9. **Case 1 takes precedence over Case 2** — when cross-highlight is off, only Case 1 shows.

10. **Checking a toggle writes all flags for that field** — simulate checking a single flag, verify `supportFieldConfiguration` in store gets a full `SupportFieldFlags` entry for that field.

Use `vi.mock` for the Zustand store. Use `@testing-library/react` for rendering and interaction (already used in the codebase for app-core tests).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/app-core && npx vitest run src/features/settings-pane/components/__tests__/dataset-settings.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement DatasetSettings component**

```typescript
// packages/app-core/src/features/settings-pane/components/dataset-settings.tsx
import { useMemo, useCallback } from 'react';
import {
    Tree,
    TreeItem,
    TreeItemLayout,
    TreeItemValue,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    MessageBarActions,
    Link,
    makeStyles,
    tokens
} from '@fluentui/react-components';
import {
    NumberSymbolRegular,
    TextSortAscendingRegular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import { resolveFieldDefaults } from '@deneb-viz/data-core/support-fields';
import type {
    SupportFieldFlags,
    SupportFieldConfiguration,
    SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import type { DatasetFieldRole } from '@deneb-viz/data-core/field';
```

**Component structure:**

1. Extract from store: `dataset.fields`, `project.supportFieldConfiguration`, `project.interactivity`, `project.setSupportFieldConfiguration` (or equivalent setter), and `translate`.

2. Filter fields to source fields only (`isSupportField !== true`).

3. Build `SupportFieldMasterSettings` from `interactivity`.

4. For each field, resolve checked state: if field has explicit config entry, use it; otherwise call `resolveFieldDefaults()`.

5. Render MessageBar(s) based on conditions.

6. Render Tree with TreeItems. Each field is a parent node with child checkboxes for applicable support fields. Highlight children are disabled when `interactivity.highlight === false`.

7. On checkbox change: read current flags for the field (explicit or resolved defaults), toggle the changed flag, write ALL flags to `supportFieldConfiguration`.

**Note on setter:** The project slice needs a method to update `supportFieldConfiguration`. This may need to be added — check if `syncProjectData` handles it or if a dedicated setter is needed. If a setter doesn't exist, add `setSupportFieldConfiguration` to the project slice in this task.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/app-core && npx vitest run src/features/settings-pane/components/__tests__/dataset-settings.test.tsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(app-core): add DatasetSettings component with TDD"
```

---

### Task 3: Wire DatasetSettings into Settings Pane

**Depends on:** Task 2

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`

- [ ] **Step 1: Import and add DatasetSettings**

```typescript
import { DatasetSettings } from './dataset-settings';
import { DatabaseRegular } from '@fluentui/react-icons';
```

Add between the Performance accordion item and `{settingsPanePlatformComponent}`:

```typescript
<SettingsAccordionItem
    value='dataset'
    heading={translate('Text_Settings_Dataset')}
    icon={<DatabaseRegular />}
>
    <DatasetSettings />
</SettingsAccordionItem>
{settingsPanePlatformComponent}
```

- [ ] **Step 2: Add i18n key**

Add `"Text_Settings_Dataset": "Dataset"` to `packages/app-core/src/i18n/en-US.json`.

- [ ] **Step 3: Verify in dev mode**

Run: `npm run dev`
Expected: Settings pane shows General → Performance → Dataset → (platform settings). The Dataset accordion item renders the Tree with source fields.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(app-core): wire DatasetSettings into Settings pane"
```

---

### Task 4: Project Slice Setter for supportFieldConfiguration

**Files:**
- Modify: `packages/app-core/src/state/project.ts`
- Modify: `packages/app-core/src/lib/project/types.ts` (if setter not already in slice)

If a dedicated setter for `supportFieldConfiguration` doesn't exist in the project slice, add one:

- [ ] **Step 1: Add setter to ProjectSliceProperties type**

In `packages/app-core/src/state/project.ts`, add to `ProjectSliceProperties`:

```typescript
setSupportFieldConfiguration: (config: SupportFieldConfiguration) => void;
```

- [ ] **Step 2: Implement the setter in createProjectSlice**

```typescript
setSupportFieldConfiguration: (config: SupportFieldConfiguration) => {
    set(
        (state) => ({
            project: {
                ...state.project,
                supportFieldConfiguration: config
            }
        }),
        false,
        'project/setSupportFieldConfiguration'
    );
}
```

This triggers the existing slice sync mechanism — the config gets persisted to Power BI's `stateManagement` property bag via the sync mapping added in Phase 1.

- [ ] **Step 3: Verify build**

Run: `cd packages/app-core && npm run build`
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(app-core): add setSupportFieldConfiguration to project slice"
```

---

### Task 5: Update Built-in Catalog Templates

**Files:**
- Modify: `packages/app-core/src/catalog/vega-lite/vl-bar-interactive.ts`
- Modify: `packages/app-core/src/catalog/vega/v-bar-interactive.ts`

Interactive templates use highlight and selection fields — they need explicit `supportFieldConfiguration` so new visuals created from them have the correct flags.

- [ ] **Step 1: Add supportFieldConfiguration to Vega-Lite interactive template**

In `packages/app-core/src/catalog/vega-lite/vl-bar-interactive.ts`, add to the usermeta spread:

```typescript
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';

const supportFieldConfiguration: SupportFieldConfiguration = {
    '__1__': {
        highlight: true,
        highlightStatus: true,
        highlightComparator: true,
        format: false,
        formatted: false
    }
};
```

Then in the usermeta object:
```typescript
usermeta: {
    ...getNewIncludedTemplateMetadata(...),
    ...{
        dataset,
        interactivity: { ... },
        supportFieldConfiguration
    }
}
```

- [ ] **Step 2: Add supportFieldConfiguration to Vega interactive template**

Same pattern in `packages/app-core/src/catalog/vega/v-bar-interactive.ts`.

- [ ] **Step 3: Verify templates load correctly**

Run: `npm run dev`
Create a new visual from the interactive bar chart template. Verify the Dataset accordion shows $ Sales with highlight flags checked.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(app-core): add supportFieldConfiguration to interactive catalog templates"
```

---

### Task 6: i18n Keys for Support Field Labels

**Files:**
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add all required i18n keys**

```json
"Text_Settings_Dataset": "Dataset",
"Text_SupportField_Highlight": "Highlight value",
"Text_SupportField_HighlightStatus": "Highlight status",
"Text_SupportField_HighlightComparator": "Highlight comparator",
"Text_SupportField_Format": "Format string",
"Text_SupportField_Formatted": "Formatted value",
"Text_SupportField_RoleColumn": "Column",
"Text_SupportField_RoleMeasure": "Measure",
"Text_SupportField_RoleTooltip_Column": "This field is a column (categorical). Only format support fields are available.",
"Text_SupportField_RoleTooltip_Measure": "This field is a measure (aggregation). All support field types are available.",
"Text_MessageBar_CrossHighlightDisabled": "Cross-highlighting is disabled. Highlight fields are not available.",
"Text_MessageBar_CrossHighlightDisabled_Action": "Enable cross-highlighting",
"Text_MessageBar_NoHighlightFields": "Cross-highlighting is enabled but no highlight fields are selected. Visual interactions may not work as expected."
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(app-core): add i18n keys for Dataset settings and support field labels"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass across all packages.

- [ ] **Step 2: Run linter**

Run: `npm run eslint`
Expected: No new errors.

- [ ] **Step 3: Build production**

Run: `npm run webpack:build`
Expected: Clean build, no type errors.

- [ ] **Step 4: Manual end-to-end test**

In Power BI dev environment:

1. **New spec** → Open Settings → Dataset accordion → verify fields shown with new defaults (highlight on for measures, format/formatted off)
2. **Toggle highlight checkbox** → verify dataset reprocesses → debug pane shows updated fields
3. **Turn off cross-highlight master setting** → verify highlight checkboxes become disabled → MessageBar Case 1 shows
4. **Turn cross-highlight back on** → verify highlight checkboxes re-enabled with memoized state
5. **All highlight fields unchecked + cross-highlight on** → verify MessageBar Case 2 (warning) shows
6. **Interactive template** → create from template → verify highlight flags pre-checked for measure
7. **Existing spec (legacy)** → verify all applicable flags shown as checked (legacy defaults)
