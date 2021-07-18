import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import React from 'react';

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

export const getViewModeViewportStyles = (
    viewport: IViewport,
    isEditor: boolean
): React.CSSProperties => {
    const adjust = 4,
        resolved = `calc(100% - ${adjust}px)`;
    return {
        height: isEditor ? viewport.height : resolved,
        width: isEditor ? viewport.width : resolved
    };
};

export const getViewportIndicatorStyles = (
    viewport: IViewport,
    enabled: boolean,
    isEditor: boolean
): React.CSSProperties => {
    return {
        ...getViewModeViewportStyles(viewport, isEditor),
        ...{
            visibility: enabled ? 'visible' : 'hidden'
        }
    };
};
