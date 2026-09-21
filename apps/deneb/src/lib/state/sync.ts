import { getDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { logDebug } from '@deneb-viz/utils/logging';
import { shallowEqual } from 'fast-equals';
import { PROJECT_SYNC_MAPPINGS } from './project-sync-mappings';
import { COMPILATION_SYNC_MAPPINGS } from './compilation-sync-mappings';
import { createSliceSync } from './create-slice-sync';
import { persistProjectProperties } from '../persistence';
import { VISUAL_RENDER_SYNC_MAPPINGS } from './visual-render-sync-mappings';
import { defineSliceSync, type SliceSyncDefinition } from './sync-types';

/**
 * Initializes subscriptions to sync state from the Power BI visual store to the app-core store.
 * Call this once during visual initialization, after both stores are available.
 *
 * @param contributedSliceSyncs App-contributed slice-sync definitions (e.g. editor preferences),
 * registered after the generic slice syncs below.
 * @returns A cleanup function to unsubscribe all listeners (call on visual destruction if needed).
 */
export const initializeStoreSynchronization = (
    contributedSliceSyncs: SliceSyncDefinition[] = []
): (() => void) => {
    logDebug('[StoreSynchronization] Initializing store subscriptions...');

    const unsubscribers: (() => void)[] = [
        subscribeDataset(),
        subscribeEmbedViewport(),
        syncSlicesWithVisualSettings(contributedSliceSyncs)
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
            hasHydrated: state.updates.__hydrated__,
            isInFocus: state.interface.isInFocus
        }),
        ({ embedViewport: newEmbedViewport, mode, hasHydrated, isInFocus }) => {
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
            if (
                hasHydrated &&
                mode === 'viewer' &&
                !isInFocus &&
                newEmbedViewport
            ) {
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
 * Slice-sync definitions that apply regardless of which app composes this kernel.
 */
const GENERIC_SLICE_SYNC_DEFINITIONS: SliceSyncDefinition[] = [
    // Project slice sync
    defineSliceSync({
        name: 'project',
        getSlice: (state) =>
            (state as ReturnType<typeof getDenebState>).project,
        getSyncFn: (slice) => slice.syncProjectData,
        isHydrated: (slice) => slice.__hasHydrated__,
        getSliceValue: (slice, key) => slice[key as keyof typeof slice],
        mappings: PROJECT_SYNC_MAPPINGS
    }),

    // Visual render (display) slice sync
    defineSliceSync({
        name: 'visualRender',
        getSlice: (state) =>
            (state as ReturnType<typeof getDenebState>).visualRender,
        getSyncFn: (slice) => slice.syncPreferences,
        isHydrated: (slice) => slice.__hasHydrated__,
        getSliceValue: (slice, key) => slice[key as keyof typeof slice],
        mappings: VISUAL_RENDER_SYNC_MAPPINGS
    }),

    // Compilation (performance settings) slice sync
    defineSliceSync({
        name: 'compilation',
        getSlice: (state) =>
            (state as ReturnType<typeof getDenebState>).compilation,
        getSyncFn: (slice) => slice.syncPerformanceSettings,
        isHydrated: (slice) => slice.__hasHydrated__,
        getSliceValue: (slice, key) => slice[key as keyof typeof slice],
        mappings: COMPILATION_SYNC_MAPPINGS
    })
];

/**
 * `createSliceSync` keeps no registry of which slice each definition targets — `name` is only a
 * log-message prefix — so two definitions naming the same slice would each start an independent
 * subscription and double-persist. `name` collisions are still rejected (distinct definitions
 * sharing a log label is itself a bug), but the real identity check resolves each definition's
 * `getSlice` against the live app-core store once, up front, and compares the returned slice
 * objects by reference: two definitions whose `getSlice` calls resolve to the same slice object
 * are targeting the same synchronization, whatever they are named. Throws before any definition
 * in `definitions` is registered if two of them share a name or a resolved slice.
 */
const assertDistinctSliceSyncTargets = (
    definitions: SliceSyncDefinition[]
): void => {
    const state = getDenebState();
    const seenNames = new Set<string>();
    const seenSlicesByName = new Map<unknown, string>();

    for (const definition of definitions) {
        if (seenNames.has(definition.name)) {
            throw new Error(
                `[StoreSynchronization] Slice sync '${definition.name}' is already registered. Each app-core slice may only be synced by one definition.`
            );
        }
        seenNames.add(definition.name);

        const slice = definition.getSlice(state);
        const existingName = seenSlicesByName.get(slice);
        if (existingName !== undefined) {
            throw new Error(
                `[StoreSynchronization] Slice sync '${definition.name}' targets the same app-core slice as '${existingName}'. Each app-core slice may only be synced by one definition.`
            );
        }
        seenSlicesByName.set(slice, definition.name);
    }
};

/**
 * Bidirectional sync between app-core slices and Power BI visual settings.
 * Uses the generic createSliceSync factory to handle multiple slices; registers the generic
 * definitions first, then any app-contributed definitions, after confirming none of them collide.
 */
const syncSlicesWithVisualSettings = (
    contributedSliceSyncs: SliceSyncDefinition[]
): (() => void) => {
    const definitions = [
        ...GENERIC_SLICE_SYNC_DEFINITIONS,
        ...contributedSliceSyncs
    ];
    assertDistinctSliceSyncTargets(definitions);

    const unsubscribers = definitions.map((definition) =>
        createSliceSync(definition)
    );

    return () => unsubscribers.forEach((unsub) => unsub());
};
