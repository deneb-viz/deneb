import { type IDataset } from '@deneb-viz/powerbi-compat/dataset';
import powerbi from 'powerbi-visuals-api';

export type DebugPaneRole = 'log' | 'data' | 'signal';

/**
 * Deneb theming variants.
 */
export type DenebTheme = 'light' | 'dark';

/**
 * Visual container dimensions
 */
export type ContainerViewport = {
    /**
     * The width of the container viewport in pixels.
     */
    width: number;
    /**
     * The height of the container viewport in pixels.
     */
    height: number;
    /**
     * The current scale factor applied to the container viewport (if known).
     */
    scale?: number;
};

/**
 * Whether the editor is in auto-apply mode or not.
 */
export type EditorApplyMode = 'Auto' | 'Manual';

/**
 * Positioning options for the editor pane within the interface.
 */
export type EditorPanePosition = 'left' | 'right';

/**
 * Used to specify the types of operations we should have within the pivot control in the editor pane.
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
 * Parameters that allow us to calculate Deneb's application mode.
 */
export type InterfaceModeResolutionParameters = {
    /**
     * The current mode (from state). Can be used as a fallback.
     */
    currentMode?: InterfaceMode;
    /**
     * Either the current data view (indicating presence of data to be processed), or the processed dataset.
     */
    dataset?: IDataset;
    /**
     * Power BI's current view mode, according to the visual host.
     */
    viewMode?: powerbi.ViewMode;
    /**
     * Power BI's current edit mode, according to the visual host.
     */
    editMode?: powerbi.EditMode;
    /**
     * If supplied, specifies the highest order of precedence when resolving application mode.
     */
    invokeMode?: InterfaceMode;
    /**
     * Whether the visual is currently in focus mode (full-screen).
     */
    isInFocus?: boolean;
    /**
     * The previous application mode from state, if needed.
     */
    prevMode?: InterfaceMode;
    /**
     * The previous visual update type from the visual host, if needed.
     */
    prevUpdateType?: powerbi.VisualUpdateType;
    /**
     * The specification from the editor, if available.
     */
    specification?: string;
    /**
     * The current visual update type from the visual host, if needed.
     */
    updateType?: powerbi.VisualUpdateType;
    /**
     * The number of visual updates received so far. Useful for determining first-run state.
     */
    visualUpdates?: number;
};

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
