import { hasOwn, isRecord } from './object-guards';

export const BINDINGS_ORIENT_VALUES = [
    'top',
    'bottom',
    'left',
    'right'
] as const;

export type BindingsOrient = (typeof BINDINGS_ORIENT_VALUES)[number];

/**
 * How the bindings pane is placed and styled. The style properties are
 * absent when the author has not set them, and the pane then uses its theme.
 */
export type BindingsSettings = {
    /** The edge of the visual the pane sits on. */
    orient: BindingsOrient;
    /** Overlay the chart instead of taking space beside it. */
    float: boolean;
    /** Show the control that collapses and expands the pane. */
    collapsible: boolean;
    /** Start collapsed. Applies only when `collapsible` is true. */
    collapsed: boolean;
    fontFamily?: string;
    /** In pixels, as elsewhere in a Vega config. */
    fontSize?: number;
    color?: string;
    accentColor?: string;
    background?: string;
    borderColor?: string;
};

export const DEFAULT_BINDINGS_SETTINGS: BindingsSettings = Object.freeze({
    orient: 'bottom',
    float: false,
    collapsible: true,
    collapsed: false
});

export type BindingsSettingsResult = {
    settings: BindingsSettings;
    /**
     * The config without its `deneb` key. The same object that was passed in
     * when it had no such key.
     */
    config: Record<string, unknown>;
    warnings: string[];
};

export type ColorValidator = (value: string) => boolean;

/**
 * Whether a string is a CSS colour. Uses the platform's own check where
 * there is one. Without it, any non-empty text is accepted and an invalid
 * colour is simply not applied by the browser.
 */
const isCssColor: ColorValidator = (value) =>
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('color', value)
        : value.trim().length > 0;

const BOOLEAN_KEYS = ['float', 'collapsible', 'collapsed'] as const;
const COLOR_KEYS = [
    'color',
    'accentColor',
    'background',
    'borderColor'
] as const;
const RECOGNISED_KEYS: readonly string[] = [
    'orient',
    'fontFamily',
    'fontSize',
    ...BOOLEAN_KEYS,
    ...COLOR_KEYS
];

const isOrient = (value: unknown): value is BindingsOrient =>
    BINDINGS_ORIENT_VALUES.includes(value as BindingsOrient);

/**
 * Lift Deneb's settings out of a parsed config.
 *
 * The settings live under the config's `deneb` key, which Vega and
 * Vega-Lite must never see: Vega-Lite's config schema rejects unknown keys.
 * The key is removed from the config that is returned.
 *
 * An invalid value falls back to its default, and an unrecognised key is
 * ignored. Each adds a warning. Neither is an error.
 */
export const extractBindingsSettings = (
    config: Record<string, unknown>,
    isValidColor: ColorValidator = isCssColor
): BindingsSettingsResult => {
    if (!hasOwn(config, 'deneb')) {
        return { settings: DEFAULT_BINDINGS_SETTINGS, config, warnings: [] };
    }
    const { deneb, ...configWithoutDeneb } = config;
    const settings: BindingsSettings = { ...DEFAULT_BINDINGS_SETTINGS };
    const warnings: string[] = [];
    const result = { settings, config: configWithoutDeneb, warnings };

    if (!isRecord(deneb)) {
        warnings.push('Config: "deneb" must be an object. It was ignored.');
        return result;
    }
    for (const key of Object.keys(deneb)) {
        if (key !== 'bindings') {
            warnings.push(
                `Config: "deneb.${key}" is not a recognised setting. It was ignored.`
            );
        }
    }
    const bindings = deneb.bindings;
    if (bindings === undefined) {
        return result;
    }
    if (!isRecord(bindings)) {
        warnings.push(
            'Config: "deneb.bindings" must be an object. It was ignored.'
        );
        return result;
    }
    for (const key of Object.keys(bindings)) {
        if (!RECOGNISED_KEYS.includes(key)) {
            warnings.push(
                `Config: "deneb.bindings.${key}" is not a recognised setting. It was ignored.`
            );
        }
    }
    const warnInvalid = (key: string, expected: string) => {
        warnings.push(
            `Config: "deneb.bindings.${key}" must be ${expected}. The default was used.`
        );
    };

    if (bindings.orient !== undefined) {
        if (isOrient(bindings.orient)) {
            settings.orient = bindings.orient;
        } else {
            warnInvalid('orient', 'one of "top", "bottom", "left" or "right"');
        }
    }
    for (const key of BOOLEAN_KEYS) {
        const value = bindings[key];
        if (value === undefined) {
            continue;
        }
        if (typeof value === 'boolean') {
            settings[key] = value;
        } else {
            warnInvalid(key, 'true or false');
        }
    }
    if (bindings.fontFamily !== undefined) {
        const value = bindings.fontFamily;
        if (typeof value === 'string' && value.trim().length > 0) {
            settings.fontFamily = value;
        } else {
            warnInvalid('fontFamily', 'a font name');
        }
    }
    if (bindings.fontSize !== undefined) {
        const value = bindings.fontSize;
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            settings.fontSize = value;
        } else {
            warnInvalid('fontSize', 'a number greater than zero');
        }
    }
    for (const key of COLOR_KEYS) {
        const value = bindings[key];
        if (value === undefined) {
            continue;
        }
        if (typeof value === 'string' && isValidColor(value)) {
            settings[key] = value;
        } else {
            warnInvalid(key, 'a CSS colour');
        }
    }
    return result;
};
