# Settings Pane Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat settings pane with a 5-section Fluent UI v9 Accordion layout, using InfoLabel for help text and a tooltip mount context for popover rendering.

**Architecture:** The app-core `SettingsPane` renders an `Accordion` with core sections (Provider & Rendering, Performance) and receives platform-injected sections (Tooltips & Context Menu, Cross-filtering, Cross-highlighting) as AccordionItem children. A `SettingsPaneTooltipProvider` wraps the Accordion to provide a mount node for InfoLabel popovers and Tooltips outside the overflow-hidden container. `SettingsHeadingLabel` and `SettingsTextSection` components are removed — replaced by AccordionHeader and InfoLabel respectively.

**Tech Stack:** React 19, Fluent UI v9 (Accordion, InfoLabel, Field), TypeScript 5.6

---

## Resumption Point

**Status as of 2026-03-26:** Tasks 1-4 complete (Accordion structure, tooltip context, section splitting, cleanup). Build compiles. NOT committed — pending Task 5.5 below.

**What's missing:** The subagent removed `SettingsTextSection` blocks but did NOT add `InfoLabel` or `Field` components. All settings currently render with plain `Label` — no (i) info icons, no help text popovers. The Fluent UI `Field` component should wrap each form control for consistent layout (label + hint + validation), and `InfoLabel` should provide the (i) icon with popover help text.

### Task 5.5: Add Field + InfoLabel to all settings components (RESUME HERE)

**Files to modify:**
- `packages/app-core/src/features/settings-pane/components/provider-settings.tsx` — Wrap RadioGroups in Field, add InfoLabel with assistive text from existing i18n keys
- `packages/app-core/src/features/settings-pane/components/render-mode-settings.tsx` — Same
- `packages/app-core/src/features/settings-pane/components/performance-settings.tsx` — Same, status badge text should use Field hint or remain as badge
- `src/features/settings/components/interactivity-checkbox.tsx` — Add InfoLabel support, each checkbox type maps to an info text i18n key
- `src/features/settings/components/cross-filter-mode-settings.tsx` — Wrap in Field
- `src/features/settings/components/cross-filter-max-data-points.tsx` — Wrap in Field

**Pattern to follow:**
```tsx
import { Field, InfoLabel } from '@fluentui/react-components';

<Field
    label={
        <InfoLabel info={translate('Assistive_Text_Provider')}>
            {translate('Text_Vega_Provider')}
        </InfoLabel>
    }
>
    <RadioGroup ... />
</Field>
```

**Key points:**
- `InfoLabel` needs `mountNode` from `useSettingsPaneTooltip()` context (already created in Task 1)
- Existing i18n keys for assistive text are retained — they move from inline paragraphs to InfoLabel popover content
- `Field` provides consistent spacing, label positioning, and accessibility
- The interactivity checkboxes each need a mapping from type → info text i18n key

---

### Task 1: Create SettingsPaneTooltipProvider

**Files:**
- Create: `packages/app-core/src/features/settings-pane/components/settings-pane-tooltip-context.tsx`

**Context:** InfoLabel popovers and Tooltips in the settings pane need a mount node outside overflow-hidden containers. This follows the exact pattern of `DataTableTooltipProvider` in `packages/app-core/src/features/debug-area/components/data-table/data-table-tooltip-context.tsx`.

- [ ] **Step 1: Create the tooltip context**

```typescript
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { TooltipCustomMount } from '../../../../components/ui';

type SettingsPaneTooltipContextValue = {
    mountNode: HTMLElement | null;
};

const SettingsPaneTooltipContext =
    createContext<SettingsPaneTooltipContextValue | null>(null);

export const useSettingsPaneTooltip = () => {
    const ctx = useContext(SettingsPaneTooltipContext);
    return ctx?.mountNode ?? null;
};

export const SettingsPaneTooltipProvider = ({
    children
}: {
    children: ReactNode;
}) => {
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
    const contextValue = useMemo(() => ({ mountNode }), [mountNode]);
    return (
        <SettingsPaneTooltipContext.Provider value={contextValue}>
            {children}
            <TooltipCustomMount setRef={setMountNode} />
        </SettingsPaneTooltipContext.Provider>
    );
};
```

- [ ] **Step 2: Export from settings-pane index**

In `packages/app-core/src/features/settings-pane/index.ts`, add:

```typescript
export { useSettingsPaneTooltip } from './components/settings-pane-tooltip-context';
```

- [ ] **Step 3: Build to verify**

Run: `npm run webpack:build`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add packages/app-core/src/features/settings-pane/
git commit -m "feat(app-core): add SettingsPaneTooltipProvider for settings pane (#598)"
```

---

### Task 2: Convert SettingsPane to Accordion layout

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`
- Modify: `packages/app-core/src/components/deneb-platform/types.ts:47`

**Context:** The current `SettingsPane` renders sections separated by `Divider` components. Replace with a Fluent UI v9 `Accordion`. The platform component type changes from `JSX.Element` to `JSX.Element[]` to allow injecting multiple AccordionItems.

- [ ] **Step 1: Update platform component type**

In `packages/app-core/src/components/deneb-platform/types.ts`, change:

```typescript
settingsPanePlatformComponent?: JSX.Element;
```

To:

```typescript
settingsPanePlatformComponent?: JSX.Element[];
```

- [ ] **Step 2: Rewrite SettingsPane with Accordion**

Replace `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`:

```typescript
import {
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { ProviderSettings } from './provider-settings';
import { RenderModeSettings } from './render-mode-settings';
import { PerformanceSettings } from './performance-settings';
import { SettingsPaneTooltipProvider } from './settings-pane-tooltip-context';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useDenebState } from '../../../state';

const useSettingsPaneStyles = makeStyles({
    root: {
        overflow: 'overlay',
        padding: tokens.spacingVerticalXS
    }
});

export const SettingsPane = () => {
    const classes = useSettingsPaneStyles();
    const { settingsPanePlatformComponent } = useDenebPlatformProvider();
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <SettingsPaneTooltipProvider>
            <div className={classes.root}>
                <Accordion multiple defaultOpenItems={['provider', 'performance', 'tooltips', 'crossfilter', 'crosshighlight']}>
                    <AccordionItem value='provider'>
                        <AccordionHeader>{translate('Text_Vega_Provider_And_Rendering')}</AccordionHeader>
                        <AccordionPanel>
                            <ProviderSettings />
                            <RenderModeSettings />
                        </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value='performance'>
                        <AccordionHeader>{translate('Text_Vega_Performance')}</AccordionHeader>
                        <AccordionPanel>
                            <PerformanceSettings />
                        </AccordionPanel>
                    </AccordionItem>
                    {settingsPanePlatformComponent}
                </Accordion>
            </div>
        </SettingsPaneTooltipProvider>
    );
};
```

- [ ] **Step 3: Add i18n key for combined section**

In `packages/app-core/src/i18n/en-US.json`, add:

```json
"Text_Vega_Provider_And_Rendering": "Provider & Rendering",
```

- [ ] **Step 4: Simplify ProviderSettings (remove heading/text)**

In `packages/app-core/src/features/settings-pane/components/provider-settings.tsx`, remove `SettingsHeadingLabel` and `SettingsTextSection` wrappers. The component now renders just its RadioGroup content — the AccordionHeader in SettingsPane provides the section title. Add InfoLabel for assistive text.

- [ ] **Step 5: Simplify RenderModeSettings (same treatment)**

In `packages/app-core/src/features/settings-pane/components/render-mode-settings.tsx`, remove heading/text, add InfoLabel.

- [ ] **Step 6: Simplify PerformanceSettings (same treatment, keep status badge)**

In `packages/app-core/src/features/settings-pane/components/performance-settings.tsx`, remove heading/text. The status message becomes a compact inline badge. Replace `SettingsTextSection` with a styled `Caption1` badge. Update `TooltipCustomMount` to use `useSettingsPaneTooltip()` context instead of local state.

- [ ] **Step 7: Build to verify**

Run: `npm run webpack:build`
Expected: Compiles successfully

- [ ] **Step 8: Commit**

```bash
git add packages/app-core/src/features/settings-pane/ packages/app-core/src/components/deneb-platform/ packages/app-core/src/i18n/
git commit -m "feat(app-core): convert settings pane to Accordion layout (#598)"
```

---

### Task 3: Split InteractivitySettings into 3 AccordionItems

**Files:**
- Modify: `src/features/settings/components/interactivity-settings.tsx`
- Modify: `src/app/app.tsx:171`

**Context:** The current `InteractivitySettings` is a single component rendering all interactivity controls. Split it into 3 `AccordionItem` components for the 3 new sections: Tooltips & Context Menu, Cross-filtering, Cross-highlighting. The platform component type is now `JSX.Element[]`, so return an array of AccordionItems.

- [ ] **Step 1: Rewrite InteractivitySettings to return AccordionItem array**

Replace the content of `src/features/settings/components/interactivity-settings.tsx` to export 3 AccordionItems wrapped in a fragment or returned as an array. Each AccordionItem has its own AccordionHeader. The content for each section is the existing controls, stripped of `SettingsHeadingLabel` and `SettingsTextSection`.

Section 1 — Tooltips & Context Menu:
- InteractivityCheckbox type='tooltip'
- InteractivityCheckbox type='context'
- InteractivityCheckbox type='contextSelector' (indented, disabled when context off)

Section 2 — Cross-filtering:
- InteractivityCheckbox type='select'
- CrossFilterModeSettings (when selection enabled)
- CrossFilterMaxDataPoints (when simple mode and selection enabled)

Section 3 — Cross-highlighting:
- InteractivityCheckbox type='highlight'

- [ ] **Step 2: Update app.tsx to pass array**

In `src/app/app.tsx`, change:

```typescript
settingsPanePlatformComponent: <InteractivitySettings />,
```

To:

```typescript
settingsPanePlatformComponent: InteractivitySettings(),
```

Or restructure `InteractivitySettings` to return `JSX.Element[]` and spread into the Accordion.

- [ ] **Step 3: Add InfoLabel to InteractivityCheckbox**

In `src/features/settings/components/interactivity-checkbox.tsx`, add an optional `infoText` prop. When provided, render a Fluent UI `InfoLabel` instead of a plain label. Use `useSettingsPaneTooltip()` for the mount node.

- [ ] **Step 4: Add i18n keys for new section headers**

In `src/i18n/en-US.json`, add:

```json
"PowerBI_Objects_Vega_TooltipsAndContextMenu": "Tooltips & Context Menu",
"PowerBI_Objects_Vega_CrossFiltering": "Cross-filtering",
"PowerBI_Objects_Vega_CrossHighlighting": "Cross-highlighting",
```

- [ ] **Step 5: Build to verify**

Run: `npm run webpack:build`
Expected: Compiles successfully

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/features/settings/ src/app/app.tsx src/i18n/
git commit -m "feat: split interactivity settings into 3 Accordion sections (#598)"
```

---

### Task 4: Remove deprecated components and clean up exports

**Files:**
- Remove: `packages/app-core/src/features/settings-pane/components/settings-heading-label.tsx`
- Remove: `packages/app-core/src/features/settings-pane/components/settings-text-section.tsx`
- Modify: `packages/app-core/src/features/settings-pane/index.ts`
- Modify: `packages/app-core/src/features/settings-pane/styles.ts`

**Context:** `SettingsHeadingLabel` and `SettingsTextSection` are no longer used — replaced by AccordionHeader and InfoLabel. Clean up exports and remove dead code.

- [ ] **Step 1: Remove component files**

Delete `settings-heading-label.tsx` and `settings-text-section.tsx`.

- [ ] **Step 2: Update exports**

In `packages/app-core/src/features/settings-pane/index.ts`, remove the exports for the deleted components. Update to:

```typescript
export { SettingsPane } from './components/settings-pane';
export { useSettingsPaneTooltip } from './components/settings-pane-tooltip-context';
export { useSettingsPaneStyles } from './styles';
```

- [ ] **Step 3: Remove references from root visual**

In `src/features/settings/components/interactivity-settings.tsx`, remove any remaining imports of `SettingsHeadingLabel` and `SettingsTextSection` from `@deneb-viz/app-core`.

- [ ] **Step 4: Clean up styles**

Update `packages/app-core/src/features/settings-pane/styles.ts` — remove `sectionContainer` if no longer used (replaced by AccordionPanel). Keep `spinButtonContainer` and `spinButtonControl` if still needed by PerformanceSettings.

- [ ] **Step 5: Build to verify**

Run: `npm run webpack:build`
Expected: Compiles successfully

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/app-core/src/features/settings-pane/ src/features/settings/
git commit -m "refactor(app-core): remove deprecated SettingsHeadingLabel and SettingsTextSection (#598)"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify in Power BI**

Test all aspects:

1. All 5 sections render as Accordion items, all expanded by default
2. Each section independently collapses/expands
3. Multiple sections can be open simultaneously
4. InfoLabel (i) icons show popover with help text — popover renders above overflow containers
5. Provider & Rendering: RadioGroups work, selection persists
6. Performance: Switch, SpinButton, reset, status badge all functional
7. Tooltips & Context Menu: all 3 checkboxes work, data point disabled when context menu off
8. Cross-filtering: checkbox, mode RadioGroup, SpinButton all work, advanced disabled for VL
9. Cross-highlighting: checkbox works
10. Developer mode off: interactivity sections hidden
11. Settings persist correctly to Power BI properties
12. Template export/import retains all settings

---

### Summary of files changed

| File | Change |
|------|--------|
| `packages/app-core/src/features/settings-pane/components/settings-pane-tooltip-context.tsx` | New — tooltip mount context for settings pane |
| `packages/app-core/src/features/settings-pane/components/settings-pane.tsx` | Rewrite — Accordion layout with SettingsPaneTooltipProvider |
| `packages/app-core/src/features/settings-pane/components/provider-settings.tsx` | Simplify — remove heading/text, add InfoLabel |
| `packages/app-core/src/features/settings-pane/components/render-mode-settings.tsx` | Simplify — remove heading/text, add InfoLabel |
| `packages/app-core/src/features/settings-pane/components/performance-settings.tsx` | Simplify — remove heading/text, use context mount, status badge |
| `packages/app-core/src/features/settings-pane/components/settings-heading-label.tsx` | Remove |
| `packages/app-core/src/features/settings-pane/components/settings-text-section.tsx` | Remove |
| `packages/app-core/src/features/settings-pane/index.ts` | Update exports |
| `packages/app-core/src/features/settings-pane/styles.ts` | Clean up unused styles |
| `packages/app-core/src/components/deneb-platform/types.ts` | Change platform component type to array |
| `src/features/settings/components/interactivity-settings.tsx` | Split into 3 AccordionItem components |
| `src/features/settings/components/interactivity-checkbox.tsx` | Add InfoLabel support |
| `src/app/app.tsx` | Update platform component injection |
| `packages/app-core/src/i18n/en-US.json` | Add combined section header key |
| `src/i18n/en-US.json` | Add 3 new section header keys |
