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
import { createI18nSlice, I18nSlice } from './i18n';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createMigrationSlice, type MigrationSlice } from './migration';
import {
    createSpecificationSlice,
    type SpecificationSlice
} from './specification';
import { createVisualSlice, type VisualSlice } from './visual';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { APPLICATION_INFORMATION_CONFIGURATION } from '@deneb-viz/configuration';
import { createProjectSlice, ProjectSlice } from './project';

export type StoreState = CommandsSlice &
    CreateSliceState &
    DatasetSlice &
    DebugSlice &
    EditorSlice &
    ExportSliceState &
    FieldUsageSliceState &
    I18nSlice &
    InterfaceSlice &
    MigrationSlice &
    ProjectSlice &
    SpecificationSlice &
    VisualSlice;

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
                ...createI18nSlice()(...a),
                ...createInterfaceSlice()(...a),
                ...createMigrationSlice()(...a),
                ...createProjectSlice()(...a),
                ...createSpecificationSlice()(...a),
                ...createVisualSlice()(...a)
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

const useDenebState = createDenebState(dependencies);
const getDenebState = () => useDenebState.getState();

export { getDenebState, useDenebState };
