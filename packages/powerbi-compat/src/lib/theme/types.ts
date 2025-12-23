import type powerbi from 'powerbi-visuals-api';

/**
 * Extension for named colors in the Power BI color palette that are not exposed by the API.
 */
export type PowerBIColorPaletteExtension = {
    colors: powerbi.IColorInfo[];
    negative: powerbi.IColorInfo;
    positive: powerbi.IColorInfo;
    neutral: powerbi.IColorInfo;
    minimum: powerbi.IColorInfo;
    center: powerbi.IColorInfo;
    maximium: powerbi.IColorInfo; // typo in upstream theme
    maximum: powerbi.IColorInfo; // potential future correct key
};

/**
 * Extend the Power BI sandbox palette with keys that are not defined in the API (but are known to exist).
 */
export type PowerBiColorPalette =
    powerbi.extensibility.ISandboxExtendedColorPalette &
        PowerBIColorPaletteExtension;
