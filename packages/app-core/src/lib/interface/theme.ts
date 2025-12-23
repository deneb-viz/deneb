import {
    BrandVariants,
    createDarkTheme,
    createLightTheme,
    Theme
} from '@fluentui/react-components';

import { type DenebTheme } from './types';

const BRAND_RAMP: BrandVariants = {
    10: '#050203',
    20: '#231119',
    30: '#3D1929',
    40: '#521E37',
    50: '#682345',
    60: '#7F2753',
    70: '#972C62',
    80: '#AF2F72',
    90: '#C83382',
    100: '#E23692',
    110: '#E8559E',
    120: '#EE70AA',
    130: '#F387B7',
    140: '#F79EC4',
    150: '#FAB4D0',
    160: '#FDC9DD'
};

const LIGHT_THEME = { ...createLightTheme(BRAND_RAMP) };
const DARK_THEME = { ...createDarkTheme(BRAND_RAMP) };

DARK_THEME.colorBrandForeground1 = BRAND_RAMP[110];
DARK_THEME.colorBrandForeground2 = BRAND_RAMP[120];

/**
 * Default theme for the editor.
 */
export const THEME_DEFAULT: DenebTheme = 'light';

/**
 * Gets the appropriate Fluent UI theme configuration based on the specified theme type.
 *
 * @param theme - The theme type to retrieve configuration for
 * @returns The corresponding theme configuration object. Will return the light theme if the provided theme is not
 *           recognized.
 */
export const getDenebTheme = (theme: DenebTheme): Theme => {
    return theme === 'light'
        ? LIGHT_THEME
        : theme === 'dark'
          ? DARK_THEME
          : LIGHT_THEME;
};
