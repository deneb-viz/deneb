// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn(),
    logError: vi.fn(),
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn()
}));

vi.mock('powerbi-visuals-api', () => ({}));

vi.mock('@deneb-viz/configuration', () => ({
    PROJECT_DEFAULTS: {
        spec: '{"$schema":"...","mark":"bar"}'
    }
}));

vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getFormattedValue: vi.fn((value: unknown) => String(value))
}));

vi.mock('../drilldown', () => ({
    isDrilldownFeatureEnabled: vi.fn(() => false),
    resolveDrilldownComponents: vi.fn(),
    resolveDrilldownFlat: vi.fn()
}));

// Behaviour-accurate stubs — the real module pulls in ../persistence,
// which needs a full Power BI environment.
vi.mock('../data-view', () => ({
    doesDataViewHaveHighlights: vi.fn(
        (values: { highlights?: unknown }[]) =>
            values?.filter((v) => v.highlights).length > 0
    ),
    getCategoricalRowCount: vi.fn(
        (categorical: {
            categories?: { values: unknown[] }[];
            values?: { values: unknown[] }[];
        }) =>
            categorical?.categories?.[0]?.values?.length ||
            categorical?.values?.[0]?.values?.length ||
            0
    )
}));

vi.mock('../../interactivity', () => ({
    InteractivityManager: {
        clearSelectors: vi.fn(),
        addRowSelector: vi.fn(() => undefined)
    },
    isCrossFilterPropSet: vi.fn(() => false),
    isCrossHighlightPropSet: vi.fn(() => false)
}));

/**
 * Mutable backing store for the mocked Deneb state. `getDenebState` copies
 * the current values into a fresh object per call, mirroring Zustand's
 * snapshot semantics: a captured `state` reference does NOT observe writes
 * made by the setters after capture — which is exactly the condition that
 * produced audit finding H3.
 */
const mockProject = vi.hoisted(() => ({
    spec: '',
    denebMetaVersion: 0,
    supportFieldConfiguration: undefined as object | undefined,
    consolidateFieldParameters: undefined as boolean | undefined
}));

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        project: {
            spec: mockProject.spec,
            denebMetaVersion: mockProject.denebMetaVersion,
            supportFieldConfiguration: mockProject.supportFieldConfiguration,
            consolidateFieldParameters:
                mockProject.consolidateFieldParameters,
            setSupportFieldConfiguration: vi.fn((config: object) => {
                mockProject.supportFieldConfiguration = config;
            }),
            setDenebMetaVersion: vi.fn((version: number) => {
                mockProject.denebMetaVersion = version;
            }),
            setConsolidateFieldParameters: vi.fn((value: boolean) => {
                mockProject.consolidateFieldParameters = value;
            })
        }
    }))
}));

import powerbi from 'powerbi-visuals-api';
import { getMappedDataset } from '../processing';
import { TEMPLATE_USERMETA_VERSION } from '@deneb-viz/template-usermeta';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CUSTOM_SPEC = '{"$schema":"...","mark":"line","encoding":{}}';
const LOCALE = 'en-US';

/**
 * Build a category column carrying the dataset role, optionally flagged as a
 * component of a field parameter.
 */
const makeCategoryColumn = (
    displayName: string,
    values: string[],
    index: number,
    parameterName?: string
) =>
    ({
        source: {
            displayName,
            queryName: `Table.${displayName}`,
            roles: { dataset: true },
            type: { text: true },
            index,
            ...(parameterName
                ? { sourceFieldParameters: [{ displayName: parameterName }] }
                : {})
        },
        values
    }) as unknown as powerbi.DataViewCategoryColumn;

/** Two grouping fields that belong to the same field parameter. */
const makeParameterCategorical = () =>
    ({
        categories: [
            makeCategoryColumn(
                'Country Code',
                ['CA', 'US'],
                0,
                'Dynamic Category'
            ),
            makeCategoryColumn(
                'Segment',
                ['Gov', 'Retail'],
                1,
                'Dynamic Category'
            )
        ]
    }) as unknown as powerbi.DataViewCategorical;

/** Two plain grouping fields with no field parameter involvement. */
const makePlainCategorical = () =>
    ({
        categories: [
            makeCategoryColumn('Country Code', ['CA', 'US'], 0),
            makeCategoryColumn('Segment', ['Gov', 'Retail'], 1)
        ]
    }) as unknown as powerbi.DataViewCategorical;

const setProjectState = (overrides: Partial<typeof mockProject>) => {
    mockProject.spec = overrides.spec ?? '';
    mockProject.denebMetaVersion = overrides.denebMetaVersion ?? 0;
    mockProject.supportFieldConfiguration =
        overrides.supportFieldConfiguration;
    mockProject.consolidateFieldParameters =
        overrides.consolidateFieldParameters;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getMappedDataset — legacy migration vs field parameter consolidation (H3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('produces flat component fields (not consolidated arrays) on the same pass that migrates a legacy spec with field parameters', () => {
        // Pre-2.0 project: metaVersion never stamped, no support field
        // config, no consolidation preference persisted.
        setProjectState({
            spec: CUSTOM_SPEC,
            denebMetaVersion: 0,
            supportFieldConfiguration: undefined,
            consolidateFieldParameters: undefined
        });

        const result = getMappedDataset(makeParameterCategorical(), LOCALE);

        expect(result.rowsLoaded).toBe(2);
        // Flat component field names, exactly as pre-2.0 rendered them
        expect(result.values[0]['Country Code']).toBe('CA');
        expect(result.values[0]['Segment']).toBe('Gov');
        expect(result.values[1]['Country Code']).toBe('US');
        expect(result.values[1]['Segment']).toBe('Retail');
        // No consolidated parameter array in the rows or fields
        expect(result.values[0]['Dynamic Category']).toBeUndefined();
        expect(result.fields['Dynamic Category']).toBeUndefined();
        expect(result.fields['Country Code']?.isSupportField).toBeUndefined();
        expect(result.fields['Segment']?.isSupportField).toBeUndefined();
        // Migration stamped the store for subsequent passes
        expect(mockProject.denebMetaVersion).toBe(TEMPLATE_USERMETA_VERSION);
        expect(mockProject.consolidateFieldParameters).toBe(false);
        expect(mockProject.supportFieldConfiguration).toHaveProperty(
            'Country Code'
        );
        expect(mockProject.supportFieldConfiguration).toHaveProperty(
            'Segment'
        );
    });

    it('produces the flat shape on every pass in read mode, where persistence is suppressed and the migration re-runs each time', () => {
        const runPassWithStaleInboundState = () => {
            // Persistence suppressed: each update re-delivers the stale
            // pre-migration values, so the migration re-runs every pass.
            setProjectState({
                spec: CUSTOM_SPEC,
                denebMetaVersion: 0,
                supportFieldConfiguration: undefined,
                consolidateFieldParameters: true
            });
            return getMappedDataset(makeParameterCategorical(), LOCALE);
        };

        const first = runPassWithStaleInboundState();
        const second = runPassWithStaleInboundState();

        for (const result of [first, second]) {
            expect(result.values[0]['Country Code']).toBe('CA');
            expect(result.values[0]['Segment']).toBe('Gov');
            expect(result.values[0]['Dynamic Category']).toBeUndefined();
            expect(result.fields['Dynamic Category']).toBeUndefined();
        }
    });

    it('still consolidates field parameters for a non-legacy spec with consolidateFieldParameters=true', () => {
        setProjectState({
            spec: CUSTOM_SPEC,
            denebMetaVersion: TEMPLATE_USERMETA_VERSION,
            supportFieldConfiguration: {},
            consolidateFieldParameters: true
        });

        const result = getMappedDataset(makeParameterCategorical(), LOCALE);

        expect(result.rowsLoaded).toBe(2);
        // Consolidated parameter arrays in the rows
        expect(result.values[0]['Dynamic Category']).toEqual(['CA', 'Gov']);
        expect(result.values[1]['Dynamic Category']).toEqual([
            'US',
            'Retail'
        ]);
        // Parameter registered as a dataset field; components hidden
        expect(result.fields['Dynamic Category']?.role).toBe(
            'field-parameter'
        );
        expect(result.fields['Country Code']?.isSupportField).toBe(true);
        expect(result.fields['Segment']?.isSupportField).toBe(true);
        // No migration side effects
        expect(mockProject.denebMetaVersion).toBe(TEMPLATE_USERMETA_VERSION);
        expect(mockProject.consolidateFieldParameters).toBe(true);
    });

    it('migrates a legacy spec without field parameters and leaves the row shape unchanged', () => {
        setProjectState({
            spec: CUSTOM_SPEC,
            denebMetaVersion: 0,
            supportFieldConfiguration: undefined,
            consolidateFieldParameters: undefined
        });

        const result = getMappedDataset(makePlainCategorical(), LOCALE);

        expect(result.rowsLoaded).toBe(2);
        expect(result.values[0]['Country Code']).toBe('CA');
        expect(result.values[0]['Segment']).toBe('Gov');
        expect(result.values[1]['Country Code']).toBe('US');
        expect(result.values[1]['Segment']).toBe('Retail');
        // Migration stamped the store even though no parameters exist
        expect(mockProject.denebMetaVersion).toBe(TEMPLATE_USERMETA_VERSION);
        expect(mockProject.consolidateFieldParameters).toBe(false);
        expect(mockProject.supportFieldConfiguration).toHaveProperty(
            'Country Code'
        );
        expect(mockProject.supportFieldConfiguration).toHaveProperty(
            'Segment'
        );
    });
});
