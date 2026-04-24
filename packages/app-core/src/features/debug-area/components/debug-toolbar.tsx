import {
    makeStyles,
    tokens,
    Toolbar,
    ToolbarGroup,
    ToolbarProps,
    ToolbarRadioButton,
    ToolbarRadioGroup
} from '@fluentui/react-components';
import {
    Communication16Regular,
    DatabaseLinkRegular,
    Notebook16Regular,
    Table16Regular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import {
    handleDataInnerData,
    handleDataInnerSource,
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    type DebugPaneRole
} from '../../../lib';
import type { DataPivotTab } from '../../../state/debug';
import { LogErrorIndicator } from './log-viewer/log-error-indicator';
import { ToolbarButtonStandard } from '../../../components/ui';
import { ZoomSlider } from './zoom-controls/zoom-slider';
import { ZoomLevelPopover } from './zoom-controls/zoom-level-popover';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { shouldRenderInnerToolbar } from './debug-area-inner-tab-switcher-utils';

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
    const { editorPreviewAreaSelectedPivot, dataPivot, translate } =
        useDenebState((state) => ({
            editorPreviewAreaSelectedPivot:
                state.editorPreviewAreaSelectedPivot,
            dataPivot: state.debug.dataPivot,
            translate: state.i18n.translate
        }));
    const classes = useToolbarStyles();
    const onDebugModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as DebugPaneRole;
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
    const onDataPivotChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const next = checkedItems[0] as DataPivotTab;
        switch (next) {
            case 'source':
                handleDataInnerSource();
                break;
            case 'data':
                handleDataInnerData();
                break;
        }
    };
    const showInnerToolbar = shouldRenderInnerToolbar(
        editorPreviewAreaSelectedPivot
    );
    return (
        <>
            <Toolbar
                aria-label='Debug view'
                size='small'
                className={classes.root}
                onCheckedValueChange={onDebugModeChange}
                checkedValues={{ debugMode: [editorPreviewAreaSelectedPivot] }}
            >
                <ToolbarRadioGroup className={classes.group}>
                    <ToolbarRadioButton
                        name='debugMode'
                        value='data'
                        appearance='subtle'
                        size='small'
                        icon={<Table16Regular />}
                    >
                        Data
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='debugMode'
                        value='signal'
                        appearance='subtle'
                        size='small'
                        icon={<Communication16Regular />}
                    >
                        Signals
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='debugMode'
                        value='log'
                        appearance='subtle'
                        size='small'
                        icon={<Notebook16Regular />}
                    >
                        Logs &nbsp;
                        <LogErrorIndicator />
                    </ToolbarRadioButton>
                </ToolbarRadioGroup>
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
            {showInnerToolbar && (
                <Toolbar
                    aria-label='Data source view'
                    size='small'
                    className={classes.root}
                    onCheckedValueChange={onDataPivotChange}
                    checkedValues={{ dataPivot: [dataPivot] }}
                >
                    <ToolbarRadioGroup className={classes.group}>
                        <ToolbarRadioButton
                            name='dataPivot'
                            value='source'
                            appearance='subtle'
                            size='small'
                            icon={<DatabaseLinkRegular />}
                        >
                            {translate('Pivot_Data_Source')}
                        </ToolbarRadioButton>
                        <ToolbarRadioButton
                            name='dataPivot'
                            value='data'
                            appearance='subtle'
                            size='small'
                            icon={<Table16Regular />}
                        >
                            {translate('Pivot_Data_Data')}
                        </ToolbarRadioButton>
                    </ToolbarRadioGroup>
                </Toolbar>
            )}
        </>
    );
};
