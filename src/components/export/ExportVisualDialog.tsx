import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../../Debugger';
import { state } from '../../store';
import ModalDialog from '../modal/ModalDialog';
import ExportVisualDialogBody from './ExportVisualDialogBody';

export const ExportVisualDialog = () => {
    Debugger.log('Rendering Component: [ExportVisualDialog]...');
    const root = useSelector(state),
        { isExportDialogVisible } = root.visual;
    return (
        <ModalDialog type='export' visible={isExportDialogVisible}>
            <ExportVisualDialogBody />
        </ModalDialog>
    );
};

export default ExportVisualDialog;
