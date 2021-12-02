import * as React from 'react';

import store from '../../store';
import ModalDialog from '../modal/ModalDialog';
import MapFieldsDialogBody from './MapFieldsDialogBody';

export const MapFieldsDialog = () => {
    const { editorIsMapDialogVisible } = store((state) => state);
    return (
        <ModalDialog type='mapping' visible={editorIsMapDialogVisible}>
            <MapFieldsDialogBody />
        </ModalDialog>
    );
};

export default MapFieldsDialog;
