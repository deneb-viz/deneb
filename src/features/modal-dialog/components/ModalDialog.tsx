import React from 'react';

import { useId } from '@fluentui/react-hooks';
import { Modal } from '@fluentui/react/lib/Modal';

import store from '../../../store';
import { ModalHeader } from './ModalHeader';
import { closeModalDialog } from '../../../core/ui/commands';
import { TModalDialogType } from '../types';
import { getModalDialogContentStyles } from '../styles';
import { CreateVisualDialogBody } from '../../visual-create';
import { ExportVisualDialogBody } from '../../visual-export';
import { MapFieldsDialogBody } from '../../remap-fields';
import { shallow } from 'zustand/shallow';
import { logRender } from '../../logging';

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
    const {
        editorIsNewDialogVisible,
        editorIsExportDialogVisible,
        editorIsMapDialogVisible
    } = store(
        (state) => ({
            editorIsNewDialogVisible: state.editorIsNewDialogVisible,
            editorIsExportDialogVisible: state.editorIsExportDialogVisible,
            editorIsMapDialogVisible: state.editorIsMapDialogVisible
        }),
        shallow
    );
    switch (type) {
        case 'new':
            return editorIsNewDialogVisible;
        case 'export':
            return editorIsExportDialogVisible;
        case 'mapping':
            return editorIsMapDialogVisible;
    }
};

export const ModalDialog: React.FC<IModalDialogProps> = ({ type }) => {
    const {
        visualViewportCurrent: { height, width }
    } = store(
        (state) => ({
            visualViewportCurrent: state.visualViewportCurrent
        }),
        shallow
    );
    const modalStyles = getModalDialogContentStyles({ height, width });
    const handleClose = () => {
        closeModalDialog(type);
    };
    const titleId = useId('modal-dialog');
    const child = getDialogBody(type);
    const visible = getDialogVisibility(type);
    logRender('ModalDialog');
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
