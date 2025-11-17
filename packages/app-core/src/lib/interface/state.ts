import { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import { type InterfaceMode, type ModalDialogRole } from './types';

/**
 * We need to ensure that the editor's 'Create' dialog role is set/checked in a few places, so that we can ensure the
 * dialog is displayed to onboard the user when necessary. This handles the common logic for assessing whether it
 * should be displayed or the existing state continued to be used.
 */
export const getModalDialogRole = (
    settings: VisualFormattingSettingsModel,
    visualViewMode: InterfaceMode,
    currentDialogRole: ModalDialogRole
) =>
    settings?.vega?.state?.isNewDialogOpen?.value && visualViewMode === 'Editor'
        ? 'Create'
        : currentDialogRole;
