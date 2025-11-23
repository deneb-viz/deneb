import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { LogViewer } from './log-viewer';
import { DatasetViewer } from './dataset-viewer';
import { SignalViewer } from './signal-viewer';
import { useDebugStyles } from '..';
import { DebugToolbar } from '../../toolbar';
import { Caption1 } from '@fluentui/react-components';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';

// eslint-disable-next-line max-lines-per-function
export const DebugAreaContent: React.FC = () => {
    const {
        datasetName,
        editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded,
        hashValue,
        logAttention,
        renderId
    } = store(
        (state) => ({
            datasetName: state.debug.datasetName,
            editorPreviewAreaSelectedPivot:
                state.editorPreviewAreaSelectedPivot,
            editorPreviewDebugIsExpanded: state.editorPreviewDebugIsExpanded,
            hashValue: state.dataset.hashValue,
            logAttention: state.debug.logAttention,
            renderId: state.interface.renderId
        }),
        shallow
    );
    const classes = useDebugStyles();
    const content = useMemo(() => {
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
                return (
                    <Caption1>{getI18nValue('Pivot_Mode_Unknown')}</Caption1>
                );
        }
    }, [
        datasetName,
        editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded,
        hashValue,
        logAttention,
        renderId
    ]);
    logRender('DebugAreaContent');
    return (
        <div className={classes.body}>
            <DebugToolbar />
            {content}
        </div>
    );
};
