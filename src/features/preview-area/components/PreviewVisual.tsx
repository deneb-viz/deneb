import React from 'react';

import store from '../../../store';

import DataProcessingRouter from '../../../components/DataProcessingRouter';
import SpecificationError from '../../../components/status/SpecificationError';
import { reactLog } from '../../../core/utils/reactLog';
import { PREVIEW_PANE_AREA_PADDING } from '../../../constants';
import { logHasErrors } from '../../debug-area';

export const PreviewVisual: React.FC = () => {
    const { editorPreviewAreaHeight, editorSpec } = store((state) => state);
    const { status } = editorSpec;
    reactLog('Rendering [PreviewVisual]', status, editorPreviewAreaHeight);
    switch (true) {
        case logHasErrors():
            return <SpecificationError />;
        default:
            return (
                <div
                    id='editorPreview'
                    style={{
                        height: editorPreviewAreaHeight,
                        padding: PREVIEW_PANE_AREA_PADDING,
                        boxSizing: 'border-box',
                        display: 'flex'
                    }}
                >
                    <DataProcessingRouter />
                </div>
            );
    }
};
