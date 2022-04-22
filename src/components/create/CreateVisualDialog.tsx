import React from 'react';

import { useStoreProp } from '../../store';
import CreateVisualDialogBody from './CreateVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';
import { reactLog } from '../../core/utils/reactLog';

export const CreateVisualDialog = () => {
    const editorIsNewDialogVisible: boolean = useStoreProp(
        'editorIsNewDialogVisible'
    );
    reactLog('Rendering [CreateVisualDialog]');
    return (
        <ModalDialog type='new' visible={editorIsNewDialogVisible}>
            <CreateVisualDialogBody />
        </ModalDialog>
    );
};

export default CreateVisualDialog;
