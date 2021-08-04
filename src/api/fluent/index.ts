export { dialogPropsStyles, buttonStyles, getDialogContentProps, theme };

import { IButtonStyles } from '@fluentui/react/lib/Button';
import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import { FontWeights } from '@fluentui/react/lib/Styling';
import { IPartialTheme } from '@fluentui/react/lib/Theme';

import { i18nValue } from '../../core/ui/i18n';
import { getConfig } from '../../core/utils/config';

const theme = <IPartialTheme>getConfig()?.fluentUiTheme || {};

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
    return {
        type: DialogType.normal,
        title: i18nValue(titleKey),
        subText: i18nValue(subTextKey),
        showCloseButton: false
    };
};
