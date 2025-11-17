import { type StateCreator } from 'zustand';
import type {} from 'zustand/middleware';

import { type Command } from '../lib/commands';
import { type StoreState } from './state';

export type CommandsSliceProperties = {
    [command in Command]: boolean;
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
            debugPaneToggle: true,
            discardChanges: true,
            editorFocusOut: true,
            editorPaneToggle: true,
            exportSpecification: true,
            fieldMappings: true,
            helpSite: true,
            navigateConfig: true,
            navigateSettings: true,
            navigateSpecification: true,
            newSpecification: true,
            themeToggle: true,
            zoomFit: true,
            zoomIn: true,
            zoomLevel: true,
            zoomOut: true,
            zoomReset: true
        }
    });
