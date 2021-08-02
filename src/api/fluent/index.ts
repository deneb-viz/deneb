export {
    dialogPropsStyles,
    buttonStyles,
    getDialogContentProps,
    initializeIcons,
    theme
};

import { IButtonStyles } from '@fluentui/react/lib/Button';
import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import {
    FontWeights,
    IIconOptions,
    IIconSubset,
    registerIcons
} from '@fluentui/react/lib/Styling';
import { IPartialTheme } from '@fluentui/react/lib/Theme';
import { i18nValue } from '../../core/ui/i18n';

import { getConfig } from '../../core/utils/config';

const theme = <IPartialTheme>getConfig()?.fluentUiTheme || {};

const initializeIcons = (
    baseUrl: string = '',
    options?: IIconOptions
): void => {
    const subset: IIconSubset = {
        style: {
            MozOsxFontSmoothing: 'grayscale',
            WebkitFontSmoothing: 'antialiased',
            fontStyle: 'normal',
            fontWeight: 'normal',
            speak: 'none'
        },
        fontFace: {
            fontFamily: `"FabricMDL2Icons"`
        },
        icons: {
            BarChartVertical: '\uE9EC',
            CalculatorAddition: '\uE948',
            CalculatorSubtract: '\uE949',
            Calendar: '\uE787',
            Cancel: '\uE711',
            CheckMark: '\uE73E',
            ChevronDown: '\uE70D',
            ChevronLeft: '\uE76B',
            ChevronRight: '\uE76C',
            CircleStopSolid: '\uF2DB',
            Copy: '\uE8C8',
            EditStyle: '\uEF60',
            HalfAlpha: '\uE97E',
            Help: '\uE897',
            Info: '\uE946',
            NumberSymbol: '\uF7AC',
            OpenFile: '\uE8E5',
            Page: '\uE7C3',
            Play: '\uE768',
            PlaybackRate1x: '\uEC57',
            Refresh: '\uE72C',
            Repair: '\uE90F',
            Settings: '\uE713',
            Share: '\uE72D',
            ToggleRight: '\uF19F',
            Unknown: '\uE9CE',
            Zoom: '\uE71E',
            ZoomIn: '\uE8A3',
            ZoomOut: '\uE71F',
            ZoomToFit: '\uF649'
        }
    };

    registerIcons(subset, options);
};

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
