import React from 'react';

import { useId } from '@fluentui/react-hooks';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import store from '../../../store';
import { closeModalDialog } from '../../../core/ui/commands';
import { TModalDialogType } from '../types';
import { i18nValue } from '../../../core/ui/i18n';
import {
    MODAL_DIALOG_CLOSE_ICON_STYLES,
    getModalDialogContentStyles
} from '../styles';

interface IModalHeaderProps {
    type: TModalDialogType;
}

const CANCEL_ICON: IIconProps = { iconName: 'Cancel' };

/**
 * Route the appropriate dialog title i18n key, based on type.
 */
const resolveTitle = (type: TModalDialogType) => {
    switch (type) {
        case 'new':
            return 'New_Spec_Heading';
        case 'export':
            return 'Export_Spec_Heading';
        case 'mapping':
            return 'Map_Fields_Heading';
    }
};

export const ModalHeader: React.FC<IModalHeaderProps> = ({ type }) => {
    const { visualViewportCurrent } = store((state) => state);
    const modalStyles = getModalDialogContentStyles(visualViewportCurrent);
    const handleClose = () => {
        closeModalDialog(type);
    };
    const titleId = useId('modal-dialog-heading');

    return (
        <div className={modalStyles.header}>
            <span id={titleId}>{i18nValue(resolveTitle(type))}</span>
            <IconButton
                styles={MODAL_DIALOG_CLOSE_ICON_STYLES}
                iconProps={CANCEL_ICON}
                ariaLabel={i18nValue('Modal_Close')}
                onClick={handleClose}
            />
        </div>
    );
};
