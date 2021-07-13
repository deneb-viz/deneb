import * as React from 'react';
import { useSelector } from 'react-redux';

import { useId } from '@fluentui/react-hooks';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import {
    modalDialogCloseIconStyles,
    modalDialogContentStyles
} from '../../config/styles';
import { state } from '../../store';
import { closeModalDialog } from '../../api/commands';
import { TModalDialogType } from '../../api/ui';
import { i18nValue } from '../../core/ui/i18n';

interface IModalHeaderProps {
    type: TModalDialogType;
}

const cancelIcon: IIconProps = { iconName: 'Cancel' };

export const ModalHeader: React.FC<IModalHeaderProps> = (props) => {
    const root = useSelector(state),
        { viewport } = root.visual,
        modalStyles = modalDialogContentStyles(viewport),
        handleClose = () => {
            closeModalDialog(props.type);
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
            <span id={titleId}>{i18nValue(resolveTitle())}</span>
            <IconButton
                styles={modalDialogCloseIconStyles}
                iconProps={cancelIcon}
                ariaLabel={i18nValue('Modal_Close')}
                onClick={handleClose}
            />
        </div>
    );
};

export default ModalHeader;
