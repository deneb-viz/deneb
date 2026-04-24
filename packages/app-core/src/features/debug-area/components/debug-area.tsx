import { useMemo } from 'react';

import { Caption1, makeStyles, mergeClasses } from '@fluentui/react-components';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { LogViewer } from './log-viewer/log-viewer';
import { DataTab } from './dataset-viewer/data-tab';
import { SourceTab } from './dataset-viewer/source-tab';
import { SignalViewer } from './signal-viewer/signal-viewer';
import { DebugToolbar } from './debug-toolbar';
import { FullContainerLayoutNoOverflow } from '../../../components/ui';
import { DatasetSelectInitializer } from './dataset-viewer/dataset-select';
import { resolveInnerTabContent } from './debug-area-inner-tab-switcher-utils';

const DEBUG_AREA_CLASS_NAME = 'deneb-debug-area';
const DEBUG_AREA_CONTENT_CLASS_NAME = `${DEBUG_AREA_CLASS_NAME}-content`;

const useDebugAreaStyles = makeStyles({
    content: {
        flex: '1 1 0',
        overflow: 'hidden'
    }
});

/**
 * Switches between the Source and Data inner tabs of the `data` outer
 * pivot. Reads the current inner-tab selection from `state.debug.dataPivot`.
 *
 * `DataTab` no longer accepts a `logAttention` prop — Unit 6 decoupled the
 * Data tab from the attention flag. Compile-recovery listener rebinds now
 * piggy-back on `renderId` bumps from `compilation.ts`.
 */
const InnerDataArea = ({
    datasetName,
    renderId
}: {
    datasetName: string;
    renderId: string;
}) => {
    const dataPivot = useDenebState((state) => state.debug.dataPivot);
    const contentKey = resolveInnerTabContent(dataPivot);
    switch (contentKey) {
        case 'source':
            return <SourceTab />;
        case 'data':
            return <DataTab datasetName={datasetName} renderId={renderId} />;
    }
};

export const DebugArea = () => {
    const {
        datasetName,
        editorPreviewAreaSelectedPivot,
        isDebugPaneMinimized,
        renderId,
        translate
    } = useDenebState((state) => ({
        datasetName: state.debug.datasetName,
        editorPreviewAreaSelectedPivot: state.editorPreviewAreaSelectedPivot,
        isDebugPaneMinimized: state.editor.isDebugPaneMinimized,
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
                    <InnerDataArea
                        datasetName={datasetName}
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
        isDebugPaneMinimized,
        renderId
    ]);
    logRender('DebugAreaContent');
    return (
        <FullContainerLayoutNoOverflow className={DEBUG_AREA_CLASS_NAME}>
            <DatasetSelectInitializer />
            <DebugToolbar />
            <div className={contentClasses}>{content}</div>
        </FullContainerLayoutNoOverflow>
    );
};
