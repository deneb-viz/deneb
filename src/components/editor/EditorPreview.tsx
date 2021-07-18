import React from 'react';

import { useSelector } from 'react-redux';

import { state } from '../../store';

import { getViewportIndicatorStyles } from '../../core/ui/dom';

import DataProcessingRouter from '../DataProcessingRouter';

const EditorPreview: React.FC = () => {
    const { viewModeViewport, settings, visualMode } = useSelector(state).visual,
        { showViewportMarker } = settings.editor;
    return (
        <>
            <div id='editorPreview'>
                <div
                    id='editorVisualViewportIndicator'
                    style={getViewportIndicatorStyles(
                        viewModeViewport,
                        showViewportMarker,
                        visualMode === 'Editor'
                    )}
                />
                <DataProcessingRouter />
            </div>
        </>
    );
};

export default EditorPreview;
