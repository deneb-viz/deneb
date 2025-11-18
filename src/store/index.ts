import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/vanilla/shallow';
import { devtools } from 'zustand/middleware';
import { createDatasetSlice } from './dataset';
import { createEditorSlice } from './editor';
import { createVisualSlice } from './visual';
import { APPLICATION_INFORMATION, FEATURES } from '../../config';
import {
    createCommandsSlice,
    createCreateSlice,
    createDebugSlice,
    createExportSlice,
    createFieldUsageSlice,
    createInterfaceSlice,
    createMigrationSlice,
    createProcessingSlice,
    createSpecificationSlice,
    createVisualUpdateSlice,
    StateDependencies,
    type StoreState
} from '@deneb-viz/app-core';

const dependencies: StateDependencies = {
    applicationVersion: APPLICATION_INFORMATION.version
};

const store = createWithEqualityFn<StoreState>()(
    devtools(
        (...a) => ({
            ...createCommandsSlice()(...a),
            ...createCreateSlice()(...a),
            ...createDatasetSlice(...a),
            ...createDebugSlice()(...a),
            ...createEditorSlice(...a),
            ...createExportSlice(dependencies)(...a),
            ...createFieldUsageSlice()(...a),
            ...createInterfaceSlice()(...a),
            ...createMigrationSlice()(...a),
            ...createProcessingSlice()(...a),
            ...createSpecificationSlice()(...a),
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
