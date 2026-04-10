import { getDenebState, useDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { logDebug } from '@deneb-viz/utils/logging';
import { deepEqual, shallowEqual } from 'fast-equals';
import { persistProjectProperties, type PropertyChange } from '../persistence';
import {
    PENDING_PERSIST_TIMEOUT_MS,
    type PendingPersistEntry,
    type SliceSyncConfig
} from './sync-types';

/**
 * Creates a bidirectional sync subscription for a slice.
 * - Visual Settings → App-Core: Hydrates on init and syncs ongoing changes
 * - App-Core → Power BI: Persists changes back to the visual properties
 *
 * Uses a pending-persist map to suppress stale Power BI echoes: when app-core persists a value, the map
 * tracks it until Power BI confirms (visual value matches via deepEqual) or the entry expires. During
 * this window, inbound visual values that don't match the pending value are treated as stale echoes and
 * skipped, preventing the spec ping-pong that causes triple-render on Apply.
 *
 * @param config Configuration for the slice sync
 * @returns Cleanup function to unsubscribe
 */
export const createSliceSync = <TSlice, TSliceKey extends string, TSyncPayload>(
    config: SliceSyncConfig<TSlice, TSliceKey, TSyncPayload>
): (() => void) => {
    const { name, getSlice, getSyncFn, isHydrated, getSliceValue, mappings } =
        config;
    const unsubscribers: (() => void)[] = [];

    // Flag to suppress outbound persistence while applying values received from visual settings into
    // app-core (any inbound sync, not just initial hydration). Prevents the App-Core → Power BI
    // subscriber from re-persisting values that just came in from the visual store.
    let isApplyingInboundSync = false;

    // Tracks values persisted to Power BI that have not yet been confirmed by an incoming visual
    // update. While a key has a pending entry, the Visual → App-Core sync skips that key.
    const pendingPersists = new Map<TSliceKey, PendingPersistEntry>();

    // Visual Settings → App-Core (hydration + continuous sync)
    unsubscribers.push(
        useDenebVisualState.subscribe(
            (state) => ({
                settings: state.settings,
                hasInitialSettingsLoaded: state.updates.__hydrated__
            }),
            ({ settings, hasInitialSettingsLoaded }) => {
                // Skip sync until the initial settings have been loaded from Power BI
                if (!hasInitialSettingsLoaded) {
                    logDebug(
                        `[StoreSynchronization:${name}] Skipping sync - initial settings not yet loaded`
                    );
                    return;
                }

                // Prune expired pending entries before checking
                const now = Date.now();
                for (const [key, entry] of pendingPersists) {
                    if (now - entry.timestamp > PENDING_PERSIST_TIMEOUT_MS) {
                        pendingPersists.delete(key);
                        logDebug(
                            `[StoreSynchronization:${name}] Pending persist expired for '${key}'`
                        );
                    }
                }

                const slice = getSlice(getDenebState());
                const payload: Record<string, unknown> = {};
                const isFirstHydration = !isHydrated(slice);

                for (const mapping of mappings) {
                    const visualValue = mapping.getVisualValue(settings);
                    const appCoreValue = getSliceValue(slice, mapping.sliceKey);

                    // Check for pending persist before normal sync logic
                    const pendingEntry = pendingPersists.get(mapping.sliceKey);
                    if (pendingEntry) {
                        // deepEqual is used here (not shallowEqual) because the
                        // pending value is the raw app-core object, while the visual
                        // value may be a freshly deserialized copy (e.g., JSON.parse
                        // round-trip for supportFieldConfiguration). shallowEqual
                        // would fail on new object references with identical content.
                        if (deepEqual(visualValue, pendingEntry.value)) {
                            // Power BI confirmed our persist — clear the pending entry.
                            // App-core already has the correct value, so skip sync.
                            pendingPersists.delete(mapping.sliceKey);
                            logDebug(
                                `[StoreSynchronization:${name}] Pending persist confirmed for '${mapping.sliceKey}'`
                            );
                        } else {
                            // Visual value doesn't match our pending persist — this is a
                            // stale echo from Power BI. Skip sync for this key.
                            logDebug(
                                `[StoreSynchronization:${name}] Skipping stale echo for '${mapping.sliceKey}'`
                            );
                        }
                        continue;
                    }

                    // On first hydration, sync all values regardless of equality
                    // to ensure app-core is fully initialized from Power BI settings.
                    // After hydration, only sync if values have changed.
                    if (
                        isFirstHydration ||
                        !shallowEqual(visualValue, appCoreValue)
                    ) {
                        payload[mapping.sliceKey] = visualValue;
                    }
                }

                if (Object.keys(payload).length > 0) {
                    logDebug(
                        `[StoreSynchronization:${name}] Visual settings changed, syncing to app-core...`,
                        { payload, isFirstHydration }
                    );
                    // Set flag to prevent reverse persistence during this sync.
                    // Wrapped in try/finally so the flag is always cleared even if
                    // the sync function throws (e.g., Zustand middleware error).
                    isApplyingInboundSync = true;
                    try {
                        getSyncFn(slice)(payload as TSyncPayload);
                    } finally {
                        isApplyingInboundSync = false;
                    }
                }
            }
        )
    );

    // App-Core → Power BI (persistence)
    let previousSlice = getSlice(getDenebState());
    unsubscribers.push(
        useDenebState.subscribe((state) => {
            const slice = getSlice(state);

            // Skip if slice reference hasn't changed
            if (slice === previousSlice) return;
            previousSlice = slice;

            // Skip persistence if we're currently applying inbound visual values
            if (isApplyingInboundSync) {
                logDebug(
                    `[StoreSynchronization:${name}] Skipping persistence - currently applying inbound sync`
                );
                return;
            }

            // Skip persistence until hydrated to avoid persisting default values
            if (!isHydrated(slice)) return;

            const settings = useDenebVisualState.getState().settings;
            const changes: PropertyChange[] = [];
            const pendingEntries: {
                key: TSliceKey;
                value: unknown;
            }[] = [];

            for (const mapping of mappings) {
                // Skip mappings without persistence (read-only from Power BI)
                if (!mapping.persistence) continue;

                const appCoreValue = getSliceValue(slice, mapping.sliceKey);
                const visualValue = mapping.getVisualValue(settings);

                if (!shallowEqual(appCoreValue, visualValue)) {
                    // Determine the value to persist: use serializeForPersistence
                    // if available, otherwise use the raw app-core value
                    const persistValue = mapping.serializeForPersistence
                        ? mapping.serializeForPersistence(appCoreValue)
                        : appCoreValue;

                    // Add the primary property change
                    changes.push({
                        objectName: mapping.persistence.objectName,
                        propertyName: mapping.persistence.propertyName,
                        value: persistValue
                    });

                    // Collect pending entry — recorded after persist call succeeds
                    // so a failed persist doesn't block inbound sync for 5 seconds.
                    // Stores the raw app-core value (not serialized) because
                    // confirmation compares against getVisualValue output (deserialized).
                    pendingEntries.push({
                        key: mapping.sliceKey,
                        value: appCoreValue
                    });

                    // Process any cross-property side-effect changes from onPersist callback.
                    // NOTE: side-effect targets are intentionally NOT tracked in pendingPersists.
                    // Currently the only onPersist usage (provider → selectionMode) targets
                    // interactivity, which has no persistence mapping and is therefore never
                    // subject to stale-echo suppression. If a future onPersist targets a
                    // persistable key, it would need its own pending entry to avoid echoes.
                    if (mapping.onPersist) {
                        const sideEffects = mapping.onPersist(
                            appCoreValue,
                            settings
                        );
                        changes.push(...sideEffects);
                    }
                }
            }

            if (changes.length > 0) {
                logDebug(
                    `[StoreSynchronization:${name}] App-core changed, persisting to Power BI...`,
                    { changes }
                );
                persistProjectProperties(changes);

                // Record pending entries only after persist dispatch
                const now = Date.now();
                for (const entry of pendingEntries) {
                    pendingPersists.set(entry.key, {
                        value: entry.value,
                        timestamp: now
                    });
                }
            }
        })
    );

    return () => {
        unsubscribers.forEach((unsub) => unsub());
        pendingPersists.clear();
    };
};
