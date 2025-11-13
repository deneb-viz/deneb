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
