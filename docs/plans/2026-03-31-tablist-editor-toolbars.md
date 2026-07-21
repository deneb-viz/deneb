# TabList for Editor Toolbars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ToolbarRadioButton mode selectors with Fluent UI TabList in both the command bar and debug toolbar, adding underline active indicators.

**Architecture:** Both components currently wrap mode selection (Spec/Config/Settings and Data/Signals/Logs) in ToolbarRadioGroup inside a Toolbar. Replace each radio group with a TabList using `appearance="transparent"` (underline indicator) and `size="small"`. Keep action buttons in a sibling Toolbar. Both sit in a shared flex row.

**Tech Stack:** React 19, Fluent UI v9 (`TabList`, `Tab` from `@fluentui/react-components`), Zustand

---

### Task 1: Convert command bar to TabList

**Files:**
- Modify: `packages/app-core/src/features/command-bar/components/command-bar.tsx`

- [ ] **Step 1: Replace the component**

Replace the entire file contents of `packages/app-core/src/features/command-bar/components/command-bar.tsx`:

```typescript
import {
    makeStyles,
    SelectTabData,
    SelectTabEvent,
    Tab,
    TabList,
    tokens,
    Toolbar,
    ToolbarDivider,
    ToolbarGroup
} from '@fluentui/react-components';
import {
    DataHistogramFilled,
    SettingsRegular,
    TextEditStyleRegular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import { useSpecificationEditor } from '../../specification-editor';
import {
    type EditorPaneRole,
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification,
    POPOVER_Z_INDEX
} from '../../../lib';
import { ToolbarButtonStandard } from '../../../components/ui';

const useCommandBarStyles = makeStyles({
    root: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        flex: '0 0 auto',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    buttonAutoApplyEnabled: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
        color: tokens.colorBrandForeground1
    },
    buttonZoomLevel: { minWidth: '50px' },
    buttonZoomIn: { marginLeft: '-8px' },
    buttonZoomOut: { marginRight: '-8px' },
    controlBaseZoomLevel: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'column',
        '> label': {
            marginBottom: tokens.spacingVerticalXXS
        }
    },
    menuButtonApply: {
        width: '165px',
        maxWidth: '165px',
        '& button': {
            minWidth: '145px',
            justifyContent: 'start',
            fontWeight: 'normal'
        }
    },
    menuButtonApplyList: {
        width: '155px',
        maxWidth: '155px',
        zIndex: POPOVER_Z_INDEX
    },
    popoverZoomLevel: {
        zIndex: POPOVER_Z_INDEX
    },
    spinButtonZoomCustom: {
        marginLeft: '40px',
        width: '80px'
    },
    actionToolbar: {
        display: 'flex',
        justifyContent: 'normal',
        columnGap: tokens.spacingHorizontalXXS,
        flexGrow: 1
    },
    actionGroup: {
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    }
});

export const CommandBar = () => {
    const { editorSelectedOperation, translate } = useDenebState((state) => ({
        editorSelectedOperation: state.editorSelectedOperation,
        translate: state.i18n.translate
    }));
    const editorRefs = useSpecificationEditor();
    const classes = useCommandBarStyles();
    const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
        const role = data.value as EditorPaneRole;
        switch (role) {
            case 'Spec':
                handleEditorPaneSpecification(editorRefs);
                break;
            case 'Config':
                handleEditorPaneConfig(editorRefs);
                break;
            case 'Settings':
                handleEditorPaneSettings();
                break;
        }
    };
    return (
        <div className={classes.root}>
            <TabList
                size='small'
                appearance='transparent'
                selectedValue={editorSelectedOperation}
                onTabSelect={onTabSelect}
            >
                <Tab value='Spec' icon={<DataHistogramFilled />}>
                    {translate('Editor_Role_Spec')}
                </Tab>
                <Tab value='Config' icon={<TextEditStyleRegular />}>
                    {translate('Editor_Role_Config')}
                </Tab>
                <Tab value='Settings' icon={<SettingsRegular />}>
                    {translate('Editor_Role_Settings')}
                </Tab>
            </TabList>
            <Toolbar className={classes.actionToolbar}>
                <ToolbarGroup className={classes.actionGroup}>
                    <ToolbarButtonStandard
                        command='applyChanges'
                        role='application'
                    />
                    <ToolbarButtonStandard
                        command='autoApplyToggle'
                        role='application'
                    />
                </ToolbarGroup>
                <ToolbarGroup className={classes.actionGroup}>
                    <ToolbarButtonStandard
                        command='newSpecification'
                        role='application'
                    />
                    <ToolbarButtonStandard
                        command='exportSpecification'
                        role='application'
                    />
                    <ToolbarDivider />
                    <ToolbarButtonStandard
                        command='themeToggle'
                        role='application'
                    />
                    <ToolbarButtonStandard
                        command='helpSite'
                        role='application'
                    />
                </ToolbarGroup>
            </Toolbar>
        </div>
    );
};
```

Key changes:
- Root element is a `<div>` flex container (not `Toolbar`) since TabList and Toolbar are siblings
- `ToolbarRadioGroup`/`ToolbarRadioButton` replaced with `TabList`/`Tab` using `appearance="transparent"` (underline indicator) and `size="small"`
- `onCheckedValueChange` replaced with `onTabSelect` using `SelectTabEvent`/`SelectTabData` types
- `checkedValues` replaced with `selectedValue`
- Dead styles removed: `toolbarDebug`, `toolbarGroupDebug`, `buttonSmall`, `PREVIEW_PANE_TOOLBAR_BUTTON_PADDING` import, `DEBUG_PANE_CONFIGURATION` import
- `toolbarAdvancedEditor` renamed to `root`, `toolbarAdvancedEditorGrow` renamed to `actionToolbar`, `toolbarGroupAdvancedEditor` renamed to `actionGroup`

- [ ] **Step 2: Verify the build compiles**

Run: `npm run webpack:build`
Expected: Clean compile. Check the editor visually — tabs should show Spec/Config/Settings with underline indicator on the active tab.

- [ ] **Step 3: Commit**

```
feat(app-core): replace command bar radio buttons with TabList
```

---

### Task 2: Convert debug toolbar to TabList

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`

- [ ] **Step 1: Replace the component**

Replace the entire file contents of `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`:

```typescript
import {
    makeStyles,
    SelectTabData,
    SelectTabEvent,
    Tab,
    TabList,
    tokens,
    Toolbar,
    ToolbarGroup
} from '@fluentui/react-components';
import {
    Communication16Regular,
    Notebook16Regular,
    Table16Regular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import {
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    type DebugPaneRole
} from '../../../lib';
import { LogErrorIndicator } from './log-viewer/log-error-indicator';
import { ToolbarButtonStandard } from '../../../components/ui';
import { ZoomSlider } from './zoom-controls/zoom-slider';
import { ZoomLevelPopover } from './zoom-controls/zoom-level-popover';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';

const useToolbarStyles = makeStyles({
    root: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        height: `${DEBUG_PANE_CONFIGURATION.toolbarMinSize}px`,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: tokens.spacingVerticalNone,
        paddingTop: tokens.spacingVerticalNone
    },
    group: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    }
});

export const DebugToolbar = () => {
    const { editorPreviewAreaSelectedPivot } = useDenebState((state) => ({
        editorPreviewAreaSelectedPivot: state.editorPreviewAreaSelectedPivot
    }));
    const classes = useToolbarStyles();
    const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
        const role = data.value as DebugPaneRole;
        switch (role) {
            case 'data':
                handleDebugPaneData();
                break;
            case 'signal':
                handleDebugPaneSignal();
                break;
            case 'log':
                handleDebugPaneLog();
                break;
        }
    };
    return (
        <div className={classes.root}>
            <TabList
                size='small'
                appearance='transparent'
                selectedValue={editorPreviewAreaSelectedPivot}
                onTabSelect={onTabSelect}
            >
                <Tab value='data' icon={<Table16Regular />}>
                    Data
                </Tab>
                <Tab value='signal' icon={<Communication16Regular />}>
                    Signals
                </Tab>
                <Tab value='log' icon={<Notebook16Regular />}>
                    Logs &nbsp;
                    <LogErrorIndicator />
                </Tab>
            </TabList>
            <Toolbar size='small'>
                <ToolbarGroup className={classes.group}>
                    <ToolbarButtonStandard command='zoomOut' role='debug' />
                    <ZoomSlider />
                    <ToolbarButtonStandard command='zoomIn' role='debug' />
                    <ZoomLevelPopover />
                    <ToolbarButtonStandard command='zoomFit' role='debug' />
                    <ToolbarButtonStandard
                        command='debugPaneToggle'
                        role='debug'
                    />
                </ToolbarGroup>
            </Toolbar>
        </div>
    );
};
```

Key changes:
- Root element is a `<div>` flex container (not `Toolbar`) since TabList and Toolbar are siblings
- `ToolbarRadioGroup`/`ToolbarRadioButton` replaced with `TabList`/`Tab` using `appearance="transparent"` and `size="small"`
- `onCheckedValueChange` replaced with `onTabSelect`
- `LogErrorIndicator` stays inside the Logs `Tab` label
- Zoom controls remain in a `Toolbar` > `ToolbarGroup` on the right
- Added `alignItems: 'center'` to `root` for vertical alignment of TabList and Toolbar

- [ ] **Step 2: Verify the build compiles**

Run: `npm run webpack:build`
Expected: Clean compile. Check the debug pane — Data/Signals/Logs tabs should show with underline indicator. LogErrorIndicator still visible inside Logs tab.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: All pass. No tests directly test these components' rendering.

- [ ] **Step 4: Commit**

```
feat(app-core): replace debug toolbar radio buttons with TabList
```

---

## Verification

1. **Command bar tabs**: Click Spec/Config/Settings — editor pane switches, underline indicator follows active tab
2. **Debug toolbar tabs**: Click Data/Signals/Logs — debug content switches, underline indicator follows
3. **LogErrorIndicator**: Create a spec with errors — red/yellow icon appears inside Logs tab
4. **Action buttons**: Apply, Auto-apply, New, Export, Theme, Help all still work
5. **Zoom controls**: Zoom in/out/fit, slider, level popover all still work
6. **Dark mode**: Toggle theme — tabs and toolbars respect theme background tokens
7. **Keyboard**: Arrow keys navigate between tabs (Fluent TabList built-in)
