import powerbi from 'powerbi-visuals-api';

/**
 * Test that the supplied parameters mean that the visual host has the visual in a suitable state to display the editor
 * interface.
 */
export const isAdvancedEditor = (
    viewMode: powerbi.ViewMode | undefined,
    editMode: powerbi.EditMode | undefined,
    isInFocus: boolean
) => (editMode === powerbi.EditMode.Advanced && isInFocus) || false;

/**
 * Checks if a visual update type is data-related.
 */
export const isVisualUpdateTypeData = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Data ===
          (type & powerbi.VisualUpdateType.Data)
        : false;

/**
 * Checks if a visual update type is a resize event.
 */
export const isVisualUpdateTypeResize = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.Resize ===
          (type & powerbi.VisualUpdateType.Resize)
        : false;

/**
 * Checks if a visual has finished resizing.
 */
export const isVisualUpdateTypeResizeEnd = (
    type: powerbi.VisualUpdateType | undefined
) =>
    type !== undefined
        ? powerbi.VisualUpdateType.ResizeEnd ===
          (type & powerbi.VisualUpdateType.ResizeEnd)
        : false;

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
) => isVisualUpdateTypeData(options.type);
