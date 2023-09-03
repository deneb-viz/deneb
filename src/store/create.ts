import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    TTemplateImportState,
    TTemplateProvider
} from '../features/template';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { areAllCreateDataRequirementsMet } from '../features/visual-create';
import { logDebug } from '../features/logging';
import { TSpecProvider } from '../core/vega';

export interface ICreateSliceProperties {
    importFile: string;
    importState: TTemplateImportState;
    metadata: IDenebTemplateMetadata;
    metadataAllDependenciesAssigned: boolean;
    metadataAllFieldsAssigned: boolean;
    mode: TTemplateProvider;
    provider: TSpecProvider;
    specification: Spec | TopLevelSpec;
}

interface ICreateSlicePropertiesWithReducers extends ICreateSliceProperties {
    createFromTemplate: () => void;
    setFieldAssignment: (payload: ICreateSliceSetFieldAssignment) => void;
    setImportFile: (payload: ICreateSliceSetImportFile) => void;
    setImportState: (payload: TTemplateImportState) => void;
    setMode: (mode: TTemplateProvider) => void;
    setTemplate: (payload: ICreateSliceSetTemplate) => void;
}

export interface ICreateSlice {
    create: ICreateSlicePropertiesWithReducers;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ICreateSlice>{
        create: {
            importFile: null,
            importState: 'None',
            metadata: null,
            metadataAllDependenciesAssigned: false,
            metadataAllFieldsAssigned: false,
            mode: 'import',
            provider: null,
            specification: null,
            createFromTemplate: () =>
                set(
                    (state: TStoreState) => handleCreateFromTemplate(state),
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
            setImportFile: (payload: ICreateSliceSetImportFile) =>
                set(
                    (state: TStoreState) => handleSetImportFile(state, payload),
                    false,
                    'create.setImportFile'
                ),
            setImportState: (importState: TTemplateImportState) =>
                set(
                    (state: TStoreState) =>
                        handleSetImportState(state, importState),
                    false,
                    'create.setImportState'
                ),
            setMode: (mode: TTemplateProvider) =>
                set(
                    (state: TStoreState) => handleSetMode(state, mode),
                    false,
                    'create.setMode'
                ),
            setTemplate: (payload: ICreateSliceSetTemplate) =>
                set(
                    (state: TStoreState) => handleSetTemplate(state, payload),
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
 * Represents the payload for a template field assignment.
 */
interface ICreateSliceSetFieldAssignment {
    key: string;
    suppliedObjectName: string;
}

/**
 * Represents the payload for a processed template file.
 */
interface ICreateSliceSetImportFile {
    specification: Spec | TopLevelSpec;
    metadata: IDenebTemplateMetadata;
    importFile: string | null;
    importState: TTemplateImportState;
}

/**
 * Represents the payload for a selected template (included in visual).
 */
interface ICreateSliceSetTemplate {
    specification: Spec | TopLevelSpec;
    metadata: IDenebTemplateMetadata;
}

const handleCreateFromTemplate = (
    state: TStoreState
): Partial<TStoreState> => ({
    interface: { ...state.interface, modalDialogRole: 'None' }
});

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
        logDebug('handleSetFieldAssignment', { payload, phIndex });
        const metadata = {
            ...state.create.metadata,
            dataset:
                phIndex === -1
                    ? [...dataset]
                    : [
                          ...dataset.slice(0, phIndex),
                          <ITemplateDatasetField>{
                              ...dataset[phIndex],
                              suppliedObjectName: payload.suppliedObjectName
                          },
                          ...dataset.slice(phIndex + 1, dataset.length)
                      ]
        };
        const { metadataAllDependenciesAssigned, metadataAllFieldsAssigned } =
            areAllCreateDataRequirementsMet(metadata);
        return {
            create: {
                ...state.create,
                metadata,
                metadataAllDependenciesAssigned,
                metadataAllFieldsAssigned
            }
        };
    }
};

/**
 * Updates the dataset and related properties, after this has been processed.
 */
const handleSetImportFile = (
    state: TStoreState,
    payload: ICreateSliceSetImportFile
): Partial<TStoreState> => {
    const { importFile, importState, metadata, specification } = payload;
    const { metadataAllDependenciesAssigned, metadataAllFieldsAssigned } =
        areAllCreateDataRequirementsMet(metadata);
    const provider = metadata.deneb.provider;
    return {
        create: {
            ...state.create,
            ...{
                importFile,
                importState,
                metadata,
                metadataAllDependenciesAssigned,
                metadataAllFieldsAssigned,
                provider,
                specification
            }
        }
    };
};

/**
 * Updates the current state of import file processing (for the UI).
 */
const handleSetImportState = (
    state: TStoreState,
    importState: TTemplateImportState
): Partial<TStoreState> => ({ create: { ...state.create, importState } });

/**
 * Updates the dataset and related properties, after this has been processed.
 */
const handleSetMode = (
    state: TStoreState,
    mode: TTemplateProvider
): Partial<TStoreState> => {
    return {
        create: {
            ...state.create,
            importFile: null,
            importState: 'None',
            metadata: null,
            metadataAllDependenciesAssigned: false,
            metadataAllFieldsAssigned: false,
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
    const { metadata, specification } = payload;
    const { metadataAllDependenciesAssigned, metadataAllFieldsAssigned } =
        areAllCreateDataRequirementsMet(metadata);
    const provider = metadata.deneb.provider;
    return {
        create: {
            ...state.create,
            metadata,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned,
            provider,
            specification
        }
    };
};
