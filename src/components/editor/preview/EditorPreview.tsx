import React from 'react';
import SplitPane from 'react-split-pane';

import store from '../../../store';

import PreviewAreaToolbar from './PreviewAreaToolbar';
import EditorPreviewContent from './EditorPreviewContent';
import {
    areaMinSize,
    getPreviewAreaHeightMaximumReact,
    resizerHorizontalStyles
} from '../../../core/ui/advancedEditor';
import { reactLog } from '../../../core/utils/logger';

const EditorPreview: React.FC = () => {
    const { editorPreviewAreaHeight, updateEditorPreviewAreaHeight } = store(
        (state) => state
    );
    const handleResize = (size: number) => updateEditorPreviewAreaHeight(size);
    reactLog('Rendering [EditorPreview]');
    return (
        <SplitPane
            split='horizontal'
            minSize={areaMinSize}
            maxSize={getPreviewAreaHeightMaximumReact()}
            size={editorPreviewAreaHeight}
            onChange={handleResize}
            allowResize={true}
            resizerStyle={resizerHorizontalStyles}
        >
            <EditorPreviewContent />
            <PreviewAreaToolbar />
        </SplitPane>
    );
};

export default EditorPreview;
