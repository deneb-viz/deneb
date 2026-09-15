import { describe, expect, it } from 'vitest';

import { getRowMatch } from '../get-row-match';
import type { RowMatch, SectionMatchView } from '../types';

/**
 * Extracted from two byte-identical copies previously colocated in
 * `general-settings.tsx` and `performance-settings.tsx` — both row
 * components look up their own `RowMatch` from a section-level
 * `sectionMatchView` prop.
 */
describe('getRowMatch', () => {
    it('returns undefined when the view is absent (no active filter)', () => {
        expect(getRowMatch(undefined, 'provider')).toBeUndefined();
        expect(getRowMatch(null, 'provider')).toBeUndefined();
    });

    it('returns null when the row id has no entry in the view (filtered out)', () => {
        const view: SectionMatchView = {
            headingHighlights: null,
            rows: new Map<string, RowMatch>()
        };
        expect(getRowMatch(view, 'provider')).toBeNull();
    });

    it('returns null when the row entry exists but is not visible', () => {
        const rowMatch: RowMatch = { visible: false, highlights: {} };
        const view: SectionMatchView = {
            headingHighlights: null,
            rows: new Map<string, RowMatch>([['provider', rowMatch]])
        };
        expect(getRowMatch(view, 'provider')).toBeNull();
    });

    it('returns the RowMatch when the row entry exists and is visible', () => {
        const rowMatch: RowMatch = {
            visible: true,
            highlights: { label: [{ start: 0, end: 3 }] }
        };
        const view: SectionMatchView = {
            headingHighlights: null,
            rows: new Map<string, RowMatch>([['provider', rowMatch]])
        };
        expect(getRowMatch(view, 'provider')).toBe(rowMatch);
    });
});
