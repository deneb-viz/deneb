import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import {
    CreateMode,
    ICreateSliceProperties,
    ICreateSliceSetFieldAssignment,
    ICreateSliceSetImportFile,
    ICreateSliceSetImportState,
    ICreateSliceSetTemplate,
    UsermetaDatasetField,
    UsermetaTemplate
} from '@deneb-viz/core-dependencies';
import {
    areAllCreateDataRequirementsMet,
    getNewCreateFromTemplateSliceProperties
} from '@deneb-viz/json-processing';

export interface ICreateSlicePropertiesLegacy {
    metadataAllDependenciesAssigned: boolean;
    metadataAllFieldsAssigned: boolean;
}

export interface ICreateSlice {
    create: ICreateSliceProperties;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ICreateSlice>{
        create: {
            ...getNewCreateFromTemplateSliceProperties(),
            createFromTemplate: () =>
                set(
                    (state) => handleCreateFromTemplate(state),
                    false,
                    'create.createFromTemplate'
                ),
            setFieldAssignment: (payload: ICreateSliceSetFieldAssignment) =>
                set(
                    (state: TStoreState) =>
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
    };

export const createCreateSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    ICreateSlice
> = sliceStateInitializer;

/**
 * Take the supplied template and process it ready for creation.
 */
const handleCreateFromTemplate = (state: TStoreState): Partial<TStoreState> => {
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
    state: TStoreState,
    payload: ICreateSliceSetFieldAssignment
): Partial<TStoreState> => {
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
        };
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
    state: TStoreState,
    payload: ICreateSliceSetImportFile
): Partial<TStoreState> => {
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
    state: TStoreState,
    payload: ICreateSliceSetImportState
): Partial<TStoreState> => {
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
    state: TStoreState,
    mode: CreateMode
): Partial<TStoreState> => {
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
    state: TStoreState,
    payload: ICreateSliceSetTemplate
): Partial<TStoreState> => {
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
