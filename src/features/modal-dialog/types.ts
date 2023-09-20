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
 * Modal dialog type (used for specific ops handling).
 */
export type TModalDialogType = 'new' | 'export' | 'mapping';
