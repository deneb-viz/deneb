import { describe, expect, it } from 'vitest';

import {
    resolvePlatformSearchable,
    resolvePlatformSearchables,
    resolveQuery,
    resolveSectionSchema,
    type PlatformSearchContribution,
    type TranslateFn
} from '../resolve-descriptors';
import type { SectionSchema } from '../schema-types';

/**
 * Trivial translate stub that returns the key itself with a `tr:`
 * prefix so tests can observe whether a resolver routed a given
 * string through the translator.
 */
const fakeTranslate: TranslateFn = (key: string) => `tr:${key}`;

describe('resolveSectionSchema', () => {
    it('resolves every row label + assistive key through translate', () => {
        const schema = {
            id: 'general',
            headingKey: 'HEAD',
            rows: [
                { id: 'a', labelKey: 'L_A', assistiveKey: 'AS_A' },
                { id: 'b', labelKey: 'L_B' }
            ]
        } as const satisfies SectionSchema;
        const resolved = resolveSectionSchema(schema, fakeTranslate);
        expect(resolved).toEqual({
            id: 'general',
            heading: 'tr:HEAD',
            rows: [
                { id: 'a', label: 'tr:L_A', assistive: 'tr:AS_A' },
                { id: 'b', label: 'tr:L_B', assistive: null }
            ]
        });
    });

    it('omits assistive as null when assistiveKey is absent', () => {
        const schema = {
            id: 'performance',
            headingKey: 'H',
            rows: [{ id: 'x', labelKey: 'L' }]
        } as const satisfies SectionSchema;
        const resolved = resolveSectionSchema(schema, fakeTranslate);
        expect(resolved.rows[0].assistive).toBeNull();
    });
});

describe('resolvePlatformSearchable', () => {
    it('returns null when the contribution is absent', () => {
        expect(resolvePlatformSearchable(undefined, fakeTranslate)).toBeNull();
        expect(resolvePlatformSearchable(null, fakeTranslate)).toBeNull();
    });

    it('returns null when the contribution has zero rows', () => {
        const empty: PlatformSearchContribution = {
            id: 'platform',
            heading: 'Platform',
            rows: []
        };
        expect(resolvePlatformSearchable(empty, fakeTranslate)).toBeNull();
    });

    it('resolves { key } wrappers through translate', () => {
        const contribution: PlatformSearchContribution = {
            id: 'platform',
            heading: { key: 'Text_Platform' },
            rows: [
                {
                    id: 'row-1',
                    label: { key: 'Text_Row1' },
                    assistive: { key: 'Assistive_Row1' }
                }
            ]
        };
        const resolved = resolvePlatformSearchable(contribution, fakeTranslate);
        expect(resolved).toEqual({
            id: 'platform',
            heading: 'tr:Text_Platform',
            rows: [
                {
                    id: 'row-1',
                    label: 'tr:Text_Row1',
                    assistive: 'tr:Assistive_Row1'
                }
            ]
        });
    });

    it('passes raw strings through as-is', () => {
        const contribution: PlatformSearchContribution = {
            id: 'platform',
            heading: 'Already localised heading',
            rows: [
                {
                    id: 'r',
                    label: 'Already localised label'
                }
            ]
        };
        const resolved = resolvePlatformSearchable(contribution, fakeTranslate);
        expect(resolved?.heading).toBe('Already localised heading');
        expect(resolved?.rows[0].label).toBe('Already localised label');
        expect(resolved?.rows[0].assistive).toBeNull();
    });

    it('supports mixed raw + { key } entries within one contribution', () => {
        const contribution: PlatformSearchContribution = {
            id: 'platform',
            heading: 'Mixed',
            rows: [
                {
                    id: 'r',
                    label: { key: 'L' },
                    assistive: 'raw assistive'
                }
            ]
        };
        const resolved = resolvePlatformSearchable(contribution, fakeTranslate);
        expect(resolved?.rows[0]).toEqual({
            id: 'r',
            label: 'tr:L',
            assistive: 'raw assistive'
        });
    });
});

describe('resolvePlatformSearchables', () => {
    it('returns an empty array when the input is absent', () => {
        expect(resolvePlatformSearchables(undefined, fakeTranslate)).toEqual(
            []
        );
        expect(resolvePlatformSearchables(null, fakeTranslate)).toEqual([]);
    });

    it('returns an empty array when given an empty array', () => {
        expect(resolvePlatformSearchables([], fakeTranslate)).toEqual([]);
    });

    it('resolves multiple contributions preserving id and order', () => {
        const contributions: PlatformSearchContribution[] = [
            {
                id: 'tooltips',
                heading: { key: 'Text_Tooltips' },
                rows: [{ id: 'enable-tooltips', label: { key: 'Text_Enable' } }]
            },
            {
                id: 'crosshighlight',
                heading: 'Cross-highlighting',
                rows: [{ id: 'enable-highlight', label: 'Enable highlight' }]
            }
        ];
        const resolved = resolvePlatformSearchables(
            contributions,
            fakeTranslate
        );
        expect(resolved).toHaveLength(2);
        expect(resolved[0]).toEqual({
            id: 'tooltips',
            heading: 'tr:Text_Tooltips',
            rows: [
                {
                    id: 'enable-tooltips',
                    label: 'tr:Text_Enable',
                    assistive: null
                }
            ]
        });
        expect(resolved[1]).toEqual({
            id: 'crosshighlight',
            heading: 'Cross-highlighting',
            rows: [
                {
                    id: 'enable-highlight',
                    label: 'Enable highlight',
                    assistive: null
                }
            ]
        });
    });

    it('skips contributions with zero rows', () => {
        const contributions: PlatformSearchContribution[] = [
            { id: 'empty', heading: 'Empty', rows: [] },
            {
                id: 'kept',
                heading: 'Kept',
                rows: [{ id: 'r', label: 'L' }]
            }
        ];
        const resolved = resolvePlatformSearchables(
            contributions,
            fakeTranslate
        );
        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('kept');
    });

    it('accepts arbitrary section ids (not just "platform")', () => {
        const contributions: PlatformSearchContribution[] = [
            {
                id: 'semantic-model',
                heading: 'SM',
                rows: [{ id: 'r', label: 'L' }]
            }
        ];
        const resolved = resolvePlatformSearchables(
            contributions,
            fakeTranslate
        );
        expect(resolved[0].id).toBe('semantic-model');
    });

    it('resolves { key } assistive wrappers through translate', () => {
        const contributions: PlatformSearchContribution[] = [
            {
                id: 'x',
                heading: 'X',
                rows: [
                    {
                        id: 'r',
                        label: 'L',
                        assistive: { key: 'ASSIST_KEY' }
                    }
                ]
            }
        ];
        const resolved = resolvePlatformSearchables(
            contributions,
            fakeTranslate
        );
        expect(resolved[0].rows[0].assistive).toBe('tr:ASSIST_KEY');
    });
});

describe('resolveQuery', () => {
    it('trims whitespace from both ends', () => {
        expect(resolveQuery('  hello  ')).toBe('hello');
    });

    it('lower-cases the remainder', () => {
        expect(resolveQuery('  FORMAT  ')).toBe('format');
    });

    it('returns an empty string for whitespace-only input', () => {
        expect(resolveQuery('   ')).toBe('');
        expect(resolveQuery('')).toBe('');
    });

    it('respects the optional locale argument', () => {
        // Turkish locale lower-cases "I" to "ı" (dotless). If the
        // locale arg is threaded through this case should survive.
        expect(resolveQuery('FORMATı', 'tr-TR')).toBe('formatı');
    });
});
