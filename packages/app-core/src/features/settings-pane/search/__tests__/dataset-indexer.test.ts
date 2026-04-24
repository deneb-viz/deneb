import { describe, expect, it, vi } from 'vitest';

import type { DatasetField } from '@deneb-viz/data-core/field';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';

import {
    buildResolvedDatasetDescriptor,
    type SourceFieldEntry
} from '../dataset-indexer';
import {
    FLAG_INFO,
    FLAG_LABELS
} from '../../components/dataset-settings-utils';

/**
 * Identity translator: returns the key back. Keeps assertions on the
 * resolver's translation plumbing legible without pulling real i18n
 * resources into the test.
 */
const identityTranslate = (key: string): string => key;

const makeEntry = (name: string, field: DatasetField): SourceFieldEntry =>
    [name, field] as const;

const defaultMasterSettings: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: true
};

describe('buildResolvedDatasetDescriptor', () => {
    it('produces one entry per source field with its full applicable-flag set when consolidation is on and highlight is enabled', () => {
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Sales', { role: 'aggregation' }),
            makeEntry('Profit', { role: 'aggregation' }),
            makeEntry('Category', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        expect(descriptor.sectionId).toBe('dataset');
        expect(descriptor.heading).toBe('Text_Settings_Dataset');
        expect(descriptor.fields).toHaveLength(3);

        // Measures (highlight on, consolidation on, non-parameter): measure
        // flags + treatAsParameter.
        const sales = descriptor.fields[0];
        expect(sales.name).toBe('Sales');
        expect(sales.applicableFlags.map((f) => f.key)).toEqual([
            'highlight',
            'highlightStatus',
            'highlightComparator',
            'format',
            'formatted',
            'treatAsParameter'
        ]);

        const profit = descriptor.fields[1];
        expect(profit.applicableFlags.map((f) => f.key)).toEqual([
            'highlight',
            'highlightStatus',
            'highlightComparator',
            'format',
            'formatted',
            'treatAsParameter'
        ]);

        // Column (consolidation on, non-parameter): column flags +
        // treatAsParameter.
        const category = descriptor.fields[2];
        expect(category.applicableFlags.map((f) => f.key)).toEqual([
            'format',
            'formatted',
            'treatAsParameter'
        ]);
    });

    it('omits treatAsParameter and names from applicable flags when consolidateFieldParameters is false', () => {
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Sales', { role: 'aggregation' }),
            makeEntry('Category', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: false,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        for (const field of descriptor.fields) {
            const keys = field.applicableFlags.map((f) => f.key);
            expect(keys).not.toContain('treatAsParameter');
            expect(keys).not.toContain('names');
        }
    });

    it('includes the names flag for a field-parameter field when treatAsParameter is implicitly true (role=field-parameter)', () => {
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Measures', { role: 'field-parameter' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        const keys = descriptor.fields[0].applicableFlags.map((f) => f.key);
        expect(keys).toContain('names');
        // Field-parameter that's already a parameter should NOT re-offer
        // treatAsParameter.
        expect(keys).not.toContain('treatAsParameter');
    });

    it('includes the names flag when an explicit config marks a non-parameter field with treatAsParameter=true', () => {
        const config: SupportFieldConfiguration = {
            Category: {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false,
                treatAsParameter: true
            }
        };

        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Category', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config,
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        const keys = descriptor.fields[0].applicableFlags.map((f) => f.key);
        expect(keys).toContain('names');
        expect(keys).toContain('treatAsParameter');
    });

    it('returns a descriptor with zero fields when no source fields are supplied', () => {
        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields: [],
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        expect(descriptor.sectionId).toBe('dataset');
        expect(descriptor.heading).toBe('Text_Settings_Dataset');
        expect(descriptor.fields).toEqual([]);
    });

    it('preserves Unicode field names verbatim', () => {
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('売上', { role: 'aggregation' }),
            makeEntry('日付', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: false,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        expect(descriptor.fields.map((f) => f.name)).toEqual(['売上', '日付']);
    });

    it('populates pre-lowered `*Lower` fields on every surface', () => {
        // The P2 #3 refactor exposes pre-folded counterpart fields so
        // the match engine can compare without re-folding on every
        // keystroke. This test locks in the invariant that the
        // indexer is the single point of truth for the folding.
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Sales Amount', { role: 'aggregation' }),
            makeEntry('Category', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: (key) => `T:${key}`,
            headingKey: 'Text_Settings_Dataset'
        });

        // Section heading.
        expect(descriptor.headingLower).toBe(descriptor.heading.toLowerCase());
        expect(descriptor.headingLower).toBe('t:text_settings_dataset');

        // Every field carries a pre-lowered name alongside the original.
        for (const field of descriptor.fields) {
            expect(field.nameLower).toBe(field.name.toLowerCase());
            // Flag labels + assistive text too.
            for (const flag of field.applicableFlags) {
                expect(flag.labelLower).toBe(flag.label.toLowerCase());
                if (flag.assistive !== null) {
                    expect(flag.assistiveLower).toBe(
                        flag.assistive.toLowerCase()
                    );
                } else {
                    expect(flag.assistiveLower).toBeNull();
                }
            }
        }

        // Spot check one specific field.
        const sales = descriptor.fields.find((f) => f.name === 'Sales Amount')!;
        expect(sales.nameLower).toBe('sales amount');
    });

    it('routes every flag label through translate(FLAG_LABELS[key]) and assistive text through translate(FLAG_INFO[key])', () => {
        const translate = vi.fn((key: string) => `[${key}]`);
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Sales', { role: 'aggregation' }),
            makeEntry('Category', { role: 'grouping' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: {},
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: false,
            translate,
            headingKey: 'Text_Settings_Dataset'
        });

        // Heading is resolved through translate.
        expect(descriptor.heading).toBe('[Text_Settings_Dataset]');
        expect(translate).toHaveBeenCalledWith('Text_Settings_Dataset');

        for (const field of descriptor.fields) {
            for (const flag of field.applicableFlags) {
                expect(flag.label).toBe(`[${FLAG_LABELS[flag.key]}]`);
                const infoKey = FLAG_INFO[flag.key];
                if (infoKey) {
                    expect(flag.assistive).toBe(`[${infoKey}]`);
                } else {
                    expect(flag.assistive).toBeNull();
                }
            }
        }
    });

    it('uses explicit config flags when present (no defaults fallback)', () => {
        const config: SupportFieldConfiguration = {
            Sales: {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false,
                treatAsParameter: true
            }
        };
        const sourceFields: SourceFieldEntry[] = [
            makeEntry('Sales', { role: 'aggregation' })
        ];

        const descriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config,
            masterSettings: defaultMasterSettings,
            isLegacy: false,
            highlightEnabled: true,
            consolidateFieldParameters: true,
            translate: identityTranslate,
            headingKey: 'Text_Settings_Dataset'
        });

        // treatAsParameter=true → parameter → names is applicable; an
        // aggregation already offering treatAsParameter should NOT repeat
        // it (matches dataset-settings render logic).
        const keys = descriptor.fields[0].applicableFlags.map((f) => f.key);
        expect(keys).toContain('names');
    });
});
