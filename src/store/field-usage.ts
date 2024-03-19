import { NamedSet } from 'zustand/middleware';
import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { IFieldUsageSliceState } from '@deneb-viz/core-dependencies';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IFieldUsageSliceState>{
        fieldUsage: {
            dataset: {},
            drilldown: {
                isCurrent: false,
                isMappingRequired: false
            },
            editorShouldSkipRemap: false,
            remapFields: [],
            remapAllDependenciesAssigned: false,
            remapAllFieldsAssigned: false,
            remapDrilldownAssigned: false,
            tokenizedSpec: <unknown>null,
            applyFieldMapping: (payload) => {},
            setFieldAssignment: (payload) => {}
        }
    };

export const createFieldUsageSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IFieldUsageSliceState
> = sliceStateInitializer;
