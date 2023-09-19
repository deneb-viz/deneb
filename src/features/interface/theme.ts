import {
    BrandVariants,
    createLightTheme,
    createDarkTheme
} from '@fluentui/react-components';

/**
 * Power BI primary color, adjusted for Fluent UI's brand ramp.
 */
const customBrandRamp: BrandVariants = {
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

/**
 * Light theme for the UI.
 */
export const light = { ...createLightTheme(customBrandRamp) };

/**
 * Dark theme for the UI.
 */
export const dark = { ...createDarkTheme(customBrandRamp) };

dark.colorBrandForeground1 = customBrandRamp[110];
dark.colorBrandForeground2 = customBrandRamp[120];
