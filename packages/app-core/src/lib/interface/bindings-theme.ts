import { type Theme } from '@fluentui/react-components';
import type { BindingsSettings } from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebTheme } from './theme';

/**
 * The tokens Fluent's form controls use for labels and values, and a subtle
 * button uses for its text when it is hovered or pressed.
 */
const TEXT_TOKENS = [
    'colorNeutralForeground1',
    'colorNeutralForeground2',
    'colorNeutralForeground2Hover',
    'colorNeutralForeground2Pressed',
    'colorNeutralForeground3'
] as const;

/**
 * The tokens Fluent uses for a slider's fill and thumb, a checked checkbox
 * or radio, the focus indicator, and the icon of a subtle button when it is
 * hovered or pressed.
 */
const ACCENT_TOKENS = [
    'colorCompoundBrandBackground',
    'colorCompoundBrandBackgroundHover',
    'colorCompoundBrandBackgroundPressed',
    'colorCompoundBrandForeground1',
    'colorCompoundBrandForeground1Hover',
    'colorCompoundBrandForeground1Pressed',
    'colorCompoundBrandStroke',
    'colorCompoundBrandStrokeHover',
    'colorCompoundBrandStrokePressed',
    'colorNeutralForeground2BrandHover',
    'colorNeutralForeground2BrandPressed',
    'colorStrokeFocus2'
] as const;

/**
 * The ratio of line height to font size for every step of the type ramp
 * that the `fontSize` setting sets, the 200 step and the 300 step alike.
 */
const LINE_HEIGHT_RATIO = 1.4;

/**
 * The style for a dropdown or a text input in the bindings pane. Fluent
 * colours the text inside these fields with `colorNeutralForeground1`, the
 * token the `color` setting replaces, but each field keeps its own light
 * background. Resetting the token to the light theme's value on the field
 * keeps its text readable when the author sets a light text colour for a
 * dark report page.
 */
export const BINDINGS_FIELD_STYLE: Readonly<Record<string, string>> = {
    '--colorNeutralForeground1': getDenebTheme('light').colorNeutralForeground1
};

/**
 * The Fluent theme for the bindings pane: the light theme, with the author's
 * style settings applied over it. The pane does not follow the editor's
 * theme, so it looks the same in the preview as in the report.
 */
export const getBindingsTheme = (
    settings: Pick<
        BindingsSettings,
        'fontFamily' | 'fontSize' | 'color' | 'accentColor'
    >
): Theme => {
    const theme: Theme = { ...getDenebTheme('light') };
    if (settings.fontFamily !== undefined) {
        theme.fontFamilyBase = settings.fontFamily;
    }
    if (settings.fontSize !== undefined) {
        const fontSize = `${settings.fontSize}px`;
        const lineHeight = `${Math.ceil(
            settings.fontSize * LINE_HEIGHT_RATIO
        )}px`;
        // The pane's controls are Fluent's small size, whose text takes the
        // 200 step of the type ramp. The pane's own text takes the 300 step,
        // which is also the size an `em` stands for in the pane's styles.
        // The setting is one size for both.
        theme.fontSizeBase200 = fontSize;
        theme.lineHeightBase200 = lineHeight;
        theme.fontSizeBase300 = fontSize;
        theme.lineHeightBase300 = lineHeight;
    }
    if (settings.color !== undefined) {
        for (const token of TEXT_TOKENS) {
            theme[token] = settings.color;
        }
    }
    if (settings.accentColor !== undefined) {
        for (const token of ACCENT_TOKENS) {
            theme[token] = settings.accentColor;
        }
    }
    return theme;
};
