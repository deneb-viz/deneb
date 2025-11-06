import powerbi from 'powerbi-visuals-api';
import { mergician } from 'mergician';

import { EXTENSIONS_DEFAULT_LOCALE } from './constants';
import {
    POWERBI_THEME_DEFAULT,
    type PowerBiColorPalette
} from '@deneb-viz/powerbi-compat/theme';
import { registerCustomVegaSchemes } from './scheme';

/**
 * Options ot provide when instantiating extensions.
 */
export type VegaExtensibilityOptions = {
    /**
     * User locale for the application. Will be used as a fallback for formatting functions if one is not supplied as a
     * parameter.
     */
    defaultLocale?: string;
    /**
     * Power BI theme palette (if present)
     */
    pbiColorPalette?: powerbi.extensibility.ISandboxExtendedColorPalette;
};

/**
 * Input accepted by runtime registration: single options object or an ordered array to compose.
 * Later entries override earlier ones for overlapping keys.
 */
export type VegaExtensibilityInput =
    | VegaExtensibilityOptions
    | VegaExtensibilityOptions[];

/**
 * Resolved configuration options for Vega extensions.
 */
export type VegaExtensibilityConfiguration = VegaExtensibilityOptions & {
    pbiColorPalette: PowerBiColorPalette;
};

/**
 * Consolidated handling of Vega extension (re)registration.
 * Idempotent: if effective configuration hasn't changed, this is a no-op.
 */
export const registerVegaExtensions = (options?: VegaExtensibilityInput) => {
    const merged = mergeOptions(options);
    const resolved = getRegistryDefaults(merged);
    registerCustomVegaSchemes(resolved);
};

/**
 * Resolved default values, if not supplied when instantiating.
 */
const getRegistryDefaults = (options?: VegaExtensibilityOptions) => {
    const pbiColorPalette =
        (options?.pbiColorPalette as unknown as PowerBiColorPalette) ??
        POWERBI_THEME_DEFAULT;
    const defaultLocale = options?.defaultLocale ?? EXTENSIONS_DEFAULT_LOCALE;
    return { pbiColorPalette, defaultLocale };
};

/**
 * Merge an input into a single options object. Later entries override earlier ones.
 */
const mergeOptions = (
    input?: VegaExtensibilityInput
): VegaExtensibilityOptions | undefined => {
    if (!input) return undefined;
    if (!Array.isArray(input)) return input;
    // Deep, ordered merge: later entries override earlier ones
    // Filter out any falsy values defensively
    const parts = input.filter(Boolean) as VegaExtensibilityOptions[];
    if (parts.length === 0) return {};
    return mergician({}, ...parts) as VegaExtensibilityOptions;
};
