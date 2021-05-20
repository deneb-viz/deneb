import * as React from 'react';
import { useSelector } from 'react-redux';

import { useId } from '@fluentui/react-hooks';
import { Modal } from '@fluentui/react/lib/Modal';

import Debugger from '../../Debugger';
import { modalDialogContentStyles } from '../../config/styles';
import { state } from '../../store';
import ModalHeader from '../modal/ModalHeader';
import { commandService } from '../../services';
import { IModalDialogProps } from '../../types';

export const ModalDialog: React.FunctionComponent<IModalDialogProps> = (
    props: React.PropsWithChildren<IModalDialogProps>
) => {
    Debugger.log('Rendering Component: [ModalDialog]...');
    const root = useSelector(state),
        { viewport } = root.visual,
        modalStyles = modalDialogContentStyles(viewport),
        handleClose = () => {
            commandService.closeModalDialog(props.type);
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
