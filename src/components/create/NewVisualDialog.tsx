import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';
import NewVisualDialogBody from './NewVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';

export const NewVisualDialog = () => {
    const root = useSelector(state),
        { isNewDialogVisible } = root.visual;
    return (
        <ModalDialog type='new' visible={isNewDialogVisible}>
            <NewVisualDialogBody />
        </ModalDialog>
    );
};

export default NewVisualDialog;
