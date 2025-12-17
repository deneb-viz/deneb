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
 * Available interface modes. Used to represent current state of the application.
 */
export type InterfaceType = 'viewer' | 'editor';

/**
 * Represents modal dialog display state.
 */
export type ModalDialogRole =
    | 'None'
    | 'Version'
    | 'Create'
    | 'Remap'
    | 'Export';
