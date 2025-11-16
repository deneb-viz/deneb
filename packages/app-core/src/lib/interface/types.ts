import powerbi from 'powerbi-visuals-api';

export type DebugPaneRole = 'log' | 'data' | 'signal';

/**
 * Whether the editor is in auto-apply mode or not.
 */
export type EditorApplyMode = 'Auto' | 'Manual';

/**
 * Used to specify the types of operatons we should have within the pivot
 * control in the editor pane.
 */
export type EditorPaneRole = 'Spec' | 'Config' | 'Settings';

/**
 * Available application modes. Used to represent current state of the application.
 */
export type InterfaceMode =
    | 'Initializing'
    | 'Landing'
    | 'Fetching'
    | 'NoSpec'
    | 'Editor'
    | 'EditorNoData'
    | 'View';

/**
 * Represents modal dialog display state.
 */
export type ModalDialogRole =
    | 'None'
    | 'Version'
    | 'Create'
    | 'Remap'
    | 'Export';

/**
 * In some cases (changing from canvas to advanced editor and back), we need to compare the update history to determine
 * the correct point to switch, as well as which viewport to use (as the visual host supplies the dimensions out of
 * order). This tracks the point-in-time values we need to do that.
 */
export type VisualUpdateHistoryRecord = {
    editMode: powerbi.EditMode;
    interfaceMode: InterfaceMode;
    isInFocus: boolean;
    type: powerbi.VisualUpdateType;
    viewMode: powerbi.ViewMode;
    viewport: powerbi.IViewport;
};
