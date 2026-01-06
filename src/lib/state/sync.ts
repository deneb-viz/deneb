import { getDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { logDebug } from '@deneb-viz/utils/logging';
import { shallowEqual } from 'fast-equals';
import { PROJECT_SYNC_MAPPINGS } from './project-sync-mappings';
import { EDITOR_PREFERENCES_SYNC_MAPPINGS } from './editor-preferences-sync-mappings';
import { createSliceSync } from './create-slice-sync';
import { persistProjectProperties } from '../persistence';
import { VISUAL_RENDER_SYNC_MAPPINGS } from './visual-render-sync-mappings';

/**
 * Initializes subscriptions to sync state from the Power BI visual store to the app-core store.
 * Call this once during visual initialization, after both stores are available.
 *
 * @returns A cleanup function to unsubscribe all listeners (call on visual destruction if needed).
 */
export const initializeStoreSynchronization = (): (() => void) => {
    logDebug('[StoreSynchronization] Initializing store subscriptions...');

    const unsubscribers: (() => void)[] = [
        subscribeDataset(),
        subscribeEmbedViewport(),
        syncSlicesWithVisualSettings()
    ];

    return () => {
        logDebug('[StoreSynchronization] Cleaning up store subscriptions...');
        unsubscribers.forEach((unsub) => unsub());
    };
};

/**
 * Subscribe to dataset changes in the visual store and sync to the app-core store.
 * Only syncs when the dataset version increments.
 */
const subscribeDataset = (): (() => void) => {
    return useDenebVisualState.subscribe(
        (state) => state.dataset.version,
        (version) => {
            const { fields, values } = useDenebVisualState.getState().dataset;

            logDebug(
                '[StoreSynchronization] Dataset version changed, syncing to app-core store...',
                { version }
            );

            const { updateDataset } = getDenebState();
            updateDataset({
                dataset: {
                    fields,
                    values
                }
            });
        }
    );
};

/**
 * Subscribe to embed viewport changes in the visual store and sync to the app-core store.
 * Also persists changes back to Power BI visual settings when in viewer mode.
 */
const subscribeEmbedViewport = (): (() => void) => {
    return useDenebVisualState.subscribe(
        (state) => ({
            embedViewport: state.interface.embedViewport,
            mode: state.interface.mode,
            hasHydrated: state.updates.__hydrated__
        }),
        ({ embedViewport: newEmbedViewport, mode, hasHydrated }) => {
            // Sync to app-core
            const { embedViewport, setEmbedViewport } =
                getDenebState().interface;
            if (!shallowEqual(embedViewport, newEmbedViewport)) {
                logDebug(
                    '[StoreSynchronization] Embed viewport changed, syncing to app-core store...',
                    { newEmbedViewport }
                );
                setEmbedViewport(newEmbedViewport);
            }

            // Persist to Power BI (only in viewer mode after hydration)
            if (hasHydrated && mode === 'viewer' && newEmbedViewport) {
                const settings = useDenebVisualState.getState().settings;
                const storedHeight = String(
                    settings.stateManagement.viewport.viewportHeight.value
                );
                const storedWidth = String(
                    settings.stateManagement.viewport.viewportWidth.value
                );

                if (
                    storedHeight !== String(newEmbedViewport.height) ||
                    storedWidth !== String(newEmbedViewport.width)
                ) {
                    logDebug(
                        '[StoreSynchronization] Embed viewport changed, persisting to Power BI...',
                        {
                            newEmbedViewport
                        }
                    );
                    persistProjectProperties([
                        {
                            objectName: 'stateManagement',
                            propertyName: 'viewportHeight',
                            value: newEmbedViewport.height
                        },
                        {
                            objectName: 'stateManagement',
                            propertyName: 'viewportWidth',
                            value: newEmbedViewport.width
                        }
                    ]);
                }
            }
        }
    );
};

/**
 * Bidirectional sync between app-core slices and Power BI visual settings.
 * Uses the generic createSliceSync factory to handle multiple slices.
 */
const syncSlicesWithVisualSettings = (): (() => void) => {
    const unsubscribers = [
        // Project slice sync
        createSliceSync({
            name: 'project',
            getSlice: (state) =>
                (state as ReturnType<typeof getDenebState>).project,
            getSyncFn: (slice) => slice.syncProjectData,
            isHydrated: (slice) => slice.__hasHydrated__,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: PROJECT_SYNC_MAPPINGS
        }),

        // Editor preferences slice sync
        createSliceSync({
            name: 'editorPreferences',
            getSlice: (state) =>
                (state as ReturnType<typeof getDenebState>).editorPreferences,
            getSyncFn: (slice) => slice.syncPreferences,
            isHydrated: (slice) => slice.__hasHydrated__,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: EDITOR_PREFERENCES_SYNC_MAPPINGS
        }),

        // Visual render (display) slice sync
        createSliceSync({
            name: 'visualRender',
            getSlice: (state) =>
                (state as ReturnType<typeof getDenebState>).visualRender,
            getSyncFn: (slice) => slice.syncPreferences,
            isHydrated: (slice) => slice.__hasHydrated__,
            getSliceValue: (slice, key) => slice[key as keyof typeof slice],
            mappings: VISUAL_RENDER_SYNC_MAPPINGS
        })
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
};
