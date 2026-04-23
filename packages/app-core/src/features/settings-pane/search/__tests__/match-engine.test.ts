import { describe, expect, it } from 'vitest';
import { buildMatchView } from '../match-engine';
import type {
    ResolvedDatasetDescriptor,
    ResolvedFieldDescriptor,
    ResolvedFlagDescriptor,
    ResolvedRowDescriptor,
    ResolvedSectionDescriptor
} from '../types';

/**
 * Fixture helper — builds a row descriptor and auto-populates the
 * `*Lower` pre-folded fields that the match engine reads. Keeps test
 * fixtures from having to repeat `.toLowerCase()` calls inline.
 */
const makeResolvedRow = (input: {
    id: string;
    label: string;
    assistive: string | null;
}): ResolvedRowDescriptor => ({
    id: input.id,
    label: input.label,
    labelLower: input.label.toLowerCase(),
    assistive: input.assistive,
    assistiveLower:
        input.assistive !== null ? input.assistive.toLowerCase() : null
});

const makeResolvedSection = (input: {
    id: string;
    heading: string;
    rows: ReadonlyArray<{
        id: string;
        label: string;
        assistive: string | null;
    }>;
}): ResolvedSectionDescriptor => ({
    id: input.id,
    heading: input.heading,
    headingLower: input.heading.toLowerCase(),
    rows: input.rows.map(makeResolvedRow)
});

const makeResolvedFlag = (input: {
    key: string;
    label: string;
    assistive: string | null;
}): ResolvedFlagDescriptor => ({
    key: input.key,
    label: input.label,
    labelLower: input.label.toLowerCase(),
    assistive: input.assistive,
    assistiveLower:
        input.assistive !== null ? input.assistive.toLowerCase() : null
});

const makeResolvedField = (input: {
    name: string;
    applicableFlags: ReadonlyArray<{
        key: string;
        label: string;
        assistive: string | null;
    }>;
}): ResolvedFieldDescriptor => ({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    applicableFlags: input.applicableFlags.map(makeResolvedFlag)
});

const makeResolvedDataset = (input: {
    heading: string;
    fields: ReadonlyArray<{
        name: string;
        applicableFlags: ReadonlyArray<{
            key: string;
            label: string;
            assistive: string | null;
        }>;
    }>;
}): ResolvedDatasetDescriptor => ({
    sectionId: 'dataset',
    heading: input.heading,
    headingLower: input.heading.toLowerCase(),
    fields: input.fields.map(makeResolvedField)
});

const performanceSection = (): ResolvedSectionDescriptor =>
    makeResolvedSection({
        id: 'performance',
        heading: 'Continuous view',
        rows: [
            {
                id: 'incremental',
                label: 'Enable patching for hosted datasets',
                assistive:
                    'Improves responsiveness when cross-filter updates touch ' +
                    'large datasets by patching values rather than re-parsing.'
            },
            {
                id: 'threshold',
                label: 'Row threshold for patching',
                assistive:
                    'Minimum number of rows at which the patching optimization ' +
                    'kicks in.'
            }
        ]
    });

const generalSection = (): ResolvedSectionDescriptor =>
    makeResolvedSection({
        id: 'general',
        heading: 'General',
        rows: [
            {
                id: 'provider',
                label: 'Provider',
                assistive: null
            },
            {
                id: 'renderMode',
                label: 'Render mode',
                assistive: 'Choose how the visual renders on canvas.'
            }
        ]
    });

const datasetDescriptor = (): ResolvedDatasetDescriptor =>
    makeResolvedDataset({
        heading: 'Supporting fields: dataset',
        fields: [
            {
                name: 'Sales Amount',
                applicableFlags: [
                    {
                        key: 'highlight',
                        label: 'Highlight value',
                        assistive: 'Cross-highlight value for this measure.'
                    },
                    {
                        key: 'format',
                        label: 'Format string',
                        assistive: 'Format string from the semantic model.'
                    },
                    {
                        key: 'formatted',
                        label: 'Formatted value',
                        assistive: 'Pre-formatted display value.'
                    }
                ]
            },
            {
                name: 'Revenue',
                applicableFlags: [
                    {
                        key: 'format',
                        label: 'Format string',
                        assistive: 'Format string from the semantic model.'
                    },
                    {
                        key: 'formatted',
                        label: 'Formatted value',
                        assistive: 'Pre-formatted display value.'
                    }
                ]
            }
        ]
    });

describe('buildMatchView: empty-query short-circuit', () => {
    it('returns every section as matched and every row visible when query is empty', () => {
        const view = buildMatchView({
            query: '',
            sections: [generalSection(), performanceSection()],
            dataset: datasetDescriptor()
        });
        expect(view.matchedSections.has('general')).toBe(true);
        expect(view.matchedSections.has('performance')).toBe(true);
        expect(view.matchedSections.has('dataset')).toBe(true);
        expect(view.sections.get('general')!.rows.size).toBe(2);
        expect(view.sections.get('performance')!.rows.size).toBe(2);
        expect(view.datasetTree!.matchedFields.size).toBe(2);
        // No highlights emitted on the empty-query short-circuit.
        expect(view.sections.get('general')!.headingHighlights).toBeNull();
        for (const row of view.sections.get('general')!.rows.values()) {
            expect(row.highlights.label).toBeUndefined();
            expect(row.highlights.assistive).toBeUndefined();
        }
    });
});

describe('buildMatchView: flat sections', () => {
    it('returns only rows whose label matches the query', () => {
        const view = buildMatchView({
            query: 'threshold',
            sections: [performanceSection()],
            dataset: null
        });
        expect(view.matchedSections.has('performance')).toBe(true);
        const perf = view.sections.get('performance')!;
        expect(perf.rows.size).toBe(1);
        expect(perf.rows.get('threshold')!.highlights.label).toEqual([
            { start: 4, end: 13 }
        ]);
    });

    it('returns a row that matches on assistive text only, with assistive ranges and no label ranges', () => {
        const view = buildMatchView({
            query: 'responsiveness',
            sections: [performanceSection()],
            dataset: null
        });
        const perf = view.sections.get('performance')!;
        expect(perf.rows.size).toBe(1);
        const row = perf.rows.get('incremental')!;
        expect(row.highlights.label).toBeUndefined();
        expect(row.highlights.assistive).toBeDefined();
        expect(row.highlights.assistive![0].start).toBeGreaterThanOrEqual(0);
    });

    it('keeps every row visible when the section heading matches, with no row-level highlights', () => {
        const view = buildMatchView({
            query: 'continuous',
            sections: [performanceSection()],
            dataset: null
        });
        const perf = view.sections.get('performance')!;
        expect(perf.headingHighlights).toEqual([{ start: 0, end: 10 }]);
        expect(perf.rows.size).toBe(2);
        for (const row of perf.rows.values()) {
            expect(row.highlights.label).toBeUndefined();
            expect(row.highlights.assistive).toBeUndefined();
        }
    });

    it('hides sections with no matches', () => {
        const view = buildMatchView({
            query: 'threshold',
            sections: [generalSection(), performanceSection()],
            dataset: null
        });
        expect(view.matchedSections.has('general')).toBe(false);
        expect(view.sections.has('general')).toBe(false);
        expect(view.matchedSections.has('performance')).toBe(true);
    });

    it('matches are case-insensitive via the resolver contract (query pre-lowered)', () => {
        // Engine contract: `input.query` is already case-folded by
        // `resolveQuery`. The engine compares strictly against the
        // pre-lowered `*Lower` surfaces on the descriptors, so passing
        // the same folded query twice yields identical results — the
        // case-folding happens once upstream.
        const a = buildMatchView({
            query: 'provider',
            sections: [generalSection()],
            dataset: null
        });
        const b = buildMatchView({
            query: 'provider',
            sections: [generalSection()],
            dataset: null
        });
        expect(a.matchedSections).toEqual(b.matchedSections);
        expect(
            a.sections.get('general')!.rows.get('provider')!.highlights.label
        ).toEqual(
            b.sections.get('general')!.rows.get('provider')!.highlights.label
        );
    });

    it('returns an empty matchedSections when nothing matches', () => {
        const view = buildMatchView({
            query: 'xyzzy-no-match',
            sections: [generalSection(), performanceSection()],
            dataset: null
        });
        expect(view.matchedSections.size).toBe(0);
        expect(view.sections.size).toBe(0);
        expect(view.datasetTree).toBeNull();
    });

    it('skips assistive evaluation when the row has null assistive', () => {
        const view = buildMatchView({
            query: 'provider',
            sections: [generalSection()],
            dataset: null
        });
        const row = view.sections.get('general')!.rows.get('provider')!;
        expect(row.highlights.assistive).toBeUndefined();
    });
});

describe('buildMatchView: Dataset tree (R4)', () => {
    it('field-name match keeps the field and every applicable flag visible', () => {
        // Query arrives already folded via `resolveQuery`.
        const view = buildMatchView({
            query: 'sales',
            sections: [],
            dataset: datasetDescriptor()
        });
        expect(view.datasetTree).not.toBeNull();
        const field = view.datasetTree!.matchedFields.get('Sales Amount')!;
        expect(field.matchReason).toBe('field-name');
        expect(field.visibleFlags.size).toBe(3);
        expect(field.visibleFlags.has('highlight')).toBe(true);
        expect(field.highlights.field).toEqual([{ start: 0, end: 5 }]);
    });

    it('flag-label match keeps only the matching flag with its parent field for context', () => {
        const view = buildMatchView({
            query: 'highlight',
            sections: [],
            dataset: datasetDescriptor()
        });
        // Only Sales Amount has the highlight flag in this fixture.
        const matched = view.datasetTree!.matchedFields;
        expect(matched.has('Sales Amount')).toBe(true);
        expect(matched.has('Revenue')).toBe(false);
        const sales = matched.get('Sales Amount')!;
        expect(sales.matchReason).toBe('flag');
        expect(sales.visibleFlags.size).toBe(1);
        expect(sales.visibleFlags.has('highlight')).toBe(true);
        expect(sales.highlights.flags.get('highlight')!.label).toEqual([
            { start: 0, end: 9 }
        ]);
    });

    it('assistive-only flag match keeps the flag with assistive ranges and no label ranges', () => {
        const view = buildMatchView({
            query: 'cross-highlight',
            sections: [],
            dataset: datasetDescriptor()
        });
        const sales = view.datasetTree!.matchedFields.get('Sales Amount')!;
        expect(sales.matchReason).toBe('flag');
        const hl = sales.highlights.flags.get('highlight')!;
        expect(hl.label).toBeUndefined();
        expect(hl.assistive).toBeDefined();
    });

    it('mix: field-name match for one field and flag match for another', () => {
        const view = buildMatchView({
            query: 'revenue',
            sections: [],
            dataset: datasetDescriptor()
        });
        const matched = view.datasetTree!.matchedFields;
        expect(matched.has('Revenue')).toBe(true);
        expect(matched.get('Revenue')!.matchReason).toBe('field-name');
        expect(matched.has('Sales Amount')).toBe(false);
    });

    it('Dataset heading match exposes every field with every flag', () => {
        const view = buildMatchView({
            query: 'supporting',
            sections: [],
            dataset: datasetDescriptor()
        });
        expect(view.datasetTree!.headingHighlights).not.toBeNull();
        const matched = view.datasetTree!.matchedFields;
        expect(matched.size).toBe(2);
        for (const field of matched.values()) {
            expect(field.matchReason).toBe('field-name');
        }
    });

    it('handles field names containing `/` (the leaf value separator) without issue', () => {
        const withSlash = makeResolvedDataset({
            heading: 'Dataset',
            fields: [
                {
                    name: 'dataset/columns',
                    applicableFlags: [
                        { key: 'format', label: 'Format', assistive: null }
                    ]
                }
            ]
        });
        const view = buildMatchView({
            query: '/columns',
            sections: [],
            dataset: withSlash
        });
        expect(view.datasetTree!.matchedFields.has('dataset/columns')).toBe(
            true
        );
    });

    it('returns an empty datasetTree when no field and no flag matches', () => {
        const view = buildMatchView({
            query: 'nonexistent',
            sections: [],
            dataset: datasetDescriptor()
        });
        expect(view.datasetTree).toBeNull();
    });

    it('surfaces the Dataset section when the heading matches and the field list is empty', () => {
        const emptyDataset = makeResolvedDataset({
            heading: 'Dataset',
            fields: []
        });
        const view = buildMatchView({
            query: 'dataset',
            sections: [],
            dataset: emptyDataset
        });
        expect(view.matchedSections.has('dataset')).toBe(true);
        expect(view.datasetTree).not.toBeNull();
        expect(view.datasetTree!.headingHighlights).not.toBeNull();
        expect(view.datasetTree!.matchedFields.size).toBe(0);
    });
});

describe('buildMatchView: invariants', () => {
    it('adds `dataset` to matchedSections when only a field name matches', () => {
        const view = buildMatchView({
            query: 'sales',
            sections: [generalSection(), performanceSection()],
            dataset: datasetDescriptor()
        });
        expect(view.matchedSections.has('dataset')).toBe(true);
        // No flat section matches "Sales" — only the dataset tree does.
        expect(view.matchedSections.has('general')).toBe(false);
        expect(view.matchedSections.has('performance')).toBe(false);
    });

    it('does not add `dataset` to matchedSections when the dataset tree has no matches', () => {
        const view = buildMatchView({
            query: 'provider',
            sections: [generalSection()],
            dataset: datasetDescriptor()
        });
        expect(view.matchedSections.has('dataset')).toBe(false);
        expect(view.datasetTree).toBeNull();
    });

    it('works when dataset descriptor is null', () => {
        const view = buildMatchView({
            query: 'provider',
            sections: [generalSection()],
            dataset: null
        });
        expect(view.datasetTree).toBeNull();
        expect(view.matchedSections.has('general')).toBe(true);
    });
});
