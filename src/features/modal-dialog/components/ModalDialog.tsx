import React from 'react';

import { useId } from '@fluentui/react-hooks';
import { Modal } from '@fluentui/react/lib/Modal';

import { useStoreProp } from '../../../store';
import { ModalHeader } from './ModalHeader';
import { closeModalDialog } from '../../../core/ui/commands';
import { TModalDialogType } from '../types';
import { getModalDialogContentStyles } from '../styles';
import { reactLog } from '../../../core/utils/reactLog';
import { CreateVisualDialogBody, ExportVisualDialogBody } from '../../template';
import MapFieldsDialogBody from '../../../components/map/MapFieldsDialogBody';

interface IModalDialogProps {
    type: TModalDialogType;
}

/**
 * Route the appropriate dialog body component, based on type.
 */
const getDialogBody = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return <CreateVisualDialogBody />;
        case 'export':
            return <ExportVisualDialogBody />;
        case 'mapping':
            return <MapFieldsDialogBody />;
    }
};

/**
 * Derive dialog visibility, based on the store state for its type.
 */
const getDialogVisibility = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return useStoreProp<boolean>('editorIsNewDialogVisible');
        case 'export':
            return useStoreProp<boolean>('editorIsExportDialogVisible');
        case 'mapping':
            return useStoreProp<boolean>('editorIsMapDialogVisible');
    }
};

export const ModalDialog: React.FC<IModalDialogProps> = ({ type }) => {
    const height = useStoreProp<number>('height', 'visualViewportCurrent');
    const width = useStoreProp<number>('width', 'visualViewportCurrent');
    const modalStyles = getModalDialogContentStyles({ height, width });
    const handleClose = () => {
        closeModalDialog(type);
    };
    const titleId = useId('modal-dialog');
    const child = getDialogBody(type);
    const visible = getDialogVisibility(type);
    reactLog('Rendering [ModalDialog]');
    return (
        <Modal
            titleAriaId={titleId}
            isOpen={visible}
            onDismiss={handleClose}
            isBlocking={false}
            containerClassName={modalStyles.container}
            dragOptions={undefined}
        >
            <ModalHeader type={type} />
            <div className={modalStyles.body}>{child}</div>
        </Modal>
    );
};
