import React from 'react';

import { useStoreProp } from '../../store';
import CreateVisualDialogBody from './CreateVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';

export const CreateVisualDialog = () => {
    const editorIsNewDialogVisible: boolean = useStoreProp(
        'editorIsNewDialogVisible'
    );
    return (
        <ModalDialog type='new' visible={editorIsNewDialogVisible}>
            <CreateVisualDialogBody />
        </ModalDialog>
    );
};

export default CreateVisualDialog;
