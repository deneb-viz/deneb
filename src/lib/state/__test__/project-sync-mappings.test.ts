import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * U3 (audit findings M10/L16) — project sync mappings:
 *
 *  - L16: corrupt persisted `supportFieldConfiguration` JSON degrades
 *    predictably to `{}` but surfaces a DURABLE user-visible warning
 *    (compilation-slice channel) instead of being silently swallowed; a
 *    corrupt `denebMetaVersion` stamp must NOT coerce to 0 (= unversioned
 *    legacy) — it maps to NaN, mirroring the registry's fail-safe
 *    'indeterminate' classification so no migration runs against it.
 *  - M10 (integration): the three-property migration stamp, committed as
 *    ONE app-core store update, arrives at the host as a SINGLE
 *    `persistProjectProperties` call carrying all three serialized
 *    changes.
 */

// ─── Mock Setup ──────────────────────────────────────────────────────────────

let capturedAppCoreSubscriber: (state: Record<string, unknown>) => void;

const mockPersistProjectProperties = vi.fn();
const mockLogDurableWarn = vi.fn();

let mockAppCoreState: Record<string, unknown>;

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => mockAppCoreState),
    useDenebState: {
        subscribe: vi.fn(
            (listener: (state: Record<string, unknown>) => void) => {
                capturedAppCoreSubscriber = listener;
                return vi.fn();
            }
        )
    }
}));

vi.mock('../../../state', () => ({
    useDenebVisualState: {
        subscribe: vi.fn(() => vi.fn()),
        getState: vi.fn(() => ({ settings: mockVisualSettings }))
    }
}));

vi.mock('../../persistence', () => ({
    persistProjectProperties: (...args: unknown[]) =>
        mockPersistProjectProperties(...args),
    isReadModePersistSuppressed: () => false
}));

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn(),
    logError: vi.fn()
}));

import { PROJECT_SYNC_MAPPINGS } from '../project-sync-mappings';
import { createSliceSync } from '../create-slice-sync';
import { isSupportFieldMigrationPending } from '../../persistence/state-management-migration';
import type { VisualFormattingSettingsModel } from '../../../lib/persistence';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const getMapping = (sliceKey: string) => {
    const mapping = PROJECT_SYNC_MAPPINGS.find((m) => m.sliceKey === sliceKey);
    if (!mapping) throw new Error(`No mapping for '${sliceKey}'`);
    return mapping;
};

/**
 * Full visual settings shape covering every getVisualValue accessor in
 * PROJECT_SYNC_MAPPINGS.
 */
const makeVisualSettings = (
    stateManagementOverrides: Record<string, unknown> = {}
) =>
    ({
        vega: {
            output: {
                jsonSpec: { value: 'persistedSpec' },
                jsonConfig: { value: 'persistedConfig' },
                provider: { value: 'vegaLite' },
                version: { value: '6.4.0' },
                renderMode: { value: 'svg' }
            },
            logging: { logLevel: { value: 0 } },
            interactivity: {
                enableTooltips: { value: true },
                enableContextMenu: { value: true },
                enableContextMenuSelector: { value: false },
                enableSelection: { value: false },
                selectionMode: { value: 'simple' },
                enableHighlight: { value: false },
                selectionMaxDataPoints: { value: 50 }
            }
        },
        stateManagement: {
            projectMetadata: {
                supportFieldConfiguration: { value: '' },
                denebMetaVersion: { value: '' },
                scaleToZoom: { value: false },
                consolidateFieldParameters: { value: true },
                ...stateManagementOverrides
            }
        }
    }) as unknown as VisualFormattingSettingsModel;

let mockVisualSettings = makeVisualSettings();

const makeProjectSlice = (overrides: Record<string, unknown> = {}) => ({
    __hasHydrated__: true,
    spec: 'persistedSpec',
    config: 'persistedConfig',
    logLevel: 0,
    provider: 'vegaLite',
    providerVersion: '6.4.0',
    renderMode: 'svg',
    interactivity: {
        tooltip: true,
        contextMenu: true,
        contextMenuSelector: false,
        selection: false,
        selectionMode: 'simple',
        highlight: false,
        dataPointLimit: 50
    },
    supportFieldConfiguration: {},
    denebMetaVersion: 0,
    scaleToZoom: false,
    consolidateFieldParameters: true,
    syncProjectData: vi.fn(),
    ...overrides
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PROJECT_SYNC_MAPPINGS — corrupt persisted values (L16)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVisualSettings = makeVisualSettings();
        mockAppCoreState = {
            project: makeProjectSlice(),
            compilation: { logDurableWarn: mockLogDurableWarn },
            i18n: {
                translate: (key: string, tokens?: unknown[]) =>
                    `${key}[${(tokens ?? []).join(',')}]`
            }
        };
    });

    describe('supportFieldConfiguration', () => {
        it('parses valid persisted JSON', () => {
            const settings = makeVisualSettings({
                supportFieldConfiguration: {
                    value: '{"Sales":{"highlight":true}}'
                }
            });
            expect(
                getMapping('supportFieldConfiguration').getVisualValue(settings)
            ).toEqual({ Sales: { highlight: true } });
            expect(mockLogDurableWarn).not.toHaveBeenCalled();
        });

        it('degrades corrupt JSON to {} and surfaces a durable warning', () => {
            const settings = makeVisualSettings({
                supportFieldConfiguration: { value: '{"Sales":corrupt-a' }
            });
            expect(
                getMapping('supportFieldConfiguration').getVisualValue(settings)
            ).toEqual({});
            expect(mockLogDurableWarn).toHaveBeenCalledTimes(1);
            expect(mockLogDurableWarn).toHaveBeenCalledWith(
                'Text_Warn_Persisted_Property_Unreadable[supportFieldConfiguration]'
            );
        });

        it('surfaces each distinct corrupt value once (dedupe across sync passes)', () => {
            const settings = makeVisualSettings({
                supportFieldConfiguration: { value: '{"Sales":corrupt-b' }
            });
            const mapping = getMapping('supportFieldConfiguration');
            mapping.getVisualValue(settings);
            mapping.getVisualValue(settings);
            mapping.getVisualValue(settings);
            expect(mockLogDurableWarn).toHaveBeenCalledTimes(1);
        });
    });

    describe('denebMetaVersion', () => {
        it('parses a valid stamp', () => {
            const settings = makeVisualSettings({
                denebMetaVersion: { value: '2' }
            });
            expect(
                getMapping('denebMetaVersion').getVisualValue(settings)
            ).toBe(2);
        });

        it('treats an absent stamp as unversioned (0)', () => {
            expect(
                getMapping('denebMetaVersion').getVisualValue(
                    makeVisualSettings()
                )
            ).toBe(0);
        });

        it('maps a corrupt stamp to NaN — never to 0 (legacy) — and surfaces a durable warning', () => {
            const settings = makeVisualSettings({
                denebMetaVersion: { value: 'corrupt-stamp-a' }
            });
            const value =
                getMapping('denebMetaVersion').getVisualValue(settings);
            expect(Number.isNaN(value)).toBe(true);
            expect(value).not.toBe(0);
            expect(mockLogDurableWarn).toHaveBeenCalledWith(
                'Text_Warn_Persisted_Property_Unreadable[denebMetaVersion]'
            );
        });

        it('a corrupt stamp is fail-safe with the registry: the legacy migration is NOT pending', () => {
            const settings = makeVisualSettings({
                denebMetaVersion: { value: 'corrupt-stamp-b' }
            });
            const value = getMapping('denebMetaVersion').getVisualValue(
                settings
            ) as number;
            // Registry-side check with the store-side deserialized value:
            // an indeterminate stamp must never re-run the migration
            // against possibly-migrated state.
            expect(
                isSupportFieldMigrationPending('non-default-spec', value)
            ).toBe(false);
        });
    });
});

describe('project sync — single batched migration persist (M10 integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVisualSettings = makeVisualSettings();
        mockAppCoreState = {
            project: makeProjectSlice(),
            compilation: { logDurableWarn: mockLogDurableWarn },
            i18n: { translate: (key: string) => key }
        };
    });

    it('a three-property migration stamp arrives at the host as ONE persistProjectProperties call', () => {
        createSliceSync({
            name: 'project',
            getSlice: (state) =>
                (state as Record<string, ReturnType<typeof makeProjectSlice>>)
                    .project,
            getSyncFn: (slice) => slice.syncProjectData,
            isHydrated: (slice) => slice.__hasHydrated__ as boolean,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: PROJECT_SYNC_MAPPINGS
        });

        // Simulate the ONE store update emitted by
        // applySupportFieldMigrationStamp: all three properties change in
        // a single new slice reference.
        const migratedConfig = {
            Category: { highlight: true, format: true, formatted: true },
            Sales: { highlight: true, format: true, formatted: true }
        };
        mockAppCoreState = {
            ...mockAppCoreState,
            project: makeProjectSlice({
                supportFieldConfiguration: migratedConfig,
                denebMetaVersion: 2,
                consolidateFieldParameters: false
            })
        };
        capturedAppCoreSubscriber(mockAppCoreState);

        expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);
        const changes = mockPersistProjectProperties.mock.calls[0][0];
        expect(changes).toHaveLength(3);
        expect(changes).toEqual(
            expect.arrayContaining([
                {
                    objectName: 'stateManagement',
                    propertyName: 'supportFieldConfiguration',
                    value: JSON.stringify(migratedConfig)
                },
                {
                    objectName: 'stateManagement',
                    propertyName: 'denebMetaVersion',
                    value: '2'
                },
                {
                    objectName: 'stateManagement',
                    propertyName: 'consolidateFieldParameters',
                    value: false
                }
            ])
        );
    });

    it('does not persist anything when the slice matches the visual values', () => {
        createSliceSync({
            name: 'project',
            getSlice: (state) =>
                (state as Record<string, ReturnType<typeof makeProjectSlice>>)
                    .project,
            getSyncFn: (slice) => slice.syncProjectData,
            isHydrated: (slice) => slice.__hasHydrated__ as boolean,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: PROJECT_SYNC_MAPPINGS
        });

        mockAppCoreState = {
            ...mockAppCoreState,
            project: makeProjectSlice()
        };
        capturedAppCoreSubscriber(mockAppCoreState);

        expect(mockPersistProjectProperties).not.toHaveBeenCalled();
    });
});
