import React from 'react';
import { reactLog } from '../../core/utils/reactLog';

import { useStoreProp } from '../../store';
import ModalDialog from '../modal/ModalDialog';
import MapFieldsDialogBody from './MapFieldsDialogBody';

export const MapFieldsDialog = () => {
    const editorIsMapDialogVisible: boolean = useStoreProp(
        'editorIsMapDialogVisible'
    );
    reactLog('Rendering [MapFieldsDialog]');
    return (
        <ModalDialog type='mapping' visible={editorIsMapDialogVisible}>
            <MapFieldsDialogBody />
        </ModalDialog>
    );
};

export default MapFieldsDialog;
