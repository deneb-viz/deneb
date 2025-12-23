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
    Notebook16Regular,
    Table16Regular
} from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import {
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    type DebugPaneRole
} from '../../../lib';
import { LogErrorIndicator } from './log-viewer/log-error-indicator';
import { ToolbarButtonStandard } from '../../../components/ui';
import { ZoomSlider } from './zoom-controls/zoom-slider';
import { ZoomLevelPopover } from './zoom-controls/zoom-level-popover';

const useToolbarStyles = makeStyles({
    root: {
        display: 'flex',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px`,
        justifyContent: 'space-between',
        paddingBottom: tokens.spacingVerticalNone,
        paddingTop: tokens.spacingVerticalNone,
        borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
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
    return (
        <Toolbar
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
                <ToolbarButtonStandard command='debugPaneToggle' role='debug' />
            </ToolbarGroup>
        </Toolbar>
    );
};
