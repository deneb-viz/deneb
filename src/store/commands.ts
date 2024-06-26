import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { Command } from '../features/commands';

type ICommandsSliceProperties = {
    [command in Command]: boolean;
};

export interface ICommandsSlice {
    commands: ICommandsSliceProperties;
}

const sliceStateInitializer = () =>
    <ICommandsSlice>{
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
    ICommandsSlice
> = sliceStateInitializer;
