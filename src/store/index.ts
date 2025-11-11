import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/vanilla/shallow';
import { devtools } from 'zustand/middleware';
import { ICommandsSlice, createCommandsSlice } from './commands';
import { createCreateSlice } from './create';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { IDebugSlice, createDebugSlice } from './debug';
import { IEditorSlice, createEditorSlice } from './editor';
import { createExportSlice } from './export';
import { createFieldUsageSlice } from './field-usage';
import { IInterfaceSlice, createInterfaceSlice } from './interface';
import { IMigrationSlice, createMigrationSlice } from './migration';
import { IProcessingSlice, createProcessingSlice } from './processing';
import { ISpecificationSlice, createSpecificationSlice } from './specification';
import { IVisualSlice, createVisualSlice } from './visual';
import { IVisualUpdateSlice, createVisualUpdateSlice } from './visual-update';
import { FEATURES } from '../../config';
import {
    ICreateSliceState,
    IExportSliceState,
    IFieldUsageSliceState
} from '@deneb-viz/core-dependencies';

export type TStoreState = ICommandsSlice &
    ICreateSliceState &
    IDatasetSlice &
    IDebugSlice &
    IEditorSlice &
    IExportSliceState &
    IFieldUsageSliceState &
    IInterfaceSlice &
    IMigrationSlice &
    IProcessingSlice &
    ISpecificationSlice &
    IVisualSlice &
    IVisualUpdateSlice;

const store = createWithEqualityFn<TStoreState>()(
    devtools(
        (...a) => ({
            ...createCommandsSlice(...a),
            ...createCreateSlice(...a),
            ...createDatasetSlice(...a),
            ...createDebugSlice(...a),
            ...createEditorSlice(...a),
            ...createExportSlice(...a),
            ...createFieldUsageSlice(...a),
            ...createInterfaceSlice(...a),
            ...createMigrationSlice(...a),
            ...createProcessingSlice(...a),
            ...createSpecificationSlice(...a),
            ...createVisualSlice(...a),
            ...createVisualUpdateSlice(...a)
        }),
        { enabled: FEATURES.developer_mode }
    ),
    shallow
);

const getState = () => store.getState();

export default store;
export { getState };
