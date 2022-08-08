import { getState } from '../../store';
import { TModalDialogType } from './types';

/**
 * Determine whether Deneb is currently showing a dialog, based on the store.
 */
export const isDialogOpen = () => {
    const {
        editorIsExportDialogVisible,
        editorIsMapDialogVisible,
        editorIsNewDialogVisible
    } = getState();
    return (
        editorIsNewDialogVisible ||
        editorIsMapDialogVisible ||
        editorIsExportDialogVisible
    );
};

/**
 * Route the appropriate dialog title i18n key, based on type.
 */
export const resolveDialogTitle = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return 'New_Spec_Heading';
        case 'export':
            return 'Export_Spec_Heading';
        case 'mapping':
            return 'Map_Fields_Heading';
    }
};
