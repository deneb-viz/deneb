// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('powerbi-visuals-api', () => ({}));

// Echo formatter: output pins (locale, format string, value) so each test can
// assert exactly WHICH format string was applied to WHICH row — the failure
// surface under investigation. Formatting fidelity belongs to the Power BI
// library, not this harness.
vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getValueFormatter: (
        format?: string,
        options?: { cultureSelector?: string }
    ) => ({
        format: (value: unknown) =>
            `[${options?.cultureSelector}|${format}|${value}]`
    })
}));

import {
    buildProcessingPlan,
    buildDataRow
} from '@deneb-viz/data-core/support-fields';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import type { PlanParameterGroup } from '@deneb-viz/data-core/support-fields';
import {
    createPbiSupportFieldProvider,
    getStaticParameterFormatStrings
} from '../support-field-provider';

/**
 * Validation harness: dynamic format string processing.
 *
 * Power BI delivers a measure's dynamic format string per data point in
 * `values[i].objects[rowIndex].general.formatString`, with the column's
 * static `source.format` UNDEFINED. This harness runs DataView shapes that
 * mirror that contract through the real pipeline (buildProcessingPlan →
 * createPbiSupportFieldProvider → buildDataRow) and asserts the __format /
 * __formatted support fields row by row.
 *
 * The 1.x (AppSource) precedence being validated (src/lib/dataset/values.ts
 * on origin/certification): `source.format ?? objects[row].general.formatString`.
 */

const LOCALE = 'en-US';

const MASTER_SETTINGS: SupportFieldMasterSettings = {
    crossHighlightEnabled: false,
    crossFilterEnabled: false
};

const FORMAT_ON: SupportFieldConfiguration[string] = {
    highlight: false,
    highlightStatus: false,
    highlightComparator: false,
    format: true,
    formatted: true
};

/** Per-row dynamic format strings, as Power BI supplies them. */
const DYNAMIC_FORMATS = ['$#,##0', '0.0%', '#,##0.00'];
const SALES_VALUES = [100, 0.5, 1234.56];
const CATEGORY_VALUES = ['A', 'B', 'C'];

/**
 * DataView fragment for one category + one measure. `dynamic: true` mirrors a
 * measure with a dynamic format string (no static source.format, per-row
 * objects); `dynamic: false` mirrors a plain static-format measure.
 */
const makeDataViewFragments = (dynamic: boolean) => {
    const categories = [
        { source: { displayName: 'Category', format: undefined } }
    ] as unknown as powerbi.DataViewCategoryColumn[];
    const values = [
        {
            source: {
                displayName: 'Sales',
                format: dynamic ? undefined : '#,##0.00'
            },
            values: SALES_VALUES,
            objects: dynamic
                ? DYNAMIC_FORMATS.map((f) => ({
                      general: { formatString: f }
                  }))
                : undefined,
            highlights: null
        }
    ] as unknown as powerbi.DataViewValueColumns;
    return { categories, values };
};

const makeProvider = (dynamic: boolean) => {
    const { categories, values } = makeDataViewFragments(dynamic);
    return createPbiSupportFieldProvider({
        categories,
        values,
        hasHighlights: false,
        // baseValues slot 0 = Category (dvCategories[0]), slot 1 = Sales (dvValues[0])
        fieldSourceMappings: [
            { source: 'categories', index: 0 },
            { source: 'values', index: 0 }
        ]
    });
};

const PLAN_FIELDS = [
    { encodedName: 'Category', sourceIndex: 0, role: 'grouping' as const },
    { encodedName: 'Sales', sourceIndex: 0, role: 'aggregation' as const }
];

const buildRows = (
    dynamic: boolean,
    parameterGroups?: PlanParameterGroup[],
    configuration: SupportFieldConfiguration = { Sales: FORMAT_ON }
) => {
    const plan = buildProcessingPlan({
        fields: PLAN_FIELDS,
        configuration,
        masterSettings: MASTER_SETTINGS,
        hasHighlights: false,
        isLegacy: false,
        parameterGroups
    });
    const provider = makeProvider(dynamic);
    return SALES_VALUES.map((_, r) =>
        buildDataRow({
            plan,
            provider,
            baseValues: [CATEGORY_VALUES[r], SALES_VALUES[r]],
            rowIndex: r,
            locale: LOCALE
        })
    );
};

describe('dynamic format string validation harness', () => {
    describe('plain measure (regular field instruction)', () => {
        it('static format: emits the column format string on every row', () => {
            const rows = buildRows(false);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Sales__format']).toBe('#,##0.00');
                expect(rows[r]['Sales__formatted']).toBe(
                    `[${LOCALE}|#,##0.00|${SALES_VALUES[r]}]`
                );
            }
        });

        it('dynamic format: emits the per-row format string from objects[row].general.formatString', () => {
            const rows = buildRows(true);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Sales__format']).toBe(DYNAMIC_FORMATS[r]);
            }
        });

        it('dynamic format: formats each row value with that row format string', () => {
            const rows = buildRows(true);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Sales__formatted']).toBe(
                    `[${LOCALE}|${DYNAMIC_FORMATS[r]}|${SALES_VALUES[r]}]`
                );
            }
        });
    });

    describe('measure consolidated into a field parameter', () => {
        // Groups are wired the way processing.ts wires them:
        // getStaticParameterFormatStrings() pre-resolves ONLY when every
        // component has a static column format; otherwise it returns
        // undefined and buildDataRow resolves per-row via the provider.
        const makeGroup = (
            staticFormats: (string | undefined)[]
        ): PlanParameterGroup[] => [
            {
                parameterName: 'Param',
                componentFieldIndices: [1],
                componentNames: ['Sales'],
                componentRoles: ['aggregation'],
                formatStrings: getStaticParameterFormatStrings(staticFormats)
            }
        ];
        const paramConfig: SupportFieldConfiguration = { Param: FORMAT_ON };

        it('dynamic format: __format carries the per-row format string', () => {
            // Dynamic-format measure → no static column format
            const rows = buildRows(true, makeGroup([undefined]), paramConfig);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Param__format']).toEqual([DYNAMIC_FORMATS[r]]);
            }
        });

        it('dynamic format: __formatted uses the per-row format string', () => {
            const rows = buildRows(true, makeGroup([undefined]), paramConfig);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Param__formatted']).toEqual([
                    `[${LOCALE}|${DYNAMIC_FORMATS[r]}|${SALES_VALUES[r]}]`
                ]);
            }
        });

        it('static format: pre-resolved row-invariant formats are emitted', () => {
            const rows = buildRows(false, makeGroup(['#,##0.00']), paramConfig);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Param__format']).toEqual(['#,##0.00']);
                expect(rows[r]['Param__formatted']).toEqual([
                    `[${LOCALE}|#,##0.00|${SALES_VALUES[r]}]`
                ]);
            }
        });

        it('calc-item scenario: static formats stripped model-wide resolve per-row from objects', () => {
            // When any dynamic-format calculation item exists in the model,
            // Power BI removes static source.format from ALL measure columns
            // and delivers formats per-row via objects — same DataView shape
            // as a dynamic measure, so the per-row fallback covers it.
            const rows = buildRows(true, makeGroup([undefined]), paramConfig);
            for (let r = 0; r < rows.length; r++) {
                expect(rows[r]['Param__format']).toEqual([DYNAMIC_FORMATS[r]]);
            }
        });
    });
});
