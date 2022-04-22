import React from 'react';
import { reactLog } from '../../core/utils/reactLog';

import { useStoreProp } from '../../store';
import ModalDialog from '../modal/ModalDialog';
import ExportVisualDialogBody from './ExportVisualDialogBody';

export const ExportVisualDialog = () => {
    const editorIsExportDialogVisible: boolean = useStoreProp(
        'editorIsExportDialogVisible'
    );
    reactLog('Rendering [ExportVisualDialog]');
    return (
        <ModalDialog type='export' visible={editorIsExportDialogVisible}>
            <ExportVisualDialogBody />
        </ModalDialog>
    );
};

export default ExportVisualDialog;
