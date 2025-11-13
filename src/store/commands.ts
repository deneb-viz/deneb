import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { type CommandsSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = () =>
    <CommandsSlice>{
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
    };

export const createCommandsSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    CommandsSlice
> = sliceStateInitializer;
