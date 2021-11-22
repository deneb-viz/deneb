import * as React from 'react';

import store from '../../store';
import NewVisualDialogBody from './NewVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';

export const NewVisualDialog = () => {
    const { editorIsNewDialogVisible } = store((state) => state);
    return (
        <ModalDialog type='new' visible={editorIsNewDialogVisible}>
            <NewVisualDialogBody />
        </ModalDialog>
    );
};

export default NewVisualDialog;
