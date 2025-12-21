import { StateCreator } from 'zustand';

import {
    type DenebTemplateImportState,
    type DenebTemplateAllocationComponents,
    type DenebTemplateSetImportFilePayload,
    type DenebTemplateImportWorkingProperties,
    type DenebTemplateCreateMode
} from '@deneb-viz/json-processing/template-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type StoreState } from './state';
import {
    areAllCreateDataRequirementsMet,
    getNewCreateFromTemplateSliceProperties
} from '@deneb-viz/json-processing';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';

/**
 * Represents the create slice in the visual store.
 */
export type CreateSliceState = {
    create: CreateSliceProperties;
};

/**
 * Represents the create slice properties in the visual store.
 */
export type CreateSliceProperties = DenebTemplateImportWorkingProperties & {
    createFromTemplate: () => void;
    setFieldAssignment: (payload: CreateSliceSetFieldAssignment) => void;
    setImportFile: (payload: DenebTemplateSetImportFilePayload) => void;
    setImportState: (payload: CreateSliceSetImportState) => void;
    setMode: (mode: DenebTemplateCreateMode) => void;
    setTemplate: (payload: ICreateSliceSetTemplate) => void;
};

/**
 * Represents the payload used to instigate creation of a new specification from a template.
 */
export type CreateSliceCreateFromTemplate = {
    jsonSpec: string;
    jsonConfig: string;
};

/**
 * Represents the payload for a template field assignment.
 */
export type CreateSliceSetFieldAssignment = {
    key: string;
    suppliedObjectKey: string | undefined;
    suppliedObjectName: string | undefined;
};

/**
 * Represents the payload for a template import state.
 */
export type CreateSliceSetImportState = {
    /**
     * Desired import state to transition to.
     */
    importState: DenebTemplateImportState;
    /**
     * Whether to refresh the create properties (e.g. when importing a new template).
     */
    refresh?: boolean;
};

/**
 * Represents the payload for a selected template (included in visual).
 */
export interface ICreateSliceSetTemplate {
    candidates: DenebTemplateAllocationComponents;
    metadata: UsermetaTemplate;
}

export const createCreateSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        CreateSliceState
    > =>
    (set) => ({
        create: {
            ...getNewCreateFromTemplateSliceProperties(),
            createFromTemplate: () =>
                set(
                    (state) => handleCreateFromTemplate(state),
                    false,
                    'create.createFromTemplate'
                ),
            setFieldAssignment: (payload: CreateSliceSetFieldAssignment) =>
                set(
                    (state: StoreState) =>
                        handleSetFieldAssignment(state, payload),
                    false,
                    'create.setFieldAssignment'
                ),
            setImportFile: (payload) =>
                set(
                    (state) => handleSetImportFile(state, payload),
                    false,
                    'create.setImportFile'
                ),
            setImportState: (payload) =>
                set(
                    (state) => handleSetImportState(state, payload),
                    false,
                    'create.setImportState'
                ),
            setMode: (mode) =>
                set(
                    (state) => handleSetMode(state, mode),
                    false,
                    'create.setMode'
                ),
            setTemplate: (payload) =>
                set(
                    (state) => handleSetTemplate(state, payload),
                    false,
                    'create.setTemplate'
                )
        }
    });

/**
 * Take the supplied template and process it ready for creation.
 */
const handleCreateFromTemplate = (state: StoreState): Partial<StoreState> => {
    const modalDialogRole = 'None';
    return {
        editorSelectedOperation: 'Spec',
        interface: { ...state.interface, modalDialogRole }
    };
};

/**
 * For the given key, set its placeholder value to match the supplied dataset
 * field.
 */
const handleSetFieldAssignment = (
    state: StoreState,
    payload: CreateSliceSetFieldAssignment
): Partial<StoreState> => {
    const { dataset } = state.create?.metadata || {};
    if (dataset) {
        const phIndex =
            dataset.findIndex((ph) => ph.key === payload.key) ?? dataset.length;
        const metadata = {
            ...state.create.metadata,
            dataset:
                phIndex === -1
                    ? [...dataset]
                    : [
                          ...dataset.slice(0, phIndex),
                          <UsermetaDatasetField>{
                              ...dataset[phIndex],
                              suppliedObjectKey: payload.suppliedObjectKey,
                              suppliedObjectName: payload.suppliedObjectName
                          },
                          ...dataset.slice(phIndex + 1, dataset.length)
                      ]
        } as UsermetaTemplate;
        const {
            metadataAllDependenciesAssigned = false,
            metadataAllFieldsAssigned = false
        } = areAllCreateDataRequirementsMet(metadata);
        return {
            create: {
                ...state.create,
                metadata,
                metadataAllDependenciesAssigned,
                metadataAllFieldsAssigned
            }
        };
    }
    return {};
};

/**
 * Updates the dataset and related properties, after this has been processed.
 */
const handleSetImportFile = (
    state: StoreState,
    payload: DenebTemplateSetImportFilePayload
): Partial<StoreState> => {
    const { candidates, importFile, importState, metadata } = payload;
    const {
        metadataAllDependenciesAssigned = false,
        metadataAllFieldsAssigned = false
    } = areAllCreateDataRequirementsMet(metadata);
    return {
        create: {
            ...state.create,
            ...{
                candidates,
                importFile,
                importState,
                metadata,
                metadataAllDependenciesAssigned,
                metadataAllFieldsAssigned
            }
        }
    };
};

/**
 * Updates the current state of import file processing (for the UI).
 */
const handleSetImportState = (
    state: StoreState,
    payload: CreateSliceSetImportState
): Partial<StoreState> => {
    const { importState, refresh } = payload;
    return refresh
        ? {
              create: {
                  ...state.create,
                  ...getNewCreateFromTemplateSliceProperties(),
                  importState
              }
          }
        : { create: { ...state.create, importState } };
};

/**
 * Updates the dataset and related properties, after this has been processed.
 */
const handleSetMode = (
    state: StoreState,
    mode: DenebTemplateCreateMode
): Partial<StoreState> => {
    return {
        create: {
            ...state.create,
            importFile: '',
            importState: 'None',
            metadata: <UsermetaTemplate>{},
            metadataAllDependenciesAssigned: false,
            metadataAllFieldsAssigned: false,
            metadataDrilldownAssigned: false,
            mode
        }
    };
};

/**
 * Sets the template specification and metadata from the UI.
 */
const handleSetTemplate = (
    state: StoreState,
    payload: ICreateSliceSetTemplate
): Partial<StoreState> => {
    const { metadata, candidates } = payload;
    const {
        metadataAllDependenciesAssigned = false,
        metadataAllFieldsAssigned = false
    } = areAllCreateDataRequirementsMet(metadata);
    return {
        create: {
            ...state.create,
            candidates,
            metadata,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned
        }
    };
};
