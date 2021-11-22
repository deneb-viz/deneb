import * as React from 'react';

import Debugger from '../../Debugger';
import store from '../../store';
import ModalDialog from '../modal/ModalDialog';
import ExportVisualDialogBody from './ExportVisualDialogBody';

export const ExportVisualDialog = () => {
    Debugger.log('Rendering Component: [ExportVisualDialog]...');
    const { editorIsExportDialogVisible } = store((state) => state);
    return (
        <ModalDialog type='export' visible={editorIsExportDialogVisible}>
            <ExportVisualDialogBody />
        </ModalDialog>
    );
};

export default ExportVisualDialog;
