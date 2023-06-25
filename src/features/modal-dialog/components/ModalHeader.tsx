import React from 'react';

import { useId } from '@fluentui/react-hooks';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import store from '../../../store';
import { closeModalDialog } from '../../../core/ui/commands';
import { TModalDialogType } from '../types';
import {
    MODAL_DIALOG_CLOSE_ICON_STYLES,
    getModalDialogContentStyles
} from '../styles';
import { resolveDialogTitle } from '../utils';
import { getI18nValue } from '../../i18n';

interface IModalHeaderProps {
    type: TModalDialogType;
}

const CANCEL_ICON: IIconProps = { iconName: 'Cancel' };

export const ModalHeader: React.FC<IModalHeaderProps> = ({ type }) => {
    const { visualViewportCurrent } = store((state) => state);
    const modalStyles = getModalDialogContentStyles(visualViewportCurrent);
    const handleClose = () => {
        closeModalDialog(type);
    };
    const titleId = useId('modal-dialog-heading');

    return (
        <div className={modalStyles.header}>
            <span id={titleId}>{getI18nValue(resolveDialogTitle(type))}</span>
            <IconButton
                styles={MODAL_DIALOG_CLOSE_ICON_STYLES}
                iconProps={CANCEL_ICON}
                ariaLabel={getI18nValue('Modal_Close')}
                onClick={handleClose}
            />
        </div>
    );
};
