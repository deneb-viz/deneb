import { describe, expect, it } from 'vitest';
import { parseExpression } from 'vega';

import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';
import {
    getResolvedCrossFilterOptions,
    getResolvedFilterExpressionForPlaceholder
} from '../cross-filter-expressions';
import { type CrossFilterOptions } from '../../interactivity';

// These are the two audit-flagged, previously-untested hotspots in the
// advanced cross-filter apply path: placeholder substitution (L11 — quote /
// backslash escaping) and options resolution (defaults vs. author overrides).

describe('getResolvedFilterExpressionForPlaceholder', () => {
    it('substitutes a string datum value as a quoted Vega string literal', () => {
        const expr = getResolvedFilterExpressionForPlaceholder(
            'datum.name == _{name}_',
            { name: 'Smith' }
        );
        expect(expr).toBe("datum.name == 'Smith'");
        expect(() => parseExpression(expr)).not.toThrow();
    });

    it("escapes single quotes so values like O'Brien parse (L11)", () => {
        const expr = getResolvedFilterExpressionForPlaceholder(
            'datum.name == _{name}_',
            { name: "O'Brien" }
        );
        // The apostrophe is backslash-escaped inside the single-quoted literal.
        expect(expr).toBe("datum.name == 'O\\'Brien'");
        // Parses to a valid expression whose literal is the original value.
        expect(() => parseExpression(expr)).not.toThrow();
    });

    it('the naive (unescaped) substitution would be a parse error — proves the escaping is load-bearing', () => {
        // This is what the pre-fix code produced for O'Brien; it must throw,
        // otherwise the escaping in the fix is not actually needed.
        expect(() => parseExpression("datum.name == 'O'Brien'")).toThrow();
    });

    it('escapes backslashes so Windows-style path values parse', () => {
        const expr = getResolvedFilterExpressionForPlaceholder(
            'datum.path == _{path}_',
            { path: 'C:\\temp' }
        );
        expect(expr).toBe("datum.path == 'C:\\\\temp'");
        expect(() => parseExpression(expr)).not.toThrow();
    });

    it('leaves numeric and boolean datum values unquoted', () => {
        expect(
            getResolvedFilterExpressionForPlaceholder('datum.n == _{n}_', {
                n: 42
            })
        ).toBe('datum.n == 42');
        expect(
            getResolvedFilterExpressionForPlaceholder('datum.b == _{b}_', {
                b: true
            })
        ).toBe('datum.b == true');
    });

    it('wraps Date datum values in toDate()', () => {
        const d = new Date('2026-07-10T00:00:00.000Z');
        const expr = getResolvedFilterExpressionForPlaceholder(
            'datum.d == _{d}_',
            { d }
        );
        expect(expr).toBe(`datum.d == toDate('${d}')`);
    });
});

describe('getResolvedCrossFilterOptions', () => {
    it('resolves advanced mode and default limit when an expression is present', () => {
        const resolved = getResolvedCrossFilterOptions(
            'datum.x > 1',
            {} as CrossFilterOptions
        );
        expect(resolved.mode).toBe('advanced');
        expect(resolved.filterExpr).toBe('datum.x > 1');
        expect(resolved.limit).toBe(
            INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
        );
    });

    it('resolves simple mode when no expression is present', () => {
        const resolved = getResolvedCrossFilterOptions(
            '',
            {} as CrossFilterOptions
        );
        expect(resolved.mode).toBe('simple');
    });

    it('lets author-supplied options override the defaults', () => {
        const resolved = getResolvedCrossFilterOptions('datum.x > 1', {
            limit: 5
        } as CrossFilterOptions);
        expect(resolved.limit).toBe(5);
    });
});
