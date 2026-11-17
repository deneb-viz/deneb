import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS_SETTINGS } from '@deneb-viz/vega-runtime/spec-processing';

import { getBindingsTheme } from '../bindings-theme';
import { getDenebTheme } from '../theme';

describe('getBindingsTheme', () => {
    const light = getDenebTheme('light');

    it('is the light theme when no style is set', () => {
        expect(getBindingsTheme(DEFAULT_BINDINGS_SETTINGS)).toEqual(light);
    });

    it('does not modify the shared light theme', () => {
        const fontFamilyBefore = light.fontFamilyBase;
        getBindingsTheme({ ...DEFAULT_BINDINGS_SETTINGS, fontFamily: 'Arial' });
        expect(getDenebTheme('light').fontFamilyBase).toBe(fontFamilyBefore);
    });

    it('applies the font family', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            fontFamily: 'Arial'
        });
        expect(theme.fontFamilyBase).toBe('Arial');
    });

    it('applies the font size in pixels with a matching line height', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            fontSize: 10
        });
        expect(theme.fontSizeBase300).toBe('10px');
        expect(theme.lineHeightBase300).toBe('14px');
    });

    it('applies the font size to the small controls as well as to plain text', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            fontSize: 18
        });
        expect(theme.fontSizeBase200).toBe('18px');
        expect(theme.lineHeightBase200).toBe('26px');
        expect(theme.fontSizeBase300).toBe('18px');
        expect(theme.lineHeightBase300).toBe('26px');
    });

    it('applies the text colour to labels and values', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            color: '#123456'
        });
        expect(theme.colorNeutralForeground1).toBe('#123456');
        expect(theme.colorNeutralForeground2).toBe('#123456');
        expect(theme.colorNeutralForeground3).toBe('#123456');
    });

    it('applies the accent colour to filled, checked and focused states', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            accentColor: '#0078d4'
        });
        expect(theme.colorCompoundBrandBackground).toBe('#0078d4');
        expect(theme.colorCompoundBrandBackgroundHover).toBe('#0078d4');
        expect(theme.colorCompoundBrandForeground1).toBe('#0078d4');
        expect(theme.colorCompoundBrandStroke).toBe('#0078d4');
        expect(theme.colorStrokeFocus2).toBe('#0078d4');
        expect(theme.colorNeutralForeground1).toBe(
            light.colorNeutralForeground1
        );
    });
});
