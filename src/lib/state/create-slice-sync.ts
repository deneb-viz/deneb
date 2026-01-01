import { getDenebState, useDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { logDebug } from '@deneb-viz/utils/logging';
import { shallowEqual } from 'fast-equals';
import { persistProjectProperties, type PropertyChange } from '../persistence';
import type { SliceSyncConfig } from './sync-types';

/**
 * Creates a bidirectional sync subscription for a slice.
 * - Visual Settings → App-Core: Hydrates on init and syncs ongoing changes
 * - App-Core → Power BI: Persists changes back to the visual properties
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

    // Flag to prevent the App-Core → Power BI subscriber from firing during
    // the initial hydration sync (which would overwrite persisted values with defaults)
    let isSyncingFromVisual = false;

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

                const slice = getSlice(getDenebState());
                const payload: Record<string, unknown> = {};
                const isFirstHydration = !isHydrated(slice);

                for (const mapping of mappings) {
                    const visualValue = mapping.getVisualValue(settings);
                    const appCoreValue = getSliceValue(slice, mapping.sliceKey);

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
                    // Set flag to prevent reverse persistence during this sync
                    isSyncingFromVisual = true;
                    getSyncFn(slice)(payload as TSyncPayload);
                    // Clear flag after sync completes
                    isSyncingFromVisual = false;
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

            // Skip persistence if we're currently syncing from visual settings
            if (isSyncingFromVisual) {
                logDebug(
                    `[StoreSynchronization:${name}] Skipping persistence - currently syncing from visual`
                );
                return;
            }

            // Skip persistence until hydrated to avoid persisting default values
            if (!isHydrated(slice)) return;

            const settings = useDenebVisualState.getState().settings;
            const changes: PropertyChange[] = [];

            for (const mapping of mappings) {
                // Skip mappings without persistence (read-only from Power BI)
                if (!mapping.persistence) continue;

                const appCoreValue = getSliceValue(slice, mapping.sliceKey);
                const visualValue = mapping.getVisualValue(settings);

                if (!shallowEqual(appCoreValue, visualValue)) {
                    // Add the primary property change
                    changes.push({
                        objectName: mapping.persistence.objectName,
                        propertyName: mapping.persistence.propertyName,
                        value: appCoreValue
                    });

                    // Process any side-effect changes from onPersist callback
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
            }
        })
    );

    return () => unsubscribers.forEach((unsub) => unsub());
};
