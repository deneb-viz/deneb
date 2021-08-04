export { initializeIcons };

import {
    IIconOptions,
    IIconSubset,
    registerIcons
} from '@fluentui/react/lib/Styling';

import { getIcons } from '../utils/config';

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
