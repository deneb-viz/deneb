import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSliceSync } from '../create-slice-sync';
import { PENDING_PERSIST_TIMEOUT_MS } from '../sync-types';
import type { SliceSyncConfig, SliceSyncMapping } from '../sync-types';
import { useDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../../state';

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Captured subscriber functions for manual invocation
let capturedVisualSubscriber: (args: {
    settings: Record<string, unknown>;
    hasInitialSettingsLoaded: boolean;
}) => void;
let capturedAppCoreSubscriber: (state: Record<string, unknown>) => void;

const mockPersistProjectProperties = vi.fn();

// Default the read-mode persist gate to inactive so existing slice-sync
// tests run as if the visual is in edit mode. The read-mode-suppression
// branch is exercised by a dedicated test below.
let mockIsReadModePersistSuppressed = false;

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => mockAppCoreState),
    useDenebState: {
        subscribe: vi.fn(
            (listener: (state: Record<string, unknown>) => void) => {
                capturedAppCoreSubscriber = listener;
                return vi.fn(); // unsubscribe
            }
        )
    }
}));

vi.mock('../../../state', () => ({
    useDenebVisualState: {
        subscribe: vi.fn(
            (
                _selector: unknown,
                listener: (args: {
                    settings: Record<string, unknown>;
                    hasInitialSettingsLoaded: boolean;
                }) => void
            ) => {
                capturedVisualSubscriber = listener;
                return vi.fn(); // unsubscribe
            }
        ),
        getState: vi.fn(() => ({
            settings: mockVisualSettings
        }))
    }
}));

vi.mock('../../persistence', () => ({
    persistProjectProperties: (...args: unknown[]) =>
        mockPersistProjectProperties(...args),
    isReadModePersistSuppressed: () => mockIsReadModePersistSuppressed
}));

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn()
}));

// ─── Test State ──────────────────────────────────────────────────────────────

type TestSlice = {
    __hasHydrated__: boolean;
    spec: string;
    config: string;
    fontSize: number;
    interactivity: { tooltip: boolean };
    // Deserialized-object value (nested per-field config), mirroring
    // supportFieldConfiguration. Optional so existing fixtures are unaffected.
    supportConfig?: Record<string, unknown>;
    syncData: (payload: Partial<TestSlice>) => void;
};

type TestSliceKey =
    | 'spec'
    | 'config'
    | 'fontSize'
    | 'interactivity'
    | 'supportConfig';

let mockAppCoreState: Record<string, unknown>;
let mockVisualSettings: Record<string, unknown>;
let mockSyncFn: ReturnType<typeof vi.fn>;

const DEFAULT_SLICE: TestSlice = {
    __hasHydrated__: false,
    spec: '{"data":{}}',
    config: '{}',
    fontSize: 14,
    interactivity: { tooltip: true },
    syncData: vi.fn()
};

const DEFAULT_VISUAL_SETTINGS = {
    vega: {
        spec: '{"data":{}}',
        config: '{}',
        fontSize: 14
    },
    interactivity: { tooltip: true }
};

// ─── Test Mappings ───────────────────────────────────────────────────────────

const TEST_MAPPINGS: SliceSyncMapping<TestSliceKey>[] = [
    {
        sliceKey: 'spec',
        getVisualValue: (s: Record<string, unknown>) =>
            (s as typeof DEFAULT_VISUAL_SETTINGS).vega.spec,
        persistence: { objectName: 'vega', propertyName: 'jsonSpec' }
    },
    {
        sliceKey: 'config',
        getVisualValue: (s: Record<string, unknown>) =>
            (s as typeof DEFAULT_VISUAL_SETTINGS).vega.config,
        persistence: { objectName: 'vega', propertyName: 'jsonConfig' }
    },
    {
        sliceKey: 'fontSize',
        getVisualValue: (s: Record<string, unknown>) =>
            (s as typeof DEFAULT_VISUAL_SETTINGS).vega.fontSize,
        persistence: { objectName: 'editor', propertyName: 'fontSize' },
        serializeForPersistence: (value) => String(value)
    },
    {
        // Read-only mapping — no persistence, no pending tracking
        sliceKey: 'interactivity',
        getVisualValue: (s: Record<string, unknown>) =>
            (s as typeof DEFAULT_VISUAL_SETTINGS).interactivity
    }
];

// Deserialized-object mapping: getVisualValue returns a FRESH object on every
// call (JSON.parse), exactly like supportFieldConfiguration. shallowEqual
// always reports a change for such values (new nested references); only
// deepEqual detects content-equality.
const OBJECT_MAPPING: SliceSyncMapping<TestSliceKey> = {
    sliceKey: 'supportConfig',
    getVisualValue: (s: Record<string, unknown>) =>
        JSON.parse(
            (s as { vega: { supportConfigRaw: string } }).vega.supportConfigRaw
        ),
    persistence: {
        objectName: 'stateManagement',
        propertyName: 'supportFieldConfiguration'
    },
    serializeForPersistence: (value) => JSON.stringify(value)
};

const CROSS_PROPERTY_MAPPINGS: SliceSyncMapping<TestSliceKey>[] = [
    {
        sliceKey: 'spec',
        getVisualValue: (s: Record<string, unknown>) =>
            (s as typeof DEFAULT_VISUAL_SETTINGS).vega.spec,
        persistence: { objectName: 'vega', propertyName: 'jsonSpec' },
        onPersist: (value, _settings) => {
            if (value === 'vegaLite') {
                return [
                    {
                        objectName: 'vega',
                        propertyName: 'selectionMode',
                        value: 'simple'
                    }
                ];
            }
            return [];
        }
    }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createTestConfig = (
    overrides: Partial<{
        mappings: SliceSyncMapping<TestSliceKey>[];
    }> = {}
): SliceSyncConfig<TestSlice, TestSliceKey, Partial<TestSlice>> => ({
    name: 'test',
    getSlice: (state) => (state as { test: TestSlice }).test,
    getSyncFn: () => mockSyncFn,
    isHydrated: (slice) => slice.__hasHydrated__,
    getSliceValue: (slice, key) => slice[key],
    mappings: overrides.mappings ?? TEST_MAPPINGS
});

const createSliceState = (overrides: Partial<TestSlice> = {}): TestSlice => ({
    ...DEFAULT_SLICE,
    ...overrides
});

const fireVisualSubscriber = (
    settings: Record<string, unknown>,
    hasInitialSettingsLoaded = true
) => {
    capturedVisualSubscriber({ settings, hasInitialSettingsLoaded });
};

const fireAppCoreSubscriber = (slice: TestSlice) => {
    mockAppCoreState = { test: slice };
    capturedAppCoreSubscriber(mockAppCoreState);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createSliceSync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockSyncFn = vi.fn();
        mockVisualSettings = { ...DEFAULT_VISUAL_SETTINGS };
        mockAppCoreState = {
            test: createSliceState()
        };
        // Read-mode persist gate defaults to inactive (edit-mode
        // behavior). The dedicated read-mode test flips this and
        // relies on beforeEach to reset it between tests.
        mockIsReadModePersistSuppressed = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Visual → App-Core (inbound sync)', () => {
        it('should skip sync when initial settings have not loaded', () => {
            createSliceSync(createTestConfig());

            fireVisualSubscriber(DEFAULT_VISUAL_SETTINGS, false);

            expect(mockSyncFn).not.toHaveBeenCalled();
        });

        it('should sync all values on first hydration regardless of equality', () => {
            const slice = createSliceState({ __hasHydrated__: false });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            fireVisualSubscriber(DEFAULT_VISUAL_SETTINGS);

            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    spec: DEFAULT_VISUAL_SETTINGS.vega.spec,
                    config: DEFAULT_VISUAL_SETTINGS.vega.config,
                    fontSize: DEFAULT_VISUAL_SETTINGS.vega.fontSize,
                    interactivity: DEFAULT_VISUAL_SETTINGS.interactivity
                })
            );
        });

        it('should sync only changed values after hydration', () => {
            const slice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}',
                config: '{}',
                fontSize: 14,
                interactivity: { tooltip: true }
            });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            const newSettings = {
                vega: {
                    spec: '{"data":{"new":true}}',
                    config: '{}',
                    fontSize: 14
                },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(newSettings);

            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: '{"data":{"new":true}}' })
            );
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.not.objectContaining({ config: expect.anything() })
            );
        });

        it('should not call sync when no values have changed after hydration', () => {
            const slice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}',
                config: '{}',
                fontSize: 14,
                interactivity: { tooltip: true }
            });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            fireVisualSubscriber(DEFAULT_VISUAL_SETTINGS);

            expect(mockSyncFn).not.toHaveBeenCalled();
        });

        it('should clear pending entry when visual value matches pending (deepEqual confirmation)', () => {
            const slice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            // Trigger persist to create pending entry
            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(changedSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalled();

            // Simulate Power BI confirming with matching value
            const confirmedSettings = {
                vega: { spec: 'newSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(confirmedSettings);

            // Sync should NOT be called (app-core already has correct value)
            expect(mockSyncFn).not.toHaveBeenCalled();

            // Fire again — no pending, should sync normally if values differ
            const differentSettings = {
                vega: { spec: 'externalSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(differentSettings);
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'externalSpec' })
            );
        });

        it('should skip sync for stale echo when pending exists and visual does not match', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            createSliceSync(createTestConfig());

            // Trigger persist with a new slice (different reference triggers persistence)
            const newSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(newSlice);

            // Stale echo with old value
            const staleSettings = {
                vega: { spec: 'oldSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(staleSettings);

            // Should NOT sync the stale value back
            expect(mockSyncFn).not.toHaveBeenCalled();
        });

        it('should prune expired pending entries and resume normal sync', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            createSliceSync(createTestConfig());

            // Trigger persist to create pending entry (different reference)
            const newSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(newSlice);

            // Advance time past timeout
            vi.advanceTimersByTime(PENDING_PERSIST_TIMEOUT_MS + 1);

            // Fire visual sync — pending should be pruned, normal sync resumes
            const externalSettings = {
                vega: { spec: 'externalSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(externalSettings);

            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'externalSpec' })
            );
        });

        it('should prune only expired entries when some are still valid', () => {
            // Set up visual settings so only spec differs from initial app-core
            mockVisualSettings = {
                vega: { spec: 'visualSpec', config: 'oldConfig', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec',
                config: 'oldConfig',
                fontSize: 14
            });
            mockAppCoreState = { test: initialSlice };
            createSliceSync(createTestConfig());

            // t=0: First persist — only spec differs from visual → pending(spec, t=0)
            const specSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec',
                config: 'oldConfig',
                fontSize: 14
            });
            fireAppCoreSubscriber(specSlice);

            // Advance past timeout for the first entry
            vi.advanceTimersByTime(PENDING_PERSIST_TIMEOUT_MS + 1);

            // t=5001: Second persist — only config changes → pending(config, t=5001)
            // spec: 'newSpec' vs visual 'visualSpec' → different → re-records pending(spec, t=5001)
            // To avoid this, update mockVisualSettings so spec matches
            mockVisualSettings = {
                vega: { spec: 'newSpec', config: 'oldConfig', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            const configSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec',
                config: 'newConfig',
                fontSize: 14
            });
            fireAppCoreSubscriber(configSlice);

            // t=5001: spec has no fresh pending (visual matches), config has pending(t=5001)
            // Fire visual sync with external values
            const externalSettings = {
                vega: {
                    spec: 'externalSpec',
                    config: 'oldConfig',
                    fontSize: 14
                },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(externalSettings);

            // spec should sync (no pending), config should NOT (still pending)
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'externalSpec' })
            );
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.not.objectContaining({ config: expect.anything() })
            );
        });

        it('should not call sync function when payload is empty after pending filtering', () => {
            // Set visual settings so ALL persistable keys differ from the changed slice
            mockVisualSettings = {
                vega: { spec: 'oldSpec', config: 'oldConfig', fontSize: 10 },
                interactivity: { tooltip: true }
            };
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec',
                config: 'oldConfig',
                fontSize: 10,
                interactivity: { tooltip: true }
            });
            mockAppCoreState = { test: initialSlice };
            createSliceSync(createTestConfig());

            // Trigger persist for all persistable keys (different reference, all differ from visual)
            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec',
                config: 'newConfig',
                fontSize: 18,
                interactivity: { tooltip: true }
            });
            fireAppCoreSubscriber(changedSlice);

            // Stale echo — all persistable keys are pending, interactivity unchanged
            const staleSettings = {
                vega: {
                    spec: 'staleSpec',
                    config: 'staleConfig',
                    fontSize: 12
                },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(staleSettings);

            expect(mockSyncFn).not.toHaveBeenCalled();
        });
    });

    describe('App-Core → Power BI (persistence)', () => {
        it('should persist changed value and record pending entry', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = DEFAULT_VISUAL_SETTINGS;
            createSliceSync(createTestConfig());

            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{"new":true}}'
            });
            fireAppCoreSubscriber(changedSlice);

            expect(mockPersistProjectProperties).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        objectName: 'vega',
                        propertyName: 'jsonSpec',
                        value: '{"data":{"new":true}}'
                    })
                ])
            );
        });

        it('should use serializeForPersistence when present on mapping', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                fontSize: 14
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = DEFAULT_VISUAL_SETTINGS;
            createSliceSync(createTestConfig());

            const changedSlice = createSliceState({
                __hasHydrated__: true,
                fontSize: 18
            });
            fireAppCoreSubscriber(changedSlice);

            expect(mockPersistProjectProperties).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        objectName: 'editor',
                        propertyName: 'fontSize',
                        value: '18' // String, not number — serializeForPersistence applied
                    })
                ])
            );
        });

        it('should not create pending entry for read-only mapping', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                interactivity: { tooltip: true }
            });
            mockAppCoreState = { test: initialSlice };
            createSliceSync(createTestConfig());

            // Change interactivity only — read-only, no persistence
            const changedSlice = createSliceState({
                __hasHydrated__: true,
                interactivity: { tooltip: false }
            });
            fireAppCoreSubscriber(changedSlice);

            // No persist call for interactivity (no persistence mapping)
            expect(mockPersistProjectProperties).not.toHaveBeenCalled();

            // Visual sync should still work for interactivity (no pending blocks it).
            // Use a DIFFERENT visual value to prove the inbound sync path is open.
            const newSettings = {
                vega: { spec: '{"data":{}}', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(newSettings);

            // interactivity differs from app-core (false vs true), no pending → syncs
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    interactivity: { tooltip: true }
                })
            );
        });

        it('should skip when slice reference has not changed', () => {
            const slice = createSliceState({ __hasHydrated__: true });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            // Fire with same state reference
            capturedAppCoreSubscriber(mockAppCoreState);

            expect(mockPersistProjectProperties).not.toHaveBeenCalled();
        });

        it('should skip when isApplyingInboundSync is true', () => {
            const slice = createSliceState({ __hasHydrated__: false });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            // Make mockSyncFn simulate a synchronous Zustand state update so the
            // app-core subscriber fires while isApplyingInboundSync is still true.
            mockSyncFn.mockImplementation(() => {
                const hydratedSlice = createSliceState({
                    __hasHydrated__: true,
                    spec: 'fromPBI'
                });
                mockAppCoreState = { test: hydratedSlice };
                capturedAppCoreSubscriber(mockAppCoreState);
            });

            // Trigger first hydration — getSyncFn fires, which synchronously
            // triggers the app-core subscriber via the mock above
            fireVisualSubscriber({
                vega: { spec: 'fromPBI', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });

            expect(mockSyncFn).toHaveBeenCalled();
            // Persistence must be suppressed because the app-core update was caused
            // by inbound sync, not a user action
            expect(mockPersistProjectProperties).not.toHaveBeenCalled();
        });

        it('should skip persistence before hydration', () => {
            const slice = createSliceState({ __hasHydrated__: false });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig());

            const changedSlice = createSliceState({
                __hasHydrated__: false,
                spec: 'changed'
            });
            fireAppCoreSubscriber(changedSlice);

            expect(mockPersistProjectProperties).not.toHaveBeenCalled();
        });

        it('should append onPersist cross-property side-effects', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'vega'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'vega' }
            };
            createSliceSync(
                createTestConfig({ mappings: CROSS_PROPERTY_MAPPINGS })
            );

            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'vegaLite'
            });
            fireAppCoreSubscriber(changedSlice);

            expect(mockPersistProjectProperties).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        objectName: 'vega',
                        propertyName: 'jsonSpec',
                        value: 'vegaLite'
                    }),
                    expect.objectContaining({
                        objectName: 'vega',
                        propertyName: 'selectionMode',
                        value: 'simple'
                    })
                ])
            );
        });

        it('should emit ONE batched persistProjectProperties call when multiple keys change in a single slice update (M10)', () => {
            // The legacy support-field migration commits its three
            // properties through one combined store setter — the
            // subscriber must observe one slice change and emit one
            // batched host persist, never one call per property.
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}',
                config: '{}',
                fontSize: 14
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = DEFAULT_VISUAL_SETTINGS;
            createSliceSync(createTestConfig());

            const migratedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'migratedSpec',
                config: 'migratedConfig',
                fontSize: 99
            });
            fireAppCoreSubscriber(migratedSlice);

            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);
            const changes = mockPersistProjectProperties.mock.calls[0][0];
            expect(changes).toHaveLength(3);
            expect(changes).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        objectName: 'vega',
                        propertyName: 'jsonSpec',
                        value: 'migratedSpec'
                    }),
                    expect.objectContaining({
                        objectName: 'vega',
                        propertyName: 'jsonConfig',
                        value: 'migratedConfig'
                    }),
                    expect.objectContaining({
                        objectName: 'editor',
                        propertyName: 'fontSize',
                        value: '99'
                    })
                ])
            );

            // All three keys have pending entries: a stale echo for any of
            // them must be suppressed until Power BI confirms.
            const staleSettings = {
                vega: { spec: '{"data":{}}', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(staleSettings);
            expect(mockSyncFn).not.toHaveBeenCalled();
        });

        it('should not persist or record pending when no values have changed', () => {
            const slice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}',
                config: '{}',
                fontSize: 14
            });
            mockAppCoreState = { test: slice };
            mockVisualSettings = DEFAULT_VISUAL_SETTINGS;
            createSliceSync(createTestConfig());

            // Same values — no changes
            const unchangedSlice = createSliceState({
                __hasHydrated__: true,
                spec: '{"data":{}}',
                config: '{}',
                fontSize: 14
            });
            fireAppCoreSubscriber(unchangedSlice);

            expect(mockPersistProjectProperties).not.toHaveBeenCalled();
        });

        it('should short-circuit without persisting or recording pending when the read-mode persist gate is active', () => {
            // Simulate the U5 read-mode gate being live for this
            // update. Even when the app-core slice changes (here:
            // user-input-equivalent app-core mutation), the outbound
            // subscriber must not enqueue host persist work AND must
            // not record a pendingPersists entry — otherwise the next
            // inbound sync would treat the genuine host value as a
            // stale echo against an entry that never landed.
            mockIsReadModePersistSuppressed = true;

            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'oldSpec' }
            };
            createSliceSync(createTestConfig());

            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(changedSlice);

            expect(mockPersistProjectProperties).not.toHaveBeenCalled();

            // A subsequent inbound sync with the (unchanged) host value
            // must NOT be filtered as a stale echo — because the gate
            // returned early before recording a pending entry.
            fireVisualSubscriber(
                {
                    ...DEFAULT_VISUAL_SETTINGS,
                    vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'oldSpec' }
                },
                true
            );
            expect(mockSyncFn).toHaveBeenCalled();
        });
    });

    describe('integration scenarios', () => {
        it('should handle full Apply cycle: persist → stale echo → confirmation', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'oldSpec' }
            };
            createSliceSync(createTestConfig());

            // 1. User clicks Apply → app-core changes, persist fires
            const newSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(newSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);

            // 2. Stale Power BI update arrives with oldSpec
            const staleSettings = {
                vega: { spec: 'oldSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(staleSettings);
            // Stale echo suppressed — sync NOT called
            expect(mockSyncFn).not.toHaveBeenCalled();

            // 3. Power BI confirms with newSpec
            const confirmedSettings = {
                vega: { spec: 'newSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(confirmedSettings);
            // Confirmed — pending cleared, sync NOT called (app-core already correct)
            expect(mockSyncFn).not.toHaveBeenCalled();

            // 4. Subsequent external change works normally
            const externalSettings = {
                vega: { spec: 'externalSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(externalSettings);
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'externalSpec' })
            );
        });

        it('should handle rapid double-persist: latest pending wins', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'oldSpec' }
            };
            createSliceSync(createTestConfig());

            // Apply 1: specA
            const sliceA = createSliceState({
                __hasHydrated__: true,
                spec: 'specA'
            });
            fireAppCoreSubscriber(sliceA);

            // Apply 2: specB (before PBI confirms specA)
            const sliceB = createSliceState({
                __hasHydrated__: true,
                spec: 'specB'
            });
            fireAppCoreSubscriber(sliceB);
            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(2);

            // Stale echo with oldSpec — blocked
            fireVisualSubscriber({
                vega: { spec: 'oldSpec', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).not.toHaveBeenCalled();

            // PBI confirms specA — but pending is specB now, so treated as stale
            fireVisualSubscriber({
                vega: { spec: 'specA', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).not.toHaveBeenCalled();

            // PBI confirms specB — matches pending, confirmed
            fireVisualSubscriber({
                vega: { spec: 'specB', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).not.toHaveBeenCalled();

            // External change works normally after confirmation
            fireVisualSubscriber({
                vega: { spec: 'external', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'external' })
            );
        });

        it('should clear pending map and unsubscribe all listeners on cleanup', () => {
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec'
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: { ...DEFAULT_VISUAL_SETTINGS.vega, spec: 'oldSpec' }
            };
            const cleanup = createSliceSync(createTestConfig());

            // Capture the unsubscribe fns each store's subscribe() returned for
            // THIS instance (one subscribe call per store, cleared per test).
            const appCoreUnsub = vi.mocked(useDenebState.subscribe).mock
                .results[0].value;
            const visualUnsub = vi.mocked(useDenebVisualState.subscribe).mock
                .results[0].value;

            // Create a pending entry (different reference triggers persist)
            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(changedSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);

            cleanup();

            // Both store subscriptions were torn down exactly once.
            expect(appCoreUnsub).toHaveBeenCalledTimes(1);
            expect(visualUnsub).toHaveBeenCalledTimes(1);

            // Fire THIS SAME instance's captured inbound subscriber with a value
            // that WOULD have been suppressed as a stale echo had the pending
            // map survived cleanup. Because cleanup cleared it, the spec syncs —
            // proving the pending map was cleared — and no persist is triggered
            // by an inbound sync.
            mockPersistProjectProperties.mockClear();
            mockSyncFn.mockClear();
            fireVisualSubscriber({
                vega: { spec: 'fromPBI', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'fromPBI' })
            );
            expect(mockPersistProjectProperties).not.toHaveBeenCalled();
        });

        it('should confirm pending via deepEqual for nested objects (fresh reference, identical content)', () => {
            // Nested-object value rebuilt per call (real supportFieldConfiguration
            // shape). Because every getVisualValue re-parses into a NEW object
            // graph, reference equality would treat the host echo as stale;
            // only deepEqual confirms the pending persist.
            const buildConfig = () => ({
                field1: { highlight: true, format: false }
            });
            const oldSlice = createSliceState({
                __hasHydrated__: true,
                supportConfig: { field0: { highlight: false } }
            });
            mockAppCoreState = { test: oldSlice };
            mockVisualSettings = {
                vega: {
                    supportConfigRaw: JSON.stringify({
                        field0: { highlight: false }
                    })
                }
            };
            createSliceSync(createTestConfig({ mappings: [OBJECT_MAPPING] }));

            // Persist a new nested-object config (different reference triggers persist)
            const newSlice = createSliceState({
                __hasHydrated__: true,
                supportConfig: buildConfig()
            });
            fireAppCoreSubscriber(newSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);

            // Power BI echoes back a FRESH object graph with identical content.
            fireVisualSubscriber({
                vega: { supportConfigRaw: JSON.stringify(buildConfig()) }
            });

            // deepEqual confirms (identical content, distinct references) —
            // pending cleared, no sync (app-core already correct).
            expect(mockSyncFn).not.toHaveBeenCalled();

            // A genuinely different nested value now syncs normally.
            fireVisualSubscriber({
                vega: {
                    supportConfigRaw: JSON.stringify({
                        field1: { highlight: false, format: false }
                    })
                }
            });
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    supportConfig: { field1: { highlight: false, format: false } }
                })
            );
        });
    });

    describe('per-mapping deep equality (deserialized-object mappings)', () => {
        it('should NOT sync a deserialized-object mapping when content is identical (deepEqual — no inbound churn)', () => {
            // Inbound: app-core already holds content-identical config.
            // getVisualValue re-parses fresh each call, so shallowEqual would
            // always report a change and re-sync (churn on every update).
            // deepEqual detects equality → no sync.
            const slice = createSliceState({
                __hasHydrated__: true,
                supportConfig: { f1: { highlight: true, format: false } }
            });
            mockAppCoreState = { test: slice };
            createSliceSync(createTestConfig({ mappings: [OBJECT_MAPPING] }));

            fireVisualSubscriber({
                vega: {
                    supportConfigRaw: JSON.stringify({
                        f1: { highlight: true, format: false }
                    })
                }
            });

            expect(mockSyncFn).not.toHaveBeenCalled();
        });

        it('should NOT bundle an unchanged deserialized-object mapping (nor record pending) when an unrelated key persists', () => {
            // Outbound: only `spec` genuinely changes. The unchanged
            // supportConfig must not be bundled into the persist and must not
            // register a pendingPersists entry (which would put it under
            // stale-echo suppression on the next inbound sync).
            const specMapping = TEST_MAPPINGS[0]; // spec
            const initialSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'oldSpec',
                supportConfig: { f1: { highlight: true } }
            });
            mockAppCoreState = { test: initialSlice };
            mockVisualSettings = {
                vega: {
                    spec: 'oldSpec',
                    supportConfigRaw: JSON.stringify({ f1: { highlight: true } })
                }
            };
            createSliceSync(
                createTestConfig({ mappings: [specMapping, OBJECT_MAPPING] })
            );

            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec',
                supportConfig: { f1: { highlight: true } } // content-identical, fresh ref
            });
            fireAppCoreSubscriber(changedSlice);

            // Exactly one change — spec only, supportConfig NOT bundled.
            expect(mockPersistProjectProperties).toHaveBeenCalledTimes(1);
            const changes = mockPersistProjectProperties.mock.calls[0][0];
            expect(changes).toHaveLength(1);
            expect(changes[0]).toMatchObject({ propertyName: 'jsonSpec' });

            // No pending entry for supportConfig: a genuine host change to it
            // must sync (not be suppressed as a stale echo).
            mockSyncFn.mockClear();
            fireVisualSubscriber({
                vega: {
                    spec: 'newSpec',
                    supportConfigRaw: JSON.stringify({ f1: { highlight: false } })
                }
            });
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    supportConfig: { f1: { highlight: false } }
                })
            );
        });
    });
});
