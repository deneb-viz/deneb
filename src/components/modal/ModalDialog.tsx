import * as React from 'react';
import { useSelector } from 'react-redux';

import { useId } from '@fluentui/react-hooks';
import { Modal } from '@fluentui/react/lib/Modal';

import { state } from '../../store';
import ModalHeader from '../modal/ModalHeader';
import { closeModalDialog } from '../../api/commands';
import { TModalDialogType } from '../../api/ui';
import { modalDialogContentStyles } from '../../core/ui/modal';

interface IModalDialogProps {
    type: TModalDialogType;
    visible: boolean;
}

const ModalDialog: React.FC<IModalDialogProps> = (props) => {
    const root = useSelector(state),
        { viewport } = root.visual,
        modalStyles = modalDialogContentStyles(viewport),
        handleClose = () => {
            closeModalDialog(props.type);
        };
    const titleId = useId('modal-dialog');

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
