import React from 'react';

import store, { useStoreProp } from '../../../store';

import DataProcessingRouter from '../../DataProcessingRouter';
import SpecificationError from '../../status/SpecificationError';
import { previewAreaPadding } from '../../../core/ui/advancedEditor';
import { logHasErrors, reactLog } from '../../../core/utils/logger';

const EditorPreviewContent: React.FC = () => {
    const { editorPreviewAreaHeight, editorSpec } = store((state) => state);
    const { status } = editorSpec;
    reactLog(
        'Rendering [EditorPreviewContent]',
        status,
        editorPreviewAreaHeight
    );
    switch (true) {
        case logHasErrors():
            return <SpecificationError />;
        default:
            return (
                <div
                    id='editorPreview'
                    style={{
                        height: editorPreviewAreaHeight,
                        padding: previewAreaPadding,
                        boxSizing: 'border-box',
                        display: 'flex'
                    }}
                >
                    <DataProcessingRouter />
                </div>
            );
    }
};

export default EditorPreviewContent;
