import { describe, expect, it } from 'vitest';
import { shouldOpenEmbedWindow } from '../embed-window';

describe('shouldOpenEmbedWindow (defect #7 follow-up: no window without a re-embed)', () => {
    it('opens on the first non-null spec (no previous spec)', () => {
        expect(shouldOpenEmbedWindow(null, { mark: 'bar' })).toBe(true);
    });

    it('never opens for a null next spec (nothing will embed)', () => {
        expect(shouldOpenEmbedWindow(null, null)).toBe(false);
        expect(shouldOpenEmbedWindow({ mark: 'bar' }, null)).toBe(false);
    });

    it('does NOT open for a new identity with deep-equal content (useVegaEmbed will skip the re-embed)', () => {
        const previous = {
            mark: 'bar',
            data: { values: [{ a: 1 }, { a: 2 }] },
            encoding: { x: { field: 'a' } }
        };
        const next = {
            mark: 'bar',
            data: { values: [{ a: 1 }, { a: 2 }] },
            encoding: { x: { field: 'a' } }
        };
        expect(next).not.toBe(previous);
        expect(shouldOpenEmbedWindow(previous, next)).toBe(false);
    });

    it('does not open for the identical object reference', () => {
        const spec = { mark: 'line' };
        expect(shouldOpenEmbedWindow(spec, spec)).toBe(false);
    });

    it('opens when the content genuinely differs (a re-embed will follow)', () => {
        expect(
            shouldOpenEmbedWindow(
                { mark: 'bar', data: { values: [{ a: 1 }] } },
                { mark: 'bar', data: { values: [{ a: 2 }] } }
            )
        ).toBe(true);
    });

    it('opens on a nested structural difference', () => {
        expect(
            shouldOpenEmbedWindow(
                { encoding: { x: { field: 'a', type: 'ordinal' } } },
                { encoding: { x: { field: 'a', type: 'quantitative' } } }
            )
        ).toBe(true);
    });
});
