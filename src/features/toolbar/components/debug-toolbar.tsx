import React from 'react';
import {
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
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { TPreviewPivotRole } from '../../../core/ui/advancedEditor';
import { LogErrorIndicator } from './log-error-indicator';
import { useToolbarStyles } from '.';
import { ToolbarButtonStandard } from './toolbar-button-standard';
import { ZoomLevelPopover } from './zoom-level-popover';
import { ZoomSlider } from './zoom-slider';
import {
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal
} from '../../commands';

export const DebugToolbar: React.FC = () => {
    const { editorPreviewAreaSelectedPivot } = store(
        (state) => ({
            editorPreviewAreaSelectedPivot: state.editorPreviewAreaSelectedPivot
        }),
        shallow
    );
    const classes = useToolbarStyles();
    const onDebugModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as TPreviewPivotRole;
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
            className={classes.toolbarDebug}
            onCheckedValueChange={onDebugModeChange}
            checkedValues={{ debugMode: [editorPreviewAreaSelectedPivot] }}
        >
            <ToolbarRadioGroup className={classes.toolbarGroupDebug}>
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
            <ToolbarGroup className={classes.toolbarGroupDebug}>
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
