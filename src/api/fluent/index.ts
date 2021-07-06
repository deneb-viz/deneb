export { dialogPropsStyles, buttonStyles, getDialogContentProps };

import { IButtonStyles } from '@fluentui/react/lib/Button';
import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import { FontWeights } from '@fluentui/react/lib/Styling';

import { theme } from '../../config/theme';

import { getHostLM } from '../i18n/public';

const buttonStyles: IButtonStyles = {
    root: {
        borderRadius: 0
    },
    label: {
        color: theme.palette.black,
        fontWeight: FontWeights.regular
    }
};

const dialogPropsStyles: IModalProps = {
    isBlocking: true,
    styles: {
        main: {
            maxWidth: 450
        }
    }
};

const getDialogContentProps = (
    titleKey: string,
    subTextKey: string
): IDialogContentProps => {
    const lm = getHostLM();
    return {
        type: DialogType.normal,
        title: lm.getDisplayName(titleKey),
        subText: lm.getDisplayName(subTextKey),
        showCloseButton: false
    };
};
