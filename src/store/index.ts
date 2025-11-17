import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/vanilla/shallow';
import { devtools } from 'zustand/middleware';
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
import { FEATURES } from '../../config';
import {
    createCommandsSlice,
    createCreateSlice,
    createVisualUpdateSlice,
    type StoreState
} from '@deneb-viz/app-core';

const store = createWithEqualityFn<StoreState>()(
    devtools(
        (...a) => ({
            ...createCommandsSlice()(...a),
            ...createCreateSlice()(...a),
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
            ...createVisualUpdateSlice()(...a)
        }),
        { enabled: FEATURES.developer_mode }
    ),
    shallow
);

const getState = () => store.getState();

export default store;
export { getState };
