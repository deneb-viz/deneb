# Settings Pane Redesign Spec

## Problem

The settings pane was originally built pre-Fluent UI, then ported to Fluent UI 8, and is now on v9. The current implementation uses flat layout with full-text assistive paragraphs, RadioGroups that consume vertical space, and no collapsible structure. As settings have grown (e.g., context menu two-level control, performance tuning), the pane requires excessive scrolling and lacks visual hierarchy.

## Design

### Layout: Fluent UI v9 Accordion

Replace the current flat layout with a 5-section `Accordion` component:

1. **Provider & Rendering** — Language RadioGroup + Render mode RadioGroup
2. **Performance** — Incremental updates Switch + Row threshold SpinButton with reset + contextual status badge
3. **Tooltips & Context Menu** — Tooltip handler Checkbox, Show context menu Checkbox, Resolve data point Checkbox (indented, disabled when parent off)
4. **Cross-filtering** — Enable selection Checkbox, Mode RadioGroup (simple/advanced, advanced disabled for VL), Data point limit SpinButton with reset
5. **Cross-highlighting** — Enable highlight Checkbox

### Behavior

- Multiple sections can be open simultaneously
- All sections default to expanded on first open
- Each section is independently collapsible via the Accordion header
- Sections use bordered containers with chevron indicators

### Help Text: InfoLabel

Replace all assistive text blocks (`SettingsTextSection`) with Fluent UI v9 `InfoLabel` — a small (i) icon next to each setting label that shows the help text in a popover on hover/click. This eliminates the large text paragraphs that dominate the current vertical space.

Each setting that currently has assistive text gets an `InfoLabel`. The i18n strings are retained but displayed via the InfoLabel popover instead of inline.

### Status Badge (Performance)

The performance section retains the contextual patching status message ("Patching is active/inactive for your current dataset") but renders it as a compact inline badge rather than a separate text section.

### Component Structure

The current settings pane has two layers:
- **app-core** (`packages/app-core/src/features/settings-pane/`) — Provider, Render Mode, Performance settings
- **root visual** (`src/features/settings/`) — Interactivity settings (injected via platform component)

The redesign restructures into a single Accordion rendered by the app-core `SettingsPane`, with the platform component contributing its sections as Accordion items rather than as a separate block appended at the end.

### Fluent UI v9 Components

**New components to introduce:**
- `Accordion`, `AccordionItem`, `AccordionHeader`, `AccordionPanel` — collapsible sections
- `InfoLabel` — (i) icon with popover help text

**Existing components retained:**
- `Checkbox` — interactivity toggles
- `RadioGroup`, `Radio` — provider, render mode, selection mode choices
- `Switch` — incremental updates toggle
- `SpinButton` — numeric thresholds
- `Button` — reset actions
- `Field` — form field wrapper

**Components removed:**
- `Divider` — replaced by Accordion section borders
- `SettingsTextSection` — replaced by InfoLabel
- `SettingsHeadingLabel` — replaced by AccordionHeader

### Tooltip/Popover Mount Node

InfoLabel's popover and any Tooltip content will need a mount node outside the settings pane's overflow-hidden container, following the existing `TooltipCustomMount` pattern used in the data table (`DataTableTooltipProvider`) and editor area (`CursorContext`). A `SettingsPaneTooltipProvider` (or similar) should be added at the settings pane root level, providing a mount node via context that InfoLabel and Tooltip components consume.

### i18n

Existing i18n keys are retained. The values move from inline text to InfoLabel popover content. No keys are removed; display context changes from paragraph to popover.

### Developer Mode Gating

Interactivity sections (Tooltips & Context Menu, Cross-filtering, Cross-highlighting) remain gated by the existing developer mode mechanism (`resolveDeveloperSettings` hides the entire vega card when developer mode is off). No change to gating logic.

## Files to Modify

**App-core settings pane:**
- `packages/app-core/src/features/settings-pane/components/settings-pane.tsx` — Replace flat layout with Accordion, accept platform sections as Accordion items
- `packages/app-core/src/features/settings-pane/components/provider-settings.tsx` — Wrap in AccordionItem, replace SettingsHeadingLabel/SettingsTextSection with AccordionHeader/InfoLabel
- `packages/app-core/src/features/settings-pane/components/render-mode-settings.tsx` — Same treatment
- `packages/app-core/src/features/settings-pane/components/performance-settings.tsx` — Same treatment, add status badge styling
- `packages/app-core/src/features/settings-pane/styles.ts` — Update styles for Accordion layout

**Root visual settings:**
- `src/features/settings/components/interactivity-settings.tsx` — Split into 3 AccordionItem components (Tooltips & Context Menu, Cross-filtering, Cross-highlighting)
- `src/features/settings/components/interactivity-checkbox.tsx` — Retain, add InfoLabel support
- `src/features/settings/components/cross-filter-mode-settings.tsx` — Wrap in AccordionPanel content
- `src/features/settings/components/cross-filter-max-data-points.tsx` — Wrap in AccordionPanel content
- `src/features/settings/styles.ts` — Update styles

**Shared components (may be removed or simplified):**
- `packages/app-core/src/features/settings-pane/components/settings-heading-label.tsx` — Remove (replaced by AccordionHeader)
- `packages/app-core/src/features/settings-pane/components/settings-text-section.tsx` — Remove (replaced by InfoLabel)

## Verification

1. `npm run test` — all tests pass
2. `npm run webpack:build` — compiles
3. Manual testing in Power BI:
   - All 5 sections render as Accordion items, all expanded by default
   - Each section independently collapses/expands
   - InfoLabel (i) icons show popover with help text on hover
   - Provider & Rendering: RadioGroups work, selection persists
   - Performance: Switch, SpinButton, reset, status badge all functional
   - Tooltips & Context Menu: all 3 checkboxes work, data point disabled when context menu off
   - Cross-filtering: checkbox, mode RadioGroup, SpinButton all work, advanced disabled for VL
   - Cross-highlighting: checkbox works
   - Developer mode off: interactivity sections hidden (existing gating)
   - Settings persist correctly to Power BI properties
   - Template export/import retains all settings
