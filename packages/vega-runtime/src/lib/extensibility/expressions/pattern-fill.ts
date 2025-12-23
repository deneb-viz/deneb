import { generateDynamicPatternFill } from '../../pattern-fill';

/**
 * Obtain a dynamic version of a pre-defined pattern, with a custom foreground and background color.
 */
export const pbiPatternSvg = (id: string, fgColor: string, bgColor: string) => {
    return generateDynamicPatternFill(id, fgColor, bgColor);
};
