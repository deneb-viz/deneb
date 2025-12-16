import { useMemo } from 'react';

import { Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { LogViewer } from './log-viewer/log-viewer';
import { DatasetViewer } from './dataset-viewer/dataset-viewer';
import { SignalViewer } from './signal-viewer/signal-viewer';
import { DebugToolbar } from './debug-toolbar';

const useDebugAreaStyles = makeStyles({
    body: {
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden'
    }
});

export const DebugArea = () => {
    const {
        datasetName,
        editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded,
        hashValue,
        logAttention,
        renderId,
        translate
    } = useDenebState((state) => ({
        datasetName: state.debug.datasetName,
        editorPreviewAreaSelectedPivot: state.editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded: state.editorPreviewDebugIsExpanded,
        hashValue: state.dataset.hashValue,
        logAttention: state.debug.logAttention,
        renderId: state.interface.renderId,
        translate: state.i18n.translate
    }));
    const classes = useDebugAreaStyles();
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
                return <Caption1>{translate('Pivot_Mode_Unknown')}</Caption1>;
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
