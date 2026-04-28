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
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    handleDebugPaneSource,
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
                <ToolbarRadioButton
                    name='debugMode'
                    value='source'
                    appearance='subtle'
                    size='small'
                    icon={<DatabaseLinkRegular />}
                >
                    {translate('Pivot_Debug_Source')}
                </ToolbarRadioButton>
                <ToolbarRadioButton
                    name='debugMode'
                    value='data'
                    appearance='subtle'
                    size='small'
                    icon={<Table16Regular />}
                >
                    {translate('Pivot_Debug_VegaData')}
                </ToolbarRadioButton>
                <ToolbarRadioButton
                    name='debugMode'
                    value='signal'
                    appearance='subtle'
                    size='small'
                    icon={<Communication16Regular />}
                >
                    {translate('Pivot_Debug_VegaSignals')}
                </ToolbarRadioButton>
                <ToolbarRadioButton
                    name='debugMode'
                    value='log'
                    appearance='subtle'
                    size='small'
                    icon={<Notebook16Regular />}
                >
                    {translate('Pivot_Debug_VegaLogs')}
                    <LogErrorIndicator />
                </ToolbarRadioButton>
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
