export { buttonStyles, initializeIcons, linkStyles, spinButtonStyles, theme };

import { IButtonStyles } from '@fluentui/react/lib/Button';
import { ILinkStyles } from '@fluentui/react/lib/Link';
import { ISpinButtonStyles } from '@fluentui/react/lib/SpinButton';
import {
    FontWeights,
    IIconOptions,
    IIconSubset,
    registerIcons
} from '@fluentui/react/lib/Styling';
import { IPartialTheme } from '@fluentui/react/lib/Theme';

import { getConfig, getIcons } from '../utils/config';

/**
 * Initialise packaged Fluent UI icons rather than loading from CDN (default behaviour).
 * Icons are updated via the `update-fabric-icons` NPM script and driven via the IDs in `/config/fabric-icons.json`
 */
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
        icons: getIcons()
    };
    registerIcons(subset, options);
};

/**
 * The Fluent UI theme, as from the visual configuration.
 */
const theme = <IPartialTheme>getConfig()?.fluentUiTheme || {};

/**
 * General styling for buttons within the UI.
 */
const buttonStyles: IButtonStyles = {
    root: {
        borderRadius: 0
    },
    label: {
        color: theme.palette.black,
        fontWeight: FontWeights.regular
    }
};

const linkStyles: ILinkStyles = {
    root: {
        color: theme.palette.themeDark
    }
};

const spinButtonStyles: Partial<ISpinButtonStyles> = {
    spinButtonWrapper: { width: 75 }
};
