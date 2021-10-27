import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import React from 'react';
import { select } from 'd3-selection';

const viewportAdjust = 4;

const calculateZoomLevelPercent = (zoomLevel: number) => zoomLevel / 100;

export const clearCatcherSelector = (prefix = false) =>
    `${(prefix && '#') || ''}clearCatcher`;

/**
 * Because we want the Vega View to be constrained to our visual container, this can sometimes
 * run short (e.g. if using step sizing). In these cases, the remaining whitespace between the
 * view container and the svg/canvas element is technically non-interactive, so we append a div
 * with a lower z-index to trap these events, and wrap the existing view in another. We also do
 * some explicit positioning of the view elements to accommodate this in visual.less
 */
export const resolveClearCatcher = () => {
    const cssClass = '.deneb-overload',
        embed = select('.vega-embed'),
        oldView = embed.selectChildren(`*:not(${cssClass})`);
    embed.selectChildren(cssClass).remove();
    embed
        .append('div')
        .attr('id', clearCatcherSelector())
        .classed(cssClass, true);
    const newView = embed
        .append('div')
        .attr('id', 'vegaView')
        .classed(cssClass, true);
    oldView.each(function () {
        newView.append(() => this);
    });
};

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

export const getViewModeViewportStyles = (
    viewport: IViewport,
    isEditor: boolean,
    zoomLevel: number,
    showViewportMarker: boolean
): React.CSSProperties => {
    const resolved = `calc(100% - ${viewportAdjust}px)`,
        scale = calculateZoomLevelPercent(zoomLevel);
    return {
        height: isEditor ? viewport.height : resolved,
        width: isEditor ? viewport.width : resolved,
        transform: `scale(${scale})`,
        transformOrigin: '0% 0% 0px',
        border: showViewportMarker ? '2px dashed #b3b3b3' : null
    };
};
