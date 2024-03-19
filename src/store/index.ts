import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ICommandsSlice, createCommandsSlice } from './commands';
import { ICreateSlice, createCreateSlice } from './create';
import { IDatasetSlice, createDatasetSlice } from './dataset';
import { IDebugSlice, createDebugSlice } from './debug';
import { IEditorSlice, createEditorSlice } from './editor';
import { IInterfaceSlice, createInterfaceSlice } from './interface';
import { IMigrationSlice, createMigrationSlice } from './migration';
import { IProcessingSlice, createProcessingSlice } from './processing';
import { ISpecificationSlice, createSpecificationSlice } from './specification';
import { ITemplateSlice, createTemplateSlice } from './template';
import { IVisualSlice, createVisualSlice } from './visual';
import { IVisualUpdateSlice, createVisualUpdateSlice } from './visual-update';
import { FEATURES } from '../../config';
import { IFieldUsageSliceState } from '@deneb-viz/core-dependencies';
import { createFieldUsageSlice } from './field-usage';

export type TStoreState = ICommandsSlice &
    ICreateSlice &
    IDatasetSlice &
    IDebugSlice &
    IEditorSlice &
    IFieldUsageSliceState &
    IInterfaceSlice &
    IMigrationSlice &
    IProcessingSlice &
    ISpecificationSlice &
    ITemplateSlice &
    IVisualSlice &
    IVisualUpdateSlice;

const store = create<TStoreState>()(
    devtools(
        (...a) => ({
            ...createCommandsSlice(...a),
            ...createCreateSlice(...a),
            ...createDatasetSlice(...a),
            ...createDebugSlice(...a),
            ...createEditorSlice(...a),
            ...createFieldUsageSlice(...a),
            ...createInterfaceSlice(...a),
            ...createMigrationSlice(...a),
            ...createProcessingSlice(...a),
            ...createSpecificationSlice(...a),
            ...createTemplateSlice(...a),
            ...createVisualSlice(...a),
            ...createVisualUpdateSlice(...a)
        }),
        { enabled: FEATURES.developer_mode }
    )
);

const getState = () => store.getState();

export default store;
export { getState };
