import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import { createCommandsSlice, type CommandsSlice } from './commands';
import { createCreateSlice, type CreateSliceState } from './create';
import { createDatasetSlice, type DatasetSlice } from './dataset';
import { createDebugSlice, type DebugSlice } from './debug';
import { createEditorSlice, type EditorSlice } from './editor';
import { createExportSlice, type ExportSliceState } from './export';
import {
    createFieldUsageSlice,
    type FieldUsageSliceState
} from './field-usage';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createMigrationSlice, type MigrationSlice } from './migration';
import { createProcessingSlice, type ProcessingSlice } from './processing';
import {
    createSpecificationSlice,
    type SpecificationSlice
} from './specification';
import { createVisualSlice, type VisualSlice } from './visual';
import {
    createVisualUpdateSlice,
    type VisualUpdateSlice
} from './visual-update';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { APPLICATION_INFORMATION_CONFIGURATION } from '@deneb-viz/configuration';

export type StoreState = CommandsSlice &
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

export type StateDependencies = {
    applicationVersion: string;
};

export const createDenebState = (dependencies: StateDependencies) =>
    createWithEqualityFn<StoreState>()(
        devtools(
            (...a) => ({
                ...createCommandsSlice()(...a),
                ...createCreateSlice()(...a),
                ...createDatasetSlice()(...a),
                ...createDebugSlice()(...a),
                ...createEditorSlice()(...a),
                ...createExportSlice(dependencies)(...a),
                ...createFieldUsageSlice()(...a),
                ...createInterfaceSlice()(...a),
                ...createMigrationSlice()(...a),
                ...createProcessingSlice()(...a),
                ...createSpecificationSlice()(...a),
                ...createVisualSlice()(...a),
                ...createVisualUpdateSlice()(...a)
            }),
            { enabled: toBoolean(process.env.ZUSTAND_DEV_TOOLS) }
        ),
        shallow
    );

/**
 * Set up a singleton Deneb state store.
 * TODO: eventually move to dependency injection pattern.
 */
const dependencies: StateDependencies = {
    applicationVersion: APPLICATION_INFORMATION_CONFIGURATION.version
};

const useState = createDenebState(dependencies);
const getState = () => useState.getState();

export { getState, useState };
