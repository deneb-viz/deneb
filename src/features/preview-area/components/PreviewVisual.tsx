import React from 'react';
import store from '../../../store';
import { shallow } from 'zustand/shallow';

import DataProcessingRouter from '../../../components/DataProcessingRouter';
import { PREVIEW_PANE_AREA_PADDING } from '../../../constants';
import { logRender } from '../../logging';

export const PreviewVisual: React.FC = () => {
    const { editorPreviewAreaHeight, status } = store(
        (state) => ({
            editorPreviewAreaHeight: state.editorPreviewAreaHeight,
            status: state.specification.status
        }),
        shallow
    );
    logRender('PreviewVisual', status, editorPreviewAreaHeight);
    switch (true) {
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
