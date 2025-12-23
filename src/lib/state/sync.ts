import {
    type EditorPanePosition,
    type ProjectSyncPayload,
    getDenebState,
    useDenebState
} from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { logDebug } from '@deneb-viz/utils/logging';
import { shallowEqual } from 'fast-equals';
import { PROJECT_SYNC_MAPPINGS } from './project-sync-mappings';
import { persistProjectProperties, type PropertyChange } from '../persistence';

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
        subscribeInterfaceViewport(),
        pushVisualSettingsToAppCore(),
        syncAppCoreWithVisualSettings()
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
 * Subscribe to interface viewport changes in the visual store and sync to the app-core store.
 */
const subscribeInterfaceViewport = (): (() => void) => {
    return useDenebVisualState.subscribe(
        (state) => state.interface.viewport,
        (interfaceViewport) => {
            const { viewport, setViewport } = getDenebState().interface;
            if (shallowEqual(viewport, interfaceViewport)) {
                return;
            }
            logDebug(
                '[StoreSynchronization] Interface viewport changed, syncing to app-core store...',
                { viewport }
            );
            setViewport(interfaceViewport);
        }
    );
};

/**
 * Subscribe to visual settings changes and push relevant changes to the app-core store.
 */
const pushVisualSettingsToAppCore = (): (() => void) => {
    return useDenebVisualState.subscribe(
        (state) => state.settings,
        (settings) => {
            // Editor pane position
            {
                const { editorPosition, setEditorPosition } =
                    getDenebState().interface;
                if (
                    editorPosition !==
                    (settings.editor.json.position.value as EditorPanePosition)
                ) {
                    logDebug(
                        '[StoreSynchronization] Editor pane position changed, syncing to app-core store...',
                        { position: settings.editor.json.position.value }
                    );
                    setEditorPosition(
                        settings.editor.json.position
                            .value as EditorPanePosition
                    );
                }
            }
        }
    );
};

/**
 * Bidirectional sync between app-core project state and Power BI visual settings.
 * - Visual Settings → App-Core: Hydrates on init and syncs ongoing changes
 * - App-Core → Power BI: Persists changes back to the visual properties
 */
const syncAppCoreWithVisualSettings = (): (() => void) => {
    const unsubscribers: (() => void)[] = [];

    // Flag to prevent the App-Core → Power BI subscriber from firing during
    // the initial hydration sync (which would overwrite persisted values with defaults)
    let isSyncingFromVisual = false;

    // Visual Settings → App-Core (hydration + continuous sync)
    // We subscribe to hasInitialSettingsLoaded to ensure we only sync after
    // the first visual update has populated the real Power BI settings.
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
                        '[StoreSynchronization] Skipping sync - initial settings not yet loaded'
                    );
                    return;
                }

                const { project } = getDenebState();
                const payload: Partial<ProjectSyncPayload> = {};
                const isFirstHydration = !project.__hasHydrated__;

                for (const mapping of PROJECT_SYNC_MAPPINGS) {
                    const visualValue = mapping.getVisualValue(settings);
                    const appCoreValue = project[mapping.projectKey];

                    // On first hydration, sync all values regardless of equality
                    // to ensure app-core is fully initialized from Power BI settings.
                    // After hydration, only sync if values have changed.
                    if (
                        isFirstHydration ||
                        !shallowEqual(visualValue, appCoreValue)
                    ) {
                        (payload as Record<string, unknown>)[
                            mapping.projectKey
                        ] = visualValue;
                    }
                }

                if (Object.keys(payload).length > 0) {
                    logDebug(
                        '[StoreSynchronization] Visual settings changed, syncing to app-core project...',
                        { payload, isFirstHydration }
                    );
                    // Set flag to prevent reverse persistence during this sync
                    isSyncingFromVisual = true;
                    project.syncProjectData(payload as ProjectSyncPayload);
                    // Clear flag after sync completes
                    isSyncingFromVisual = false;
                }
            }
        )
    );

    // App-Core → Power BI (persistence)
    // Note: useDenebState doesn't use subscribeWithSelector middleware,
    // so we use the basic subscribe and track previous state manually
    let previousProject = getDenebState().project;
    unsubscribers.push(
        useDenebState.subscribe((state) => {
            const project = state.project;

            // Skip if project reference hasn't changed
            if (project === previousProject) return;
            previousProject = project;

            // Skip persistence if we're currently syncing from visual settings
            // (this prevents the hydration sync from triggering reverse persistence)
            if (isSyncingFromVisual) {
                logDebug(
                    '[StoreSynchronization] Skipping persistence - currently syncing from visual'
                );
                return;
            }

            // Skip persistence until hydrated to avoid persisting default values
            if (!project.__hasHydrated__) return;

            const settings = useDenebVisualState.getState().settings;
            const changes: PropertyChange[] = [];

            for (const mapping of PROJECT_SYNC_MAPPINGS) {
                const appCoreValue = project[mapping.projectKey];
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
                    '[StoreSynchronization] App-core project changed, persisting to Power BI...',
                    { changes }
                );
                persistProjectProperties(changes);
            }
        })
    );

    return () => unsubscribers.forEach((unsub) => unsub());
};
