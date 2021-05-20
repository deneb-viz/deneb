import * as React from 'react';
import { useSelector } from 'react-redux';

import { useId } from '@fluentui/react-hooks';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import Debugger from '../../Debugger';
import {
    modalDialogCloseIconStyles,
    modalDialogContentStyles
} from '../../config/styles';
import { state } from '../../store';
import { commandService } from '../../services';
import { IModalHeaderProps } from '../../types';

const cancelIcon: IIconProps = { iconName: 'Cancel' };

export const ModalHeader = (props: IModalHeaderProps) => {
    Debugger.log('Rendering Component: [ModalHeader]...');
    const root = useSelector(state),
        { i18n, viewport } = root.visual,
        modalStyles = modalDialogContentStyles(viewport),
        handleClose = () => {
            commandService.closeModalDialog(props.type);
        },
        resolveTitle = () => {
            switch (props.type) {
                case 'new':
                    return 'New_Spec_Heading';
                case 'export':
                    return 'Export_Spec_Heading';
            }
        };
    const titleId = useId('modal-dialog-heading');

    return (
        <div className={modalStyles.header}>
            <span id={titleId}>{i18n.getDisplayName(resolveTitle())}</span>
            <IconButton
                styles={modalDialogCloseIconStyles}
                iconProps={cancelIcon}
                ariaLabel={i18n.getDisplayName('Modal_Close')}
                onClick={handleClose}
            />
        </div>
    );
};

export default ModalHeader;
