import { type Theme } from '@fluentui/react-components';
import type { BindingsSettings } from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebTheme } from './theme';

/** The tokens Fluent's form controls use for labels and values. */
const TEXT_TOKENS = [
    'colorNeutralForeground1',
    'colorNeutralForeground2',
    'colorNeutralForeground3'
] as const;

/**
 * The tokens Fluent uses for a slider's fill and thumb, a checked checkbox
 * or radio, and the focus indicator.
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
    'colorStrokeFocus2'
] as const;

/** Fluent's own ratio of line height to font size for body text. */
const LINE_HEIGHT_RATIO = 1.4;

/**
 * The Fluent theme for the bindings pane: the light theme, with the author's
 * style settings applied over it. The pane does not follow the editor's
 * theme, so it looks the same in the preview as in the report.
 */
export const getBindingsTheme = (settings: BindingsSettings): Theme => {
    const theme: Theme = { ...getDenebTheme('light') };
    if (settings.fontFamily !== undefined) {
        theme.fontFamilyBase = settings.fontFamily;
    }
    if (settings.fontSize !== undefined) {
        const fontSize = `${settings.fontSize}px`;
        const lineHeight = `${Math.ceil(
            settings.fontSize * LINE_HEIGHT_RATIO
        )}px`;
        // The pane's controls are Fluent's small size, whose labels,
        // dropdowns and text inputs take the 200 step of the type ramp.
        // Checkbox and radio labels and the pane's own text take the 300
        // step. The setting is one size for all of them.
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
