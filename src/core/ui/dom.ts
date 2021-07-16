import React from 'react';

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

export const getRenderedVisualCanvasStyle = (): React.CSSProperties => {
    return {
        height: 'calc(100% - 4px)',
        width: 'calc(100% - 4px)'
    };
};
