import React, { useMemo } from 'react';
import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { PreviewVisual } from './PreviewVisual';
import {
    calculatePreviewMaximumHeight,
    resizerHorizontalStyles
} from '../../../core/ui/advancedEditor';
import { PREVIEW_PANE_AREA_MIN_SIZE } from '../../../constants';
import { DebugAreaContent } from '../../debug-area';
import { logRender } from '../../logging';

export const PreviewArea: React.FC = () => {
    const {
        editorPreviewAreaHeight,
        visualViewportCurrent: { height },
        updateEditorPreviewAreaHeight
    } = store(
        (state) => ({
            editorPreviewAreaHeight: state.editorPreviewAreaHeight,
            visualViewportCurrent: state.visualViewportCurrent,
            updateEditorPreviewAreaHeight: state.updateEditorPreviewAreaHeight
        }),
        shallow
    );
    const maxSize = useMemo(
        () => calculatePreviewMaximumHeight(height),
        [height]
    );
    const handleResize = (size: number) => updateEditorPreviewAreaHeight(size);
    logRender('PreviewArea');
    return (
        <SplitPane
            split='horizontal'
            minSize={PREVIEW_PANE_AREA_MIN_SIZE}
            maxSize={maxSize}
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
