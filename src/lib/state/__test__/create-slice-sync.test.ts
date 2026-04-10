import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSliceSync } from '../create-slice-sync';
import { PENDING_PERSIST_TIMEOUT_MS } from '../sync-types';
import type { SliceSyncConfig, SliceSyncMapping } from '../sync-types';

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Captured subscriber functions for manual invocation
let capturedVisualSubscriber: (args: {
    settings: Record<string, unknown>;
    hasInitialSettingsLoaded: boolean;
}) => void;
let capturedAppCoreSubscriber: (state: Record<string, unknown>) => void;

const mockPersistProjectProperties = vi.fn();

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
        mockPersistProjectProperties(...args)
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
    syncData: (payload: Partial<TestSlice>) => void;
};

type TestSliceKey = 'spec' | 'config' | 'fontSize' | 'interactivity';

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
            const cleanup = createSliceSync(createTestConfig());

            // Create a pending entry (different reference triggers persist)
            const changedSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            fireAppCoreSubscriber(changedSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalled();

            // Cleanup should not throw and should clear pending state
            cleanup();

            // After cleanup, a stale echo should sync normally (pending was cleared)
            // Re-create the sync to get a fresh subscriber
            const cleanup2 = createSliceSync(createTestConfig());
            const postCleanupSlice = createSliceState({
                __hasHydrated__: true,
                spec: 'newSpec'
            });
            mockAppCoreState = { test: postCleanupSlice };
            fireVisualSubscriber({
                vega: { spec: 'fromPBI', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            // Should sync — no pending entries blocking
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'fromPBI' })
            );
            cleanup2();
        });

        it('should confirm pending via deepEqual for nested objects (JSON round-trip)', () => {
            const nestedValue = { field1: { highlight: true, format: false } };
            const oldSlice = createSliceState({
                __hasHydrated__: true,
                spec: JSON.stringify({ old: true })
            });
            mockAppCoreState = { test: oldSlice };
            mockVisualSettings = {
                ...DEFAULT_VISUAL_SETTINGS,
                vega: {
                    ...DEFAULT_VISUAL_SETTINGS.vega,
                    spec: JSON.stringify({ old: true })
                }
            };
            createSliceSync(createTestConfig());

            // Persist the nested spec (different reference triggers persist)
            const newSlice = createSliceState({
                __hasHydrated__: true,
                spec: JSON.stringify(nestedValue)
            });
            fireAppCoreSubscriber(newSlice);
            expect(mockPersistProjectProperties).toHaveBeenCalled();

            // Visual returns the same value (simulating JSON round-trip — same content, new ref)
            const confirmedSettings = {
                vega: {
                    spec: JSON.stringify(nestedValue),
                    config: '{}',
                    fontSize: 14
                },
                interactivity: { tooltip: true }
            };
            fireVisualSubscriber(confirmedSettings);

            // deepEqual should confirm (same string content)
            // No sync call — confirmed and cleared
            expect(mockSyncFn).not.toHaveBeenCalled();

            // Subsequent different value syncs normally
            fireVisualSubscriber({
                vega: { spec: 'different', config: '{}', fontSize: 14 },
                interactivity: { tooltip: true }
            });
            expect(mockSyncFn).toHaveBeenCalledWith(
                expect.objectContaining({ spec: 'different' })
            );
        });
    });
});
