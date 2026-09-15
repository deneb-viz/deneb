import { describe, expect, it, vi } from 'vitest';

import { buildMatchView } from '../match-engine';
import {
    resolveQuery,
    resolveSectionSchema,
    type TranslateFn
} from '../resolve-descriptors';
import type { SectionSchema } from '../schema-types';

/**
 * Characterizes the `settings-pane.tsx` fix for Important #9: descriptors
 * (`resolveSectionSchema` / `resolvePlatformSearchables` /
 * `buildResolvedDatasetDescriptor` — all translate + `.toLowerCase()` work)
 * used to sit in the same `useMemo` dependency array as `query`, so every
 * keystroke rebuilt every descriptor from scratch even though none of them
 * depend on the query text.
 *
 * Post-fix, descriptor resolution is a separate `useMemo` with no `query`
 * dependency; only `buildMatchView` (the actual filtering step) re-runs per
 * keystroke. This test can't render the component (no
 * `@testing-library/react` / jsdom in this workspace — see
 * `data-tab-listener-rebind.test.ts` for the established precedent), so it
 * characterises the same shape directly: resolve descriptors once through a
 * spied `translate`, then run the match engine against that single resolved
 * result across N distinct queries, asserting `translate` is never called
 * again and every query still produces the correct match result.
 */
describe('settings-pane descriptor/match-view split (Important #9)', () => {
    const schema = {
        id: 'general',
        headingKey: 'HEAD_GENERAL',
        rows: [
            { id: 'provider', labelKey: 'L_PROVIDER' },
            { id: 'render-mode', labelKey: 'L_RENDER_MODE' }
        ]
    } as const satisfies SectionSchema;

    it('resolves descriptors exactly once regardless of how many distinct queries are subsequently matched', () => {
        const translateSpy: TranslateFn = vi.fn(
            (key: string) => `tr:${key}`
        ) as unknown as TranslateFn;

        // Simulates the `descriptors` useMemo in settings-pane.tsx — built
        // once, independent of query.
        const resolvedSections = [resolveSectionSchema(schema, translateSpy)];
        const callCountAfterBuild = (translateSpy as ReturnType<typeof vi.fn>)
            .mock.calls.length;
        expect(callCountAfterBuild).toBeGreaterThan(0);

        // Simulates N keystrokes: each re-runs only `buildMatchView` (the
        // `matchView` useMemo, keyed on `[descriptors, deferredQuery]`) —
        // `resolvedSections` is reused by reference, never rebuilt.
        const queries = ['p', 'pr', 'provider', 'render', 'xyz-no-match', ''];
        for (const raw of queries) {
            buildMatchView({
                query: resolveQuery(raw),
                sections: resolvedSections,
                dataset: null
            });
        }

        expect(
            (translateSpy as ReturnType<typeof vi.fn>).mock.calls.length
        ).toBe(callCountAfterBuild);
    });

    it('still produces correct, distinct match results per query against the single resolved descriptor set', () => {
        const resolvedSections = [
            resolveSectionSchema(schema, (key) => `tr:${key}`)
        ];

        const providerOnly = buildMatchView({
            query: resolveQuery('provider'),
            sections: resolvedSections,
            dataset: null
        });
        expect(providerOnly.matchedSections.has('general')).toBe(true);
        expect(providerOnly.sections.get('general')?.rows.has('provider')).toBe(
            true
        );
        expect(
            providerOnly.sections.get('general')?.rows.has('render-mode')
        ).toBe(false);

        const renderModeOnly = buildMatchView({
            query: resolveQuery('render'),
            sections: resolvedSections,
            dataset: null
        });
        expect(
            renderModeOnly.sections.get('general')?.rows.has('render-mode')
        ).toBe(true);
        expect(
            renderModeOnly.sections.get('general')?.rows.has('provider')
        ).toBe(false);

        const noMatch = buildMatchView({
            query: resolveQuery('nonexistent-term'),
            sections: resolvedSections,
            dataset: null
        });
        expect(noMatch.matchedSections.size).toBe(0);

        const emptyQuery = buildMatchView({
            query: resolveQuery(''),
            sections: resolvedSections,
            dataset: null
        });
        expect(emptyQuery.matchedSections.has('general')).toBe(true);
        expect(emptyQuery.sections.get('general')?.rows.has('provider')).toBe(
            true
        );
        expect(
            emptyQuery.sections.get('general')?.rows.has('render-mode')
        ).toBe(true);
    });
});
