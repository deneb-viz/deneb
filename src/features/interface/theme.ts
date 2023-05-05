import {
    BrandVariants,
    createLightTheme,
    createDarkTheme
} from '@fluentui/react-components';

/**
 * Power BI primary color, adjusted for Fluent UI's brand ramp.
 */
const customBrandRamp: BrandVariants = {
    10: '#001919',
    20: '#012826',
    30: '#01322e',
    40: '#033f38',
    50: '#054d43',
    60: '#0a5c50',
    70: '#0c695a',
    80: '#117865',
    90: '#1f937e',
    100: '#2aac94',
    110: '#3abb9f',
    120: '#52c7aa',
    130: '#78d3b9',
    140: '#9ee0cb',
    150: '#c0ecdd',
    160: '#e3f7ef'
};

/**
 * Light theme for the UI.
 */
export const light = createLightTheme(customBrandRamp);

/**
 * Dark theme for the UI.
 */
export const dark = createDarkTheme(customBrandRamp);
