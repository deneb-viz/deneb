import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/vanilla/shallow';
import { devtools } from 'zustand/middleware';
import { createCommandsSlice } from './commands';
import { createCreateSlice } from './create';
import { createDatasetSlice } from './dataset';
import { createDebugSlice } from './debug';
import { createEditorSlice } from './editor';
import { createExportSlice } from './export';
import { createFieldUsageSlice } from './field-usage';
import { createInterfaceSlice } from './interface';
import { createMigrationSlice } from './migration';
import { createProcessingSlice } from './processing';
import { createSpecificationSlice } from './specification';
import { createVisualSlice } from './visual';
import { createVisualUpdateSlice } from './visual-update';
import { FEATURES } from '../../config';
import {
    type DebugSlice,
    type CommandsSlice,
    type CreateSliceState,
    type DatasetSlice,
    type EditorSlice,
    type ExportSliceState,
    type FieldUsageSliceState,
    type InterfaceSlice,
    type MigrationSlice,
    type ProcessingSlice,
    type SpecificationSlice,
    type VisualSlice,
    type VisualUpdateSlice
} from '@deneb-viz/app-core';

export type TStoreState = CommandsSlice &
    CreateSliceState &
    DatasetSlice &
    DebugSlice &
    EditorSlice &
    ExportSliceState &
    FieldUsageSliceState &
    InterfaceSlice &
    MigrationSlice &
    ProcessingSlice &
    SpecificationSlice &
    VisualSlice &
    VisualUpdateSlice;

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
