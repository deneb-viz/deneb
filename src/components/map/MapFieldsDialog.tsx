import React from 'react';

import { useStoreProp } from '../../store';
import ModalDialog from '../modal/ModalDialog';
import MapFieldsDialogBody from './MapFieldsDialogBody';

export const MapFieldsDialog = () => {
    const editorIsMapDialogVisible: boolean = useStoreProp(
        'editorIsMapDialogVisible'
    );
    return (
        <ModalDialog type='mapping' visible={editorIsMapDialogVisible}>
            <MapFieldsDialogBody />
        </ModalDialog>
    );
};

export default MapFieldsDialog;
