import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/vanilla/shallow';
import { devtools } from 'zustand/middleware';
import { createCommandsSlice } from './commands';
import { createCreateSlice } from './create';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { createDebugSlice } from './debug';
import { IEditorSlice, createEditorSlice } from './editor';
import { createExportSlice } from './export';
import { createFieldUsageSlice } from './field-usage';
import { createInterfaceSlice } from './interface';
import { createMigrationSlice } from './migration';
import { createProcessingSlice } from './processing';
import { createSpecificationSlice } from './specification';
import { IVisualSlice, createVisualSlice } from './visual';
import { IVisualUpdateSlice, createVisualUpdateSlice } from './visual-update';
import { FEATURES } from '../../config';
import {
    type DebugSlice,
    type CommandsSlice,
    type CreateSliceState,
    type ExportSliceState,
    type FieldUsageSliceState,
    type MigrationSlice,
    type ProcessingSlice,
    type SpecificationSlice,
    InterfaceSlice
} from '@deneb-viz/app-core';

export type TStoreState = CommandsSlice &
    CreateSliceState &
    IDatasetSlice & //
    DebugSlice &
    IEditorSlice & //
    ExportSliceState &
    FieldUsageSliceState &
    InterfaceSlice &
    MigrationSlice &
    ProcessingSlice &
    SpecificationSlice &
    IVisualSlice & //
    IVisualUpdateSlice; //

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
