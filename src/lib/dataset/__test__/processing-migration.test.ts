// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * U3 (audit findings M10/M11) — integrity of the one-time legacy
 * support-field migration executed from `getMappedDataset`:
 *
 *  - M10: re-migration (e.g. after a partial-persist split left the config
 *    stamped but the version stamp absent) MERGES existing explicit
 *    entries OVER migrated defaults instead of rebuilding from scratch —
 *    interim user edits survive. All three properties commit through the
 *    single combined store setter (`applySupportFieldMigrationStamp`) so
 *    the sync layer emits ONE batched host persist.
 *  - M11: the stamp commits only AFTER row building succeeds. A throw
 *    during the mapping pass leaves persisted state untouched AND surfaces
 *    a durable (user-visible) error rather than a console-only log.
 *
 * The WHETHER decision and the version stamped are exercised through the
 * REAL migration registry (`../persistence/state-management-migration`)
 * and the real `isLegacySpec` delegate — only the Power BI/data-plumbing
 * modules are mocked.
 */

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn(),
    logError: vi.fn(),
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn()
}));

vi.mock('powerbi-visuals-api', () => ({}));
vi.mock('mergician', () => ({ mergician: vi.fn((a: unknown) => a) }));

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

const mockBuildProcessingPlan = vi.fn(
    (args: { fields: unknown[]; [key: string]: unknown }) => ({
        fields: args.fields,
        emitSelected: false
    })
);
const mockBuildDataRow = vi.fn(() => ({}));
const mockResolveFieldDefaults = vi.fn(
    ({ fieldRole, isLegacy }: { fieldRole: string; isLegacy: boolean }) => ({
        role: fieldRole,
        legacyDefaults: isLegacy
    })
);
vi.mock('@deneb-viz/data-core/support-fields', () => ({
    buildProcessingPlan: (args: never) => mockBuildProcessingPlan(args),
    buildDataRow: () => mockBuildDataRow(),
    resolveFieldDefaults: (args: never) => mockResolveFieldDefaults(args)
}));

vi.mock('../data-view', () => ({
    doesDataViewHaveHighlights: vi.fn(() => false),
    getCategoricalRowCount: vi.fn(() => 2)
}));
vi.mock('../values', () => ({
    getCastedPrimitiveValue: vi.fn((_c: unknown, v: unknown) => v),
    getDatumValueEntriesFromDataview: vi.fn(() => [
        [1, 2],
        [3, 4],
        [5, 6]
    ])
}));

// Columns are swapped per-test via mockColumns.
let mockColumns: unknown[] = [];
vi.mock('../fields', () => ({
    getDatumFieldMetadataFromDataView: vi.fn(() => mockColumns),
    getDatumFieldsFromMetadata: vi.fn(() => ({})),
    getEncodedFieldName: vi.fn((n: string) => n),
    isSourceField: vi.fn(() => true)
}));
vi.mock('../support-field-provider', () => ({
    createPbiSupportFieldProvider: vi.fn(() => ({})),
    buildFieldSourceMappings: vi.fn(() => [])
}));
vi.mock('../field-parameter-detection', () => ({
    detectFieldParameterGroups: vi.fn(() => ({ parameterGroups: {} }))
}));
vi.mock('../../interactivity', () => ({
    InteractivityManager: {
        clearSelectors: vi.fn(),
        addRowSelector: vi.fn(() => ({ status: 'neutral' }))
    },
    isCrossFilterPropSet: vi.fn(() => false),
    isCrossHighlightPropSet: vi.fn(() => false)
}));

// Controllable app-core state: the project slice carries the migration
// inputs; compilation/i18n carry the durable-error channel.
let mockProject: Record<string, unknown>;
const mockApplySupportFieldMigrationStamp = vi.fn();
const mockSetSupportFieldConfiguration = vi.fn();
const mockSetDenebMetaVersion = vi.fn();
const mockSetConsolidateFieldParameters = vi.fn();
const mockLogDurableError = vi.fn();
vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        project: mockProject,
        compilation: { logDurableError: mockLogDurableError },
        i18n: { translate: (key: string) => key }
    }))
}));

import { getMappedDataset } from '../processing';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A spec that differs from the factory default — real project content. */
const LEGACY_SPEC = '{"mark":"bar","genuine":"pre-2.0 project"}';

const column = (
    displayName: string,
    sourceIndex: number,
    isMeasure = false
) => ({
    column: {
        displayName,
        roles: { Values: true },
        isMeasure,
        format: undefined
    },
    source: 'host',
    sourceIndex,
    encodedName: displayName
});

const CATEGORICAL = {
    categories: [{ values: [1, 2] }],
    values: undefined
} as unknown as import('powerbi-visuals-api').default.DataViewCategorical;

const makeProject = (overrides: Record<string, unknown> = {}) => ({
    spec: LEGACY_SPEC,
    denebMetaVersion: 0,
    supportFieldConfiguration: {},
    consolidateFieldParameters: true,
    applySupportFieldMigrationStamp: mockApplySupportFieldMigrationStamp,
    setSupportFieldConfiguration: mockSetSupportFieldConfiguration,
    setDenebMetaVersion: mockSetDenebMetaVersion,
    setConsolidateFieldParameters: mockSetConsolidateFieldParameters,
    ...overrides
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getMappedDataset — legacy support-field migration integrity (U3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBuildDataRow.mockImplementation(() => ({}));
        mockColumns = [column('Category', 0), column('Sales', 0, true)];
        mockProject = makeProject();
    });

    describe('happy path — legacy spec, no prior config (M10)', () => {
        it('commits legacy defaults, registry version and consolidate=false via ONE combined store update', () => {
            const result = getMappedDataset(CATEGORICAL, 'en-US');

            expect(result.rowsLoaded).toBe(2);
            expect(result.values).toHaveLength(2);
            expect(mockApplySupportFieldMigrationStamp).toHaveBeenCalledTimes(
                1
            );
            expect(mockApplySupportFieldMigrationStamp).toHaveBeenCalledWith({
                supportFieldConfiguration: {
                    Category: { role: 'grouping', legacyDefaults: true },
                    Sales: { role: 'aggregation', legacyDefaults: true }
                },
                // Owned by the registry (getStateManagementVersionToStamp),
                // not a raw constant: the first stamped version is 2.
                denebMetaVersion: 2,
                consolidateFieldParameters: false
            });
            // The legacy per-setter calls must NOT fire — they would emit
            // three separate host persists.
            expect(mockSetSupportFieldConfiguration).not.toHaveBeenCalled();
            expect(mockSetDenebMetaVersion).not.toHaveBeenCalled();
            expect(mockSetConsolidateFieldParameters).not.toHaveBeenCalled();
        });

        it('processes the pass with the migrated configuration and legacy semantics', () => {
            getMappedDataset(CATEGORICAL, 'en-US');

            expect(mockBuildProcessingPlan).toHaveBeenCalledWith(
                expect.objectContaining({
                    isLegacy: true,
                    configuration: {
                        Category: { role: 'grouping', legacyDefaults: true },
                        Sales: { role: 'aggregation', legacyDefaults: true }
                    }
                })
            );
        });
    });

    describe('M10 — partial-persist split (config stamped, version absent) with interim user edits', () => {
        const USER_EDIT_CATEGORY = {
            highlight: false,
            format: true,
            formatted: false
        };
        const USER_EDIT_SALES = {
            highlight: true,
            format: false,
            formatted: true
        };

        beforeEach(() => {
            mockColumns = [
                column('Category', 0),
                column('Sales', 0, true),
                column('Margin', 1, true)
            ];
            mockProject = makeProject({
                denebMetaVersion: 0,
                supportFieldConfiguration: {
                    Category: USER_EDIT_CATEGORY,
                    Sales: USER_EDIT_SALES
                }
            });
        });

        it('preserves interim user edits: existing entries win over migrated defaults', () => {
            getMappedDataset(CATEGORICAL, 'en-US');

            expect(mockApplySupportFieldMigrationStamp).toHaveBeenCalledTimes(
                1
            );
            const stamp = mockApplySupportFieldMigrationStamp.mock.calls[0][0];
            expect(stamp.supportFieldConfiguration.Category).toEqual(
                USER_EDIT_CATEGORY
            );
            expect(stamp.supportFieldConfiguration.Sales).toEqual(
                USER_EDIT_SALES
            );
            expect(stamp.denebMetaVersion).toBe(2);
        });

        it('treats a non-empty persisted configuration as non-legacy evidence: unconfigured fields get new-spec defaults', () => {
            getMappedDataset(CATEGORICAL, 'en-US');

            // The newly-seen field resolves defaults with isLegacy: false.
            expect(mockResolveFieldDefaults).toHaveBeenCalledWith(
                expect.objectContaining({ isLegacy: false })
            );
            expect(mockResolveFieldDefaults).not.toHaveBeenCalledWith(
                expect.objectContaining({ isLegacy: true })
            );
            const stamp = mockApplySupportFieldMigrationStamp.mock.calls[0][0];
            expect(stamp.supportFieldConfiguration.Margin).toEqual({
                role: 'aggregation',
                legacyDefaults: false
            });
            // The processing plan for the pass is also non-legacy.
            expect(mockBuildProcessingPlan).toHaveBeenCalledWith(
                expect.objectContaining({ isLegacy: false })
            );
        });
    });

    describe('M11 — transactional commit + durable error', () => {
        it('does NOT commit the migration stamp when row building throws, and surfaces a durable error', () => {
            mockBuildDataRow.mockImplementation(() => {
                throw new TypeError(
                    'Cannot read properties of undefined (mixed highlights)'
                );
            });

            const result = getMappedDataset(CATEGORICAL, 'en-US');

            // Empty dataset returned; no half-committed migration state.
            expect(result.values).toHaveLength(0);
            expect(result.rowsLoaded).toBe(0);
            expect(mockApplySupportFieldMigrationStamp).not.toHaveBeenCalled();
            expect(mockSetSupportFieldConfiguration).not.toHaveBeenCalled();
            expect(mockSetDenebMetaVersion).not.toHaveBeenCalled();
            expect(mockSetConsolidateFieldParameters).not.toHaveBeenCalled();

            // Durable, user-visible signal — generic localized message,
            // no raw exception text echoed.
            expect(mockLogDurableError).toHaveBeenCalledTimes(1);
            expect(mockLogDurableError).toHaveBeenCalledWith(
                'Text_Error_Dataset_Mapping_Failed'
            );
        });

        it('surfaces a durable error for mapping failures on non-legacy specs too', () => {
            mockProject = makeProject({ denebMetaVersion: 2 });
            mockBuildDataRow.mockImplementation(() => {
                throw new Error('boom');
            });

            const result = getMappedDataset(CATEGORICAL, 'en-US');

            expect(result.values).toHaveLength(0);
            expect(mockLogDurableError).toHaveBeenCalledWith(
                'Text_Error_Dataset_Mapping_Failed'
            );
        });
    });

    describe('no-op cases', () => {
        it('does not run the migration for an already-stamped payload', () => {
            mockProject = makeProject({ denebMetaVersion: 2 });

            getMappedDataset(CATEGORICAL, 'en-US');

            expect(mockApplySupportFieldMigrationStamp).not.toHaveBeenCalled();
            expect(mockBuildProcessingPlan).toHaveBeenCalledWith(
                expect.objectContaining({ isLegacy: false })
            );
        });

        it('does not run the migration for a fresh visual (factory-default spec)', async () => {
            const { PROJECT_DEFAULTS } =
                await import('@deneb-viz/configuration');
            mockProject = makeProject({
                spec: PROJECT_DEFAULTS.spec,
                denebMetaVersion: 0
            });

            getMappedDataset(CATEGORICAL, 'en-US');

            expect(mockApplySupportFieldMigrationStamp).not.toHaveBeenCalled();
        });
    });
});
