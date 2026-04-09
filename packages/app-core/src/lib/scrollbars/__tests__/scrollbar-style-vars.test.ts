import { describe, expect, it } from 'vitest';
import { addAlpha, getScrollbarStyleVars } from '../scrollbar-style-vars';

describe('addAlpha', () => {
    it('appends alpha hex pair for a mid-range opacity', () => {
        // 0.2 * 255 = 51 = 0x33
        expect(addAlpha('#000000', 0.2)).toBe('#00000033');
    });

    it('appends ff for full opacity', () => {
        expect(addAlpha('#ffffff', 1)).toBe('#ffffffff');
    });

    it('zero-pads single-digit hex alpha values', () => {
        // 0.02 * 255 ≈ 5 = 0x5 → must be '05', not '5'
        // The old inline version missed this, producing invalid 7-char hex strings.
        expect(addAlpha('#000000', 0.02)).toBe('#00000005');
    });

    it('zero-pads the boundary value just below single-digit-hex', () => {
        // 0.04 * 255 ≈ 10 = 0xa → must be '0a'
        expect(addAlpha('#000000', 0.04)).toBe('#0000000a');
    });

    it('clamps opacity above 1 to 1', () => {
        expect(addAlpha('#ff0000', 2)).toBe('#ff0000ff');
    });

    it('clamps negative opacity to 0 (fully transparent)', () => {
        // Math.max(-1, 0) → 0. Alpha 0x00 = fully transparent.
        expect(addAlpha('#ff0000', -1)).toBe('#ff000000');
    });

    it('treats 0 opacity as fully transparent', () => {
        // With `?? 1` (null-coalescing), an explicit 0 is NOT treated as
        // falsy — it correctly produces alpha 0x00 (fully transparent).
        // This fixes the legacy `|| 1` quirk from the original inline helper.
        expect(addAlpha('#ff0000', 0)).toBe('#ff000000');
    });

    it('accepts an uppercase hex colour and preserves case', () => {
        expect(addAlpha('#FF0000', 0.5)).toBe('#FF000080');
    });
});

describe('getScrollbarStyleVars', () => {
    it('returns all five CSS variables as a style object', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 0, 8);
        expect(vars).toHaveProperty('--os-size');
        expect(vars).toHaveProperty('--os-handle-bg');
        expect(vars).toHaveProperty('--os-handle-bg-hover');
        expect(vars).toHaveProperty('--os-handle-bg-active');
        expect(vars).toHaveProperty('--os-handle-border-radius');
    });

    it('sets hover and active handle bg to the same colour as the resting state', () => {
        // Without explicit hover/active values, the overlayscrollbars library
        // falls back to `none` when no theme class is applied, making the
        // handle vanish on hover/click. Setting all three to the same computed
        // colour preserves the pre-refactor behaviour.
        const vars = getScrollbarStyleVars('#ff0000', 80, 0, 8);
        const resting = vars['--os-handle-bg' as keyof typeof vars];
        expect(vars['--os-handle-bg-hover' as keyof typeof vars]).toBe(resting);
        expect(vars['--os-handle-bg-active' as keyof typeof vars]).toBe(
            resting
        );
    });

    it('emits scrollbarWidth as an os-size pixel value', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 0, 12);
        expect(vars['--os-size' as keyof typeof vars]).toBe('12px');
    });

    it('emits scrollbarRadius as an os-handle-border-radius pixel value', () => {
        const vars = getScrollbarStyleVars('#000000', 20, 3, 8);
        expect(vars['--os-handle-border-radius' as keyof typeof vars]).toBe(
            '3px'
        );
    });

    it('applies opacity to colour via addAlpha', () => {
        // 20 / 100 = 0.2 → 0x33
        const vars = getScrollbarStyleVars('#000000', 20, 0, 8);
        expect(vars['--os-handle-bg' as keyof typeof vars]).toBe('#00000033');
    });

    it('divides the 0-100 percentage opacity by 100 before converting', () => {
        // 50 / 100 = 0.5 → 0x80
        const vars = getScrollbarStyleVars('#ffffff', 50, 0, 8);
        expect(vars['--os-handle-bg' as keyof typeof vars]).toBe('#ffffff80');
    });

    it('handles the full range of scrollbarWidth (8-16 px)', () => {
        const narrow = getScrollbarStyleVars('#000000', 20, 0, 8);
        const wide = getScrollbarStyleVars('#000000', 20, 0, 16);
        expect(narrow['--os-size' as keyof typeof narrow]).toBe('8px');
        expect(wide['--os-size' as keyof typeof wide]).toBe('16px');
    });
});
