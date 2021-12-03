import * as React from 'react';

import store from '../../store';
import CreateVisualDialogBody from './CreateVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';

export const CreateVisualDialog = () => {
    const { editorIsNewDialogVisible } = store((state) => state);
    return (
        <ModalDialog type='new' visible={editorIsNewDialogVisible}>
            <CreateVisualDialogBody />
        </ModalDialog>
    );
};

export default CreateVisualDialog;
