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

import store from '../../../store';
import LogViewer from './LogViewer';
import { DatasetViewer } from './dataset-viewer';
import { SignalViewer } from './signal-viewer';
import { Paragraph } from '../../../components/elements/Typography';
import { i18nValue } from '../../../core/ui/i18n';
import { useDebugStyles } from '..';
import { logRender } from '../../logging';
import { openPreviewPivotItem } from '../../../core/ui/commands';
import { shallow } from 'zustand/shallow';
import { TPreviewPivotRole } from '../../../core/ui/advancedEditor';
import { DebugAreaToolbarButton } from './debug-area-toolbar-button';
import { ProviderDetail } from './provider-detail';
import { ZoomLevelPopover } from './zoom-level-popover';
import { ZoomSlider } from './zoom-slider';

export const DebugAreaContent: React.FC = () => {
    const {
        datasetName,
        editorPreviewAreaSelectedPivot,
        hashValue,
        logAttention,
        renderId
    } = store(
        (state) => ({
            datasetName: state.debug.datasetName,
            editorPreviewAreaSelectedPivot:
                state.editorPreviewAreaSelectedPivot,
            hashValue: state.dataset.hashValue,
            logAttention: state.debug.logAttention,
            renderId: state.interface.renderId
        }),
        shallow
    );
    const classes = useDebugStyles();
    const resolvePane = () => {
        switch (editorPreviewAreaSelectedPivot) {
            case 'log':
                return <LogViewer />;
            case 'data':
                return (
                    <DatasetViewer
                        datasetName={datasetName}
                        hashValue={hashValue}
                        logAttention={logAttention}
                        renderId={renderId}
                    />
                );
            case 'signal':
                return <SignalViewer renderId={renderId} />;
            default:
                return <Paragraph>{i18nValue('Pivot_Mode_Unknown')}</Paragraph>;
        }
    };
    const onDebugModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        openPreviewPivotItem(checkedItems[0] as TPreviewPivotRole);
    };
    logRender('DebugAreaContent');
    return (
        <div className={classes.body}>
            <Toolbar
                size='small'
                className={classes.toolbar}
                onCheckedValueChange={onDebugModeChange}
                checkedValues={{ debugMode: [editorPreviewAreaSelectedPivot] }}
            >
                <ToolbarRadioGroup>
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
                        Logs
                    </ToolbarRadioButton>
                </ToolbarRadioGroup>
                <ToolbarGroup className={classes.toolbarGroup}>
                    <ProviderDetail />
                    <DebugAreaToolbarButton command='zoomOut' />
                    <ZoomSlider />
                    <DebugAreaToolbarButton command='zoomIn' />
                    <ZoomLevelPopover />
                    <DebugAreaToolbarButton command='zoomFit' />
                    <DebugAreaToolbarButton command='debugAreaToggle' />
                </ToolbarGroup>
            </Toolbar>
            {resolvePane()}
        </div>
    );
};
