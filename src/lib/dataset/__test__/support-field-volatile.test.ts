// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@deneb-viz/utils/logging', () => ({
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn(),
    logDebug: vi.fn()
}));

vi.mock('powerbi-visuals-api', () => ({}));

// Mock all deep imports that processing.ts pulls in so we can isolate
// hasDataViewChanged without needing a full Power BI environment.
vi.mock('../drilldown', () => ({
    isDrilldownFeatureEnabled: vi.fn(() => false),
    resolveDrilldownComponents: vi.fn(),
    resolveDrilldownFlat: vi.fn()
}));
vi.mock('@deneb-viz/data-core/dataset', () => ({
    DATASET_DEFAULT_NAME: 'Values'
}));
vi.mock('@deneb-viz/data-core/field', () => ({
    DRILL_FIELD_FLAT: '__drillFlat__',
    DRILL_FIELD_NAME: '__drill__',
    ROW_INDEX_FIELD_NAME: '__row__'
}));
vi.mock('@deneb-viz/data-core/value', () => ({}));
vi.mock('@deneb-viz/data-core/support-fields', () => ({
    buildProcessingPlan: vi.fn(),
    buildDataRow: vi.fn(),
    resolveFieldDefaults: vi.fn()
}));
vi.mock('../data-view', () => ({
    doesDataViewHaveHighlights: vi.fn(() => false),
    getCategoricalRowCount: vi.fn(() => 0)
}));
vi.mock('../values', () => ({
    getCastedPrimitiveValue: vi.fn(),
    getDatumValueEntriesFromDataview: vi.fn(() => [])
}));
vi.mock('../fields', () => ({
    getDatumFieldMetadataFromDataView: vi.fn(() => []),
    getDatumFieldsFromMetadata: vi.fn(() => ({})),
    getEncodedFieldName: vi.fn((n: string) => n),
    isSourceField: vi.fn(() => true)
}));
vi.mock('../support-field-provider', () => ({
    createPbiSupportFieldProvider: vi.fn()
}));
vi.mock('../support-field-migration', () => ({
    isLegacySpec: vi.fn(() => false)
}));
vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        project: {
            spec: '{}',
            supportFieldConfiguration: {},
            setSupportFieldConfiguration: vi.fn(),
            setDenebMetaVersion: vi.fn(),
            denebMetaVersion: 2
        }
    }))
}));
vi.mock('../../interactivity', () => ({
    InteractivityManager: { clearSelectors: vi.fn(), addRowSelector: vi.fn() },
    isCrossFilterPropSet: vi.fn(() => false),
    isCrossHighlightPropSet: vi.fn(() => false)
}));
vi.mock('mergician', () => ({ mergician: vi.fn((a: unknown) => a) }));

import { hasDataViewChanged } from '../processing';
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeConfig = (
    overrides: Partial<SupportFieldConfiguration> = {}
): SupportFieldConfiguration => ({ ...overrides });

const CONFIG_EMPTY: SupportFieldConfiguration = {};

const CONFIG_A: SupportFieldConfiguration = {
    Amount: {
        highlight: true,
        highlightStatus: false,
        highlightComparator: false,
        format: false,
        formatted: false
    }
};

const CONFIG_B: SupportFieldConfiguration = {
    Amount: {
        highlight: false,
        highlightStatus: true,
        highlightComparator: true,
        format: true,
        formatted: true
    }
};

/** A stable categorical reference used when we want other params to stay constant. */
const STABLE_CATEGORICAL = {
    categories: [],
    values: []
} as unknown as import('powerbi-visuals-api').default.DataViewCategorical;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hasDataViewChanged — supportFieldConfiguration detection', () => {
    /**
     * Reset module-level state before each test by calling hasDataViewChanged
     * with known "initial" values so every test starts from a clean baseline.
     * We use CONFIG_EMPTY as the known initial config so later tests can
     * transition away from it.
     */
    beforeEach(() => {
        // Prime the module state: first call sets prevConsolidateFieldParameters,
        // second call sets prevSupportFieldConfiguration, third stabilizes.
        hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
        hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
        hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
    });

    it('returns false when supportFieldConfiguration is the same object reference', () => {
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
        expect(result).toBe(false);
    });

    it('returns false when supportFieldConfiguration has the same content but is a new object', () => {
        const copy = makeConfig();
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            copy,
            true
        );
        expect(result).toBe(false);
    });

    it('returns true when config goes from empty {} to having entries', () => {
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_A,
            true
        );
        expect(result).toBe(true);
    });

    it('returns true when config entries change values between calls', () => {
        hasDataViewChanged(STABLE_CATEGORICAL, false, false, CONFIG_A, true);
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_B,
            true
        );
        expect(result).toBe(true);
    });

    it('returns false on a repeated call with the same non-empty config', () => {
        hasDataViewChanged(STABLE_CATEGORICAL, false, false, CONFIG_A, true);
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_A,
            true
        );
        expect(result).toBe(false);
    });

    it('returns true when config changes even though categorical, enableSelection, enableHighlight remain the same', () => {
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_A,
            true
        );
        expect(result).toBe(true);
    });

    it('returns true when going from a non-empty config back to an empty config', () => {
        hasDataViewChanged(STABLE_CATEGORICAL, false, false, CONFIG_A, true);
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
        expect(result).toBe(true);
    });

    it('returns true when a new field key is added to an existing config', () => {
        hasDataViewChanged(STABLE_CATEGORICAL, false, false, CONFIG_A, true);
        const extended: SupportFieldConfiguration = {
            ...CONFIG_A,
            Revenue: {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: true
            }
        };
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            extended,
            true
        );
        expect(result).toBe(true);
    });

    it('returns true when consolidateFieldParameters changes', () => {
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            false
        );
        expect(result).toBe(true);
    });

    it('returns false when consolidateFieldParameters stays the same', () => {
        const result = hasDataViewChanged(
            STABLE_CATEGORICAL,
            false,
            false,
            CONFIG_EMPTY,
            true
        );
        expect(result).toBe(false);
    });
});
