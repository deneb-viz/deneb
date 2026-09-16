import { type StateCreator } from 'zustand';

import { type Command, type DerivedCommand } from '../lib/commands';
import type { StoreState } from '@deneb-viz/app-core';

/**
 * `exportSpecification`/`zoomFit`/`zoomIn`/`zoomOut`/`zoomReset` are
 * excluded (`DerivedCommand`, lib/commands/types.ts): their enabled state
 * is derived on read via `selectExportSpecificationCommandEnabled`/
 * `selectZoomCommandsState` (lib/commands/selectors.ts) rather than stored
 * here — nothing writes or reads them as stored flags any more.
 */
export type CommandsSliceProperties = {
    [command in Exclude<Command, DerivedCommand>]: boolean;
};

export type CommandsSlice = {
    commands: CommandsSliceProperties;
};

export const createCommandsSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        CommandsSlice
    > =>
    () => ({
        commands: {
            applyChanges: true,
            autoApplyToggle: true,
            debugPaneShowData: true,
            debugPaneShowLogs: true,
            debugPaneShowSignals: true,
            debugPaneShowSource: true,
            debugPaneToggle: true,
            discardChanges: true,
            editorFocusOut: true,
            editorPaneToggle: true,
            fieldMappings: true,
            helpSite: true,
            navigateConfig: true,
            navigateSettings: true,
            navigateSpecification: true,
            newSpecification: true,
            themeToggle: true,
            zoomLevel: true
        }
    });
