import { getState } from '../../store';
import { TModalDialogType } from './types';

/**
 * Determine whether Deneb is currently showing a dialog, based on the store.
 */
export const isDialogOpen = () => {
    const {
        editorIsExportDialogVisible,
        editorIsNewDialogVisible,
        interface: { modalDialogRole }
    } = getState();
    return (
        editorIsNewDialogVisible ||
        editorIsExportDialogVisible ||
        modalDialogRole !== 'None'
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
    }
};
