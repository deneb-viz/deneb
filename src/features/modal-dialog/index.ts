import { InterfaceMode } from '../interface';
import { VisualSettings } from '../settings';
import { ModalDialogRole } from './types';

export { useModalDialogStyles } from './components';
export { ModalDialog } from './components/modal-dialog';
export { TModalDialogType } from './types';
export { isDialogOpen } from './utils';

/**
 * We need to ensure that the editor's 'Create' dialog role is set/checked in a
 * few places, so that we can ensure the dialog is displayed to onboard the
 * user when necessary. This handles the common logic for assessing whether it
 * should be displayed or the exsiting state continued to be used.
 */
export const getOnboardingDialog = (
    settings: VisualSettings,
    visualViewMode: InterfaceMode,
    currentDialogRole: ModalDialogRole
) =>
    settings?.vega?.isNewDialogOpen && visualViewMode === 'Editor'
        ? 'Create'
        : currentDialogRole;
