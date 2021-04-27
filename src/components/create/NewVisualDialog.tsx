import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../../Debugger';
import { state } from '../../store';
import NewVisualDialogBody from './NewVisualDialogBody';
import ModalDialog from '../modal/ModalDialog';

export const NewVisualDialog = () => {
    Debugger.log('Rendering Component: [NewVisualDialog]...');
    const root = useSelector(state),
        { isNewDialogVisible } = root.visual;
    return (
        <ModalDialog type='new' visible={isNewDialogVisible}>
            <NewVisualDialogBody />
        </ModalDialog>
    );
};

export default NewVisualDialog;
