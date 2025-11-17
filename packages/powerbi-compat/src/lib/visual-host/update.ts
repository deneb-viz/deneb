import powerbi from 'powerbi-visuals-api';

/**
 * Checks if a visual update type is a resize event.
 */
export const isVisualUpdateTypeResize = (type: powerbi.VisualUpdateType) =>
    powerbi.VisualUpdateType.Resize ===
    (type & powerbi.VisualUpdateType.Resize);

/**
 * Checks if a visual has finished resizing.
 */
export const isVisualUpdateTypeResizeEnd = (type: powerbi.VisualUpdateType) =>
    powerbi.VisualUpdateType.ResizeEnd ===
    (type & powerbi.VisualUpdateType.ResizeEnd);

/**
 * Checks if a visual update type is view mode change.
 */
export const isVisualUpdateTypeViewMode = (type: powerbi.VisualUpdateType) =>
    powerbi.VisualUpdateType.ViewMode ===
    (type & powerbi.VisualUpdateType.ViewMode);

/**
 * Check the visual update type to see if it is volatile.
 */
export const isVisualUpdateTypeVolatile = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) =>
    powerbi.VisualUpdateType.Data ===
    (options.type & powerbi.VisualUpdateType.Data);
