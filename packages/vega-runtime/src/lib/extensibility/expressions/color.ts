import { shadeColor } from '@deneb-viz/utils/color';
import { getThemeColorByIndex, getThemeColorByName } from '../scheme';

/**
 * Access a color from the Power BI theme by zero-based index, or its internal name, and (optionally) adjust its shade
 * by a percentage.
 */
export const pbiColor = (value: string | number, shadePercent: number = 0) =>
    shadeColor(
        getThemeColorByName(`${value}`) ||
            getThemeColorByIndex(parseInt(`${value}`) || 0),
        shadePercent
    );
