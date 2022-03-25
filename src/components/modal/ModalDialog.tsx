import React from 'react';

import { useId } from '@fluentui/react-hooks';
import { Modal } from '@fluentui/react/lib/Modal';

import { useStoreProp } from '../../store';
import ModalHeader from '../modal/ModalHeader';
import { closeModalDialog } from '../../core/ui/commands';
import { TModalDialogType } from '../../core/ui/modal';
import { modalDialogContentStyles } from '../../core/ui/modal';

interface IModalDialogProps {
    type: TModalDialogType;
    visible: boolean;
}

const ModalDialog: React.FC<IModalDialogProps> = (props) => {
    const height = useStoreProp<number>('height', 'visualViewportCurrent');
    const width = useStoreProp<number>('width', 'visualViewportCurrent');
    const modalStyles = modalDialogContentStyles({ height, width });
    const handleClose = () => {
        closeModalDialog(props.type);
    };
    const titleId = useId('modal-dialog');
    console.log('Rendering [ModalDialog]');
    return (
        <Modal
            titleAriaId={titleId}
            isOpen={props.visible}
            onDismiss={handleClose}
            isBlocking={false}
            containerClassName={modalStyles.container}
            dragOptions={undefined}
        >
            <ModalHeader type={props.type} />
            <div className={modalStyles.body}>{props.children}</div>
        </Modal>
    );
};

export default ModalDialog;
