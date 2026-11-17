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
    /**
     * The font names rebuilt with this module's own quotes and commas, never
     * the author's text as written.
     */
    fontFamily?: string;
    /** In pixels, as elsewhere in a Vega config. */
    fontSize?: number;
    color?: string;
    accentColor?: string;
    background?: string;
    borderColor?: string;
};

export const DEFAULT_BINDINGS_SETTINGS: Readonly<BindingsSettings> =
    Object.freeze({
        orient: 'bottom',
        float: false,
        collapsible: true,
        collapsed: false
    });

export type BindingsSettingsResult = {
    settings: Readonly<BindingsSettings>;
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
 * there is one. Without it, the value is accepted, because its shape has
 * already been checked and an invalid colour is simply not applied by the
 * browser.
 */
const isCssColor: ColorValidator = (value) =>
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('color', value)
        : true;

/**
 * The shape of a colour that is let through: a hex value, a name, or one
 * colour function with plain arguments. A colour is written into a
 * stylesheet as text, so a value that could carry more than a colour is
 * refused whatever the platform says about it. `var()` and `url()` are not
 * colour functions, and no separator or nested function fits the shape.
 */
const COLOR_SHAPE =
    /^(#[0-9a-f]{3,8}|[a-z]+|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([0-9a-z.,% /+-]+\))$/i;

/**
 * A font family's name: letters, combining marks, digits, spaces, hyphens and
 * underscores. Names in some scripts need the marks to be spelled correctly.
 */
const FONT_FAMILY_NAME = /^[\p{L}\p{M}\p{N} _-]+$/u;

/** A name that CSS reads as one keyword or identifier, so it needs no quotes. */
const BARE_FONT_FAMILY = /^-?[a-z][a-z-]*$/i;

/**
 * A font family list rebuilt from the names in the author's text, or
 * undefined when a name has a character that a font name does not need.
 *
 * The setting is written into a stylesheet as text, so it is never passed
 * on as the author wrote it. Each name is checked, and the list is put back
 * together with this module's own quotes and commas.
 */
const getFontFamily = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const names = value.split(',').map((name) =>
        name
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2')
            .trim()
    );
    if (!names.every((name) => FONT_FAMILY_NAME.test(name))) {
        return undefined;
    }
    return names
        .map((name) => (BARE_FONT_FAMILY.test(name) ? name : `"${name}"`))
        .join(', ');
};

/** The range of font sizes, in pixels, that is let through. */
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 100;

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
    if (!isRecord(config) || !hasOwn(config, 'deneb')) {
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
        const fontFamily = getFontFamily(bindings.fontFamily);
        if (fontFamily !== undefined) {
            settings.fontFamily = fontFamily;
        } else {
            warnInvalid('fontFamily', 'a font name');
        }
    }
    if (bindings.fontSize !== undefined) {
        const value = bindings.fontSize;
        if (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= MIN_FONT_SIZE &&
            value <= MAX_FONT_SIZE
        ) {
            settings.fontSize = value;
        } else {
            warnInvalid('fontSize', 'a number from 1 to 100');
        }
    }
    for (const key of COLOR_KEYS) {
        const value = bindings[key];
        if (value === undefined) {
            continue;
        }
        const color = typeof value === 'string' ? value.trim() : undefined;
        if (
            color !== undefined &&
            COLOR_SHAPE.test(color) &&
            isValidColor(color)
        ) {
            settings[key] = color;
        } else {
            warnInvalid(key, 'a CSS colour');
        }
    }
    return result;
};
