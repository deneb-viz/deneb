import React from 'react';
import SplitPane from 'react-split-pane';

import store, { useStoreProp } from '../../../store';

import { PreviewVisual } from './PreviewVisual';
import {
    calculatePreviewMaximumHeight,
    resizerHorizontalStyles
} from '../../../core/ui/advancedEditor';
import { reactLog } from '../../../core/utils/reactLog';
import { PREVIEW_PANE_AREA_MIN_SIZE } from '../../../constants';
import { DebugAreaContent } from '../../debug-area';

const getMaxSize = () =>
    calculatePreviewMaximumHeight(
        useStoreProp<number>('height', 'visualViewportCurrent')
    );

export const PreviewArea: React.FC = () => {
    const { editorPreviewAreaHeight, updateEditorPreviewAreaHeight } = store(
        (state) => state
    );
    const handleResize = (size: number) => updateEditorPreviewAreaHeight(size);
    reactLog('Rendering [PreviewArea]');
    return (
        <SplitPane
            split='horizontal'
            minSize={PREVIEW_PANE_AREA_MIN_SIZE}
            maxSize={getMaxSize()}
            size={editorPreviewAreaHeight}
            onChange={handleResize}
            allowResize={true}
            resizerStyle={resizerHorizontalStyles}
        >
            <PreviewVisual />
            <DebugAreaContent />
        </SplitPane>
    );
};
