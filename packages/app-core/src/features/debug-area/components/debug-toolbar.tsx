import { useRef } from 'react';
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
     * One ref object holds the four `<TooltipCustomMount>` DOM nodes (one per
     * pivot). Mount nodes don't drive re-renders, so a single `useRef` is
     * simpler than four `useState` pairs and keeps render output stable.
     * Each `<TooltipCustomMount setRef={...}>` writes into its own slot.
     */
    const mountRefs = useRef<Record<DebugPaneRole, HTMLElement | null>>({
        source: null,
        data: null,
        signal: null,
        log: null
    });
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
                    mountNode={mountRefs.current.source}
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
                <TooltipCustomMount
                    setRef={(el) => {
                        mountRefs.current.source = el;
                    }}
                />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.data)}
                    mountNode={mountRefs.current.data}
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
                <TooltipCustomMount
                    setRef={(el) => {
                        mountRefs.current.data = el;
                    }}
                />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.signal)}
                    mountNode={mountRefs.current.signal}
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
                <TooltipCustomMount
                    setRef={(el) => {
                        mountRefs.current.signal = el;
                    }}
                />
                <Tooltip
                    relationship='label'
                    withArrow
                    content={translate(TOOLTIP_KEY_BY_PIVOT.log)}
                    mountNode={mountRefs.current.log}
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
                <TooltipCustomMount
                    setRef={(el) => {
                        mountRefs.current.log = el;
                    }}
                />
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
