import { useState } from 'react';
import {
    makeStyles,
    tokens,
    Toolbar,
    ToolbarGroup,
    ToolbarProps,
    ToolbarRadioButton,
    ToolbarRadioGroup,
    Tooltip
} from '@fluentui/react-components';
import {
    Communication16Regular,
    DatabaseLinkRegular,
    Notebook16Regular,
    Table16Regular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import {
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    handleDebugPaneSource,
    type DebugPaneRole
} from '../../../lib';
import { LogErrorIndicator } from './log-viewer/log-error-indicator';
import {
    ToolbarButtonStandard,
    TooltipCustomMount
} from '../../../components/ui';
import { ZoomSlider } from './zoom-controls/zoom-slider';
import { ZoomLevelPopover } from './zoom-controls/zoom-level-popover';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import {
    ARIA_KEYSHORTCUTS_BY_PIVOT,
    TOOLTIP_KEY_BY_PIVOT
} from './debug-toolbar-lookups';

const useToolbarStyles = makeStyles({
    root: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        height: `${DEBUG_PANE_CONFIGURATION.toolbarMinSize}px`,
        justifyContent: 'space-between',
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
    const { editorPreviewAreaSelectedPivot, translate } = useDenebState(
        (state) => ({
            editorPreviewAreaSelectedPivot:
                state.editorPreviewAreaSelectedPivot,
            translate: state.i18n.translate
        })
    );
    const classes = useToolbarStyles();
    /**
     * Four separate `useState` pairs for the `<TooltipCustomMount>` mount
     * nodes — one per pivot. Matches the canonical pattern in
     * `toolbar-button-standard.tsx`. We pass the state setter directly to
     * `setRef`, which is identity-stable across renders. A single
     * `useState<Record<...>>` with inline callbacks creates a new closure
     * each render, and React's ref-callback contract then triggers an
     * infinite detach/reattach loop on commit.
     */
    const [sourceMount, setSourceMount] = useState<HTMLElement | null>(null);
    const [dataMount, setDataMount] = useState<HTMLElement | null>(null);
    const [signalMount, setSignalMount] = useState<HTMLElement | null>(null);
    const [logMount, setLogMount] = useState<HTMLElement | null>(null);
    const onDebugModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as DebugPaneRole;
        switch (role) {
            case 'source':
                handleDebugPaneSource();
                break;
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
        <Toolbar
            aria-label='Debug view'
            size='small'
            className={classes.root}
            onCheckedValueChange={onDebugModeChange}
            checkedValues={{ debugMode: [editorPreviewAreaSelectedPivot] }}
        >
            <ToolbarRadioGroup className={classes.group}>
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.source)}
                    mountNode={sourceMount}
                >
                    <ToolbarRadioButton
                        name='debugMode'
                        value='source'
                        appearance='subtle'
                        size='small'
                        icon={<DatabaseLinkRegular />}
                        aria-keyshortcuts={ARIA_KEYSHORTCUTS_BY_PIVOT.source}
                    >
                        {translate('Pivot_Debug_Source')}
                    </ToolbarRadioButton>
                </Tooltip>
                <TooltipCustomMount setRef={setSourceMount} />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.data)}
                    mountNode={dataMount}
                >
                    <ToolbarRadioButton
                        name='debugMode'
                        value='data'
                        appearance='subtle'
                        size='small'
                        icon={<Table16Regular />}
                        aria-keyshortcuts={ARIA_KEYSHORTCUTS_BY_PIVOT.data}
                    >
                        {translate('Pivot_Debug_VegaData')}
                    </ToolbarRadioButton>
                </Tooltip>
                <TooltipCustomMount setRef={setDataMount} />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.signal)}
                    mountNode={signalMount}
                >
                    <ToolbarRadioButton
                        name='debugMode'
                        value='signal'
                        appearance='subtle'
                        size='small'
                        icon={<Communication16Regular />}
                        aria-keyshortcuts={ARIA_KEYSHORTCUTS_BY_PIVOT.signal}
                    >
                        {translate('Pivot_Debug_VegaSignals')}
                    </ToolbarRadioButton>
                </Tooltip>
                <TooltipCustomMount setRef={setSignalMount} />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.log)}
                    mountNode={logMount}
                >
                    <ToolbarRadioButton
                        name='debugMode'
                        value='log'
                        appearance='subtle'
                        size='small'
                        icon={<Notebook16Regular />}
                        aria-keyshortcuts={ARIA_KEYSHORTCUTS_BY_PIVOT.log}
                    >
                        {translate('Pivot_Debug_VegaLogs')}
                        <LogErrorIndicator />
                    </ToolbarRadioButton>
                </Tooltip>
                <TooltipCustomMount setRef={setLogMount} />
            </ToolbarRadioGroup>
            <ToolbarGroup className={classes.group}>
                <ToolbarButtonStandard command='zoomOut' role='debug' />
                <ZoomSlider />
                <ToolbarButtonStandard command='zoomIn' role='debug' />
                <ZoomLevelPopover />
                <ToolbarButtonStandard command='zoomFit' role='debug' />
                <ToolbarButtonStandard command='debugPaneToggle' role='debug' />
            </ToolbarGroup>
        </Toolbar>
    );
};
