import * as React from 'react';

import { useId } from '@fluentui/react-hooks';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import store from '../../store';
import { closeModalDialog } from '../../core/ui/commands';
import { TModalDialogType } from '../../core/ui/modal';
import { i18nValue } from '../../core/ui/i18n';
import {
    modalDialogContentStyles,
    modalDialogCloseIconStyles
} from '../../core/ui/modal';

interface IModalHeaderProps {
    type: TModalDialogType;
}

const cancelIcon: IIconProps = { iconName: 'Cancel' };

export const ModalHeader: React.FC<IModalHeaderProps> = (props) => {
    const { visualViewportCurrent } = store((state) => state),
        modalStyles = modalDialogContentStyles(visualViewportCurrent),
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
