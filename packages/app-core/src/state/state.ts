import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import { createCommandsSlice, type CommandsSlice } from './commands';
import { createCreateSlice, type CreateSliceState } from './create';
import { createDatasetSlice, type DatasetSlice } from './dataset';
import { createDebugSlice, type DebugSlice } from './debug';
import { createEditorSlice, type EditorSlice } from './editor';
import {
    createEditorPreferencesSlice,
    EditorPreferencesSlice
} from './editor-preferences';
import { createExportSlice, type ExportSliceState } from './export';
import {
    createFieldUsageSlice,
    type FieldUsageSliceState
} from './field-usage';
import { createI18nSlice, I18nSlice } from './i18n';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createMigrationSlice, type MigrationSlice } from './migration';
import { createProjectSlice, type ProjectSlice } from './project';
import {
    createSpecificationSlice,
    type SpecificationSlice
} from './specification';
import {
    createVisualRenderSlice,
    type VisualRenderSlice
} from './visual-render';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { APPLICATION_VERSION } from '../lib/application';

export type StoreState = CommandsSlice &
    CreateSliceState &
    DatasetSlice &
    DebugSlice &
    EditorSlice &
    EditorPreferencesSlice &
    ExportSliceState &
    FieldUsageSliceState &
    I18nSlice &
    InterfaceSlice &
    MigrationSlice &
    ProjectSlice &
    SpecificationSlice &
    VisualRenderSlice;

export type StateDependencies = {
    applicationVersion: string;
};

/**
 * A slice of state that can be synchronized and hydrated.
 */
export type SyncableSlice = {
    /**
     * Indicates whether the slice has been hydrated from an external source. This can be used by subscribers to
     * determine if they should perform synchronization actions.
     */
    __hasHydrated__: boolean;
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
                ...createEditorPreferencesSlice()(...a),
                ...createExportSlice(dependencies)(...a),
                ...createFieldUsageSlice()(...a),
                ...createI18nSlice()(...a),
                ...createInterfaceSlice()(...a),
                ...createMigrationSlice()(...a),
                ...createProjectSlice()(...a),
                ...createSpecificationSlice()(...a),
                ...createVisualRenderSlice()(...a)
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
    applicationVersion: APPLICATION_VERSION
};

const useDenebState = createDenebState(dependencies);
const getDenebState = () => useDenebState.getState();

export { getDenebState, useDenebState };
