export {
    buttonStyles,
    initializeIcons,
    linkStyles,
    previewPaneButtonStyles,
    templateTypeIconStyles,
    templateTypeIconOptionStyles,
    theme
};

import { IButtonStyles } from '@fluentui/react/lib/Button';
import { ILinkStyles } from '@fluentui/react/lib/Link';
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
        fontWeight: FontWeights.regular
    }
};

const previewPaneButtonStyles: IButtonStyles = {
    root: {
        backgroundColor: theme.palette.white
    },
    rootDisabled: {
        backgroundColor: theme.palette.white
    },
    icon: { color: theme.palette.neutralPrimary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark },
    iconChecked: { color: theme.palette.neutralDark }
};

const linkStyles: ILinkStyles = {
    root: {
        color: theme.palette.themeDark
    }
};

const templateTypeIconStyles: IButtonStyles = {
    icon: { color: theme.palette.neutralPrimary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark }
};

const templateTypeIconOptionStyles: IButtonStyles = {
    ...templateTypeIconStyles,
    ...{
        root: {
            marginRight: '8px',
            cursor: 'pointer'
        }
    }
};
