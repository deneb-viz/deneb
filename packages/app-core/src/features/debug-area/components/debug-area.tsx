import { useMemo } from 'react';

import { Caption1, makeStyles, mergeClasses } from '@fluentui/react-components';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { LogViewer } from './log-viewer/log-viewer';
import { DatasetViewer } from './dataset-viewer/dataset-viewer';
import { SignalViewer } from './signal-viewer/signal-viewer';
import { DebugToolbar } from './debug-toolbar';
import { FullContainerLayoutNoOverflow } from '../../../components/ui';

const DEBUG_AREA_CLASS_NAME = 'deneb-debug-area';
const DEBUG_AREA_CONTENT_CLASS_NAME = `${DEBUG_AREA_CLASS_NAME}-content`;

const useDebugAreaStyles = makeStyles({
    content: {
        flex: '1 1 0',
        overflow: 'hidden'
    }
});

export const DebugArea = () => {
    const {
        datasetName,
        editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded,
        logAttention,
        renderId,
        translate
    } = useDenebState((state) => ({
        datasetName: state.debug.datasetName,
        editorPreviewAreaSelectedPivot: state.editorPreviewAreaSelectedPivot,
        editorPreviewDebugIsExpanded: state.editorPreviewDebugIsExpanded,
        logAttention: state.debug.logAttention,
        renderId: state.interface.renderId,
        translate: state.i18n.translate
    }));
    const classes = useDebugAreaStyles();
    const contentClasses = mergeClasses(
        DEBUG_AREA_CONTENT_CLASS_NAME,
        classes.content
    );
    const content = useMemo(() => {
        switch (editorPreviewAreaSelectedPivot) {
            case 'log':
                return <LogViewer />;
            case 'data':
                return (
                    <DatasetViewer
                        datasetName={datasetName}
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
        logAttention,
        renderId
    ]);
    logRender('DebugAreaContent');
    return (
        <FullContainerLayoutNoOverflow className={DEBUG_AREA_CLASS_NAME}>
            <DebugToolbar />
            <div className={contentClasses}>{content}</div>
        </FullContainerLayoutNoOverflow>
    );
};
