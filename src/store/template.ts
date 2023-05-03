import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { ErrorObject } from 'ajv';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { TStoreState } from '.';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField
} from '../features/template';

import { templates } from '../templates';
import { TSpecProvider } from '../core/vega';
import { DATASET_NAME } from '../constants';
import {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from '../features/template';
import { getNewExportTemplateMetadata } from '../features/visual-export';
import {
    getImportPlaceholderResolutionStatus,
    resolveTemplatesForProvider
} from '../features/visual-create';
import { getTemplateWithBasePowerBiTheme } from '../features/powerbi-vega-extensibility';

// tslint:disable:max-func-body-length

export interface ITemplateSlice {
    templateSelectedIndex: number;
    templateFile: File;
    templateImportState: TTemplateImportState;
    templateExportState: TTemplateExportState;
    templateImportErrorMessage: string;
    templateExportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
    templateFileRawContent: string;
    templateIncludePreviewImage: boolean;
    templatePreviewImageDataUri: string;
    templateToApply: Spec | TopLevelSpec;
    templateExportMetadata: IDenebTemplateMetadata;
    templateAllImportCriteriaApplied: boolean;
    templateAllExportCriteriaApplied: boolean;
    templateProvider: TTemplateProvider;
    templateSpecProvider: TSpecProvider;
    templateSelectedExportOperation: TExportOperation;
    vegaLite: TopLevelSpec[];
    vega: Spec[];
    initializeImportExport: () => void;
    syncTemplateExportDataset: (payload: ITemplateDatasetField[]) => void;
    updateTemplatePreviewImage: (
        payload: ITemplatePlaceholderImagePayload
    ) => void;
    updateTemplatePlaceholder: (payload: IPlaceholderValuePayload) => void;
    updateTemplateExportPropertyBySelector: (
        payload: ITemplateExportFieldUpdatePayload
    ) => void;
    updateSelectedExportOperation: (
        templateSelectedExportOperation: TExportOperation
    ) => void;
    updateSelectedTemplateProvider: (
        templateProvider: TTemplateProvider
    ) => void;
    updateSelectedTemplate: (index: number) => void;
    updateTemplateExportError: (message: string) => void;
    updateTemplateExportState: (exportState: TTemplateExportState) => void;
    updateTemplateImportError: (payload: ITemplateImportErrorPayload) => void;
    updateTemplateImportState: (importState: TTemplateImportState) => void;
    updateTemplateImportSuccess: (payload: ITemplateImportPayload) => void;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ITemplateSlice>{
        ...{
            templateAllImportCriteriaApplied: false,
            templateAllExportCriteriaApplied: false,
            templateFile: null,
            templateImportState: 'None',
            templateExportState: 'None',
            templateImportErrorMessage: null,
            templateExportErrorMessage: null,
            templateSchemaErrors: [],
            templateFileRawContent: null,
            templateIncludePreviewImage: false,
            templatePreviewImageDataUri: null,
            templateToApply: getTemplateWithBasePowerBiTheme(
                templates.vegaLite[0]
            ),
            templateExportMetadata: null,
            templateSelectedIndex: 0,
            templateSelectedExportOperation: 'information',
            templateSpecProvider: 'vegaLite',
            templateProvider: 'vegaLite',
            initializeImportExport: () =>
                set(
                    (state) => handleInitializeImportExport(state),
                    false,
                    'initializeImportExport'
                ),
            syncTemplateExportDataset: (payload) =>
                set(
                    (state) => handleSyncTemplateExportDataset(state, payload),
                    false,
                    'syncTemplateExportDataset'
                ),
            updateTemplatePreviewImage: (payload) =>
                set(
                    (state) => handleUpdateTemplatePreviewImage(state, payload),
                    false,
                    'updateTemplatePreviewImage'
                ),
            updateTemplatePlaceholder: (payload) =>
                set(
                    (state) => handleUpdateTemplatePlaceholder(state, payload),
                    false,
                    'updateTemplatePlaceholder'
                ),
            updateTemplateExportPropertyBySelector: (payload) =>
                set(
                    (state) =>
                        handleUpdateTemplateExportPropertyBySelector(
                            state,
                            payload
                        ),
                    false,
                    'updateTemplateExportPropertyBySelector'
                ),
            updateSelectedExportOperation: (templateSelectedExportOperation) =>
                set(
                    (state) =>
                        handleUpdateSelectedExportOperation(
                            state,
                            templateSelectedExportOperation
                        ),
                    false,
                    'updateSelectedExportOperation'
                ),
            updateSelectedTemplateProvider: (templateProvider) =>
                set(
                    (state) =>
                        handleUpdateSelectedTemplateProvider(
                            state,
                            templateProvider
                        ),
                    false,
                    'updateSelectedTemplateProvider'
                ),
            updateSelectedTemplate: (index) =>
                set(
                    (state) => handleUpdateSelectedTemplate(state, index),
                    false,
                    'updateSelectedTemplate'
                ),
            updateTemplateExportError: (message) =>
                set(
                    (state) => handleTemplateExportError(state, message),
                    false,
                    'updateTemplateExportError'
                ),
            updateTemplateExportState: (exportState) =>
                set(
                    (state) => handleTemplateExportState(state, exportState),
                    false,
                    'updateTemplateExportState'
                ),
            updateTemplateImportError: (payload) =>
                set(
                    (state) => handleTemplateImportError(state, payload),
                    false,
                    'updateTemplateImportError'
                ),
            updateTemplateImportState: (importState) =>
                set(
                    (state) => handleTemplateImportState(state, importState),
                    false,
                    'updateTemplateImportState'
                ),
            updateTemplateImportSuccess: (payload) =>
                set(
                    (state) => handleTemplateImportSuccess(state, payload),
                    false,
                    'updateTemplateImportSuccess'
                )
        },
        ...templates
    };

export const createTemplateSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    ITemplateSlice
> = sliceStateInitializer;

interface ITemplateExportFieldUpdatePayload {
    selector: string;
    value: string;
}

export interface ITemplateImportPayload {
    templateFile: File;
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    provider?: TSpecProvider;
}

interface ITemplateImportErrorPayload {
    templateImportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
}

interface IPlaceholderValuePayload {
    key: string;
    objectName: string;
}

interface ITemplatePlaceholderImagePayload {
    include: boolean;
    dataUri: string;
}

const handleInitializeImportExport = (
    state: TStoreState
): Partial<TStoreState> => ({
    templateAllImportCriteriaApplied: getImportPlaceholderResolutionStatus(
        templates.vegaLite[0]
    ),
    templateExportMetadata: getNewExportTemplateMetadata()
});

const handleSyncTemplateExportDataset = (
    state: TStoreState,
    payload: ITemplateDatasetField[]
): Partial<TStoreState> => ({
    templateExportMetadata: {
        ...state.templateExportMetadata,
        ...{
            dataset: payload.map((d) => {
                let match = state.templateExportMetadata.dataset.find(
                    (ds) => ds.key === d.key
                );
                if (match) {
                    return {
                        ...match,
                        ...{
                            name: d.name,
                            namePlaceholder: d.namePlaceholder
                        }
                    };
                }
                return d;
            })
        }
    }
});

const handleUpdateTemplatePreviewImage = (
    state: TStoreState,
    payload: ITemplatePlaceholderImagePayload
): Partial<TStoreState> => ({
    templateIncludePreviewImage: payload.include,
    templatePreviewImageDataUri: payload.dataUri
});

const handleUpdateTemplateExportPropertyBySelector = (
    state: TStoreState,
    payload: ITemplateExportFieldUpdatePayload
): Partial<TStoreState> => ({
    templateExportMetadata: set(
        cloneDeep(state.templateExportMetadata),
        payload.selector,
        payload.value
    )
});

const handleUpdateSelectedExportOperation = (
    state: TStoreState,
    templateSelectedExportOperation: TExportOperation
): Partial<TStoreState> => ({
    templateSelectedExportOperation
});

const handleUpdateSelectedTemplateProvider = (
    state: TStoreState,
    templateProvider: TTemplateProvider
): Partial<TStoreState> => {
    const templateIdx = 0,
        isImport = templateProvider === 'import';
    const templateToApply = isImport
        ? null
        : state[templateProvider][templateIdx];
    return {
        templateProvider,
        templateFile: null,
        templateImportState: 'None',
        templateImportErrorMessage: null,
        templateSchemaErrors: [],
        templateFileRawContent: null,
        templateSelectedIndex: isImport ? null : templateIdx,
        templateToApply,
        templateSpecProvider: isImport ? null : templateProvider,
        templateAllImportCriteriaApplied: isImport
            ? false
            : getImportPlaceholderResolutionStatus(templateToApply)
    };
};

const handleUpdateSelectedTemplate = (
    state: TStoreState,
    index: number
): Partial<TStoreState> => {
    const templateToApply = getTemplateWithBasePowerBiTheme(
        resolveTemplatesForProvider()[index]
    );
    return {
        templateSelectedIndex: index,
        templateToApply,
        templateAllImportCriteriaApplied:
            getImportPlaceholderResolutionStatus(templateToApply)
    };
};

const handleTemplateExportError = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => ({
    templateExportState: 'Error',
    templateImportErrorMessage: message
});

const handleTemplateExportState = (
    state: TStoreState,
    exportState: TTemplateExportState
): Partial<TStoreState> => ({
    templateExportState: exportState,
    templateImportErrorMessage: null
});

const handleTemplateImportError = (
    state: TStoreState,
    payload: ITemplateImportErrorPayload
): Partial<TStoreState> => ({
    templateImportState: 'Error',
    templateImportErrorMessage: payload.templateImportErrorMessage,
    templateSchemaErrors: payload.templateSchemaErrors
});

const handleTemplateImportState = (
    state: TStoreState,
    importState: TTemplateImportState
): Partial<TStoreState> => ({
    templateImportState: importState
});

const handleTemplateImportSuccess = (
    state: TStoreState,
    payload: ITemplateImportPayload
): Partial<TStoreState> => ({
    templateImportState: 'Success',
    templateFile: payload.templateFile,
    templateFileRawContent: payload.templateFileRawContent,
    templateToApply: payload.templateToApply,
    templateSpecProvider:
        payload.provider ||
        (<IDenebTemplateMetadata>payload.templateToApply.usermeta)?.deneb
            ?.provider
});

const handleUpdateTemplatePlaceholder = (
    state: TStoreState,
    payload: IPlaceholderValuePayload
): Partial<TStoreState> => {
    let dataset = [
        ...(<IDenebTemplateMetadata>state.templateToApply?.usermeta)?.[
            DATASET_NAME
        ]
    ];
    const match = dataset?.find((ph) => ph.key === payload.key);
    if (match) {
        const idx = dataset?.findIndex((ph) => ph.key === payload.key);
        dataset[idx] = {
            ...match,
            ...{ suppliedObjectName: payload.objectName }
        };
    }
    const templateToApply = <Spec | TopLevelSpec>{
        ...state.templateToApply,
        ...{
            usermeta: {
                ...state.templateToApply.usermeta,
                ...{
                    dataset
                }
            }
        }
    };
    return {
        templateAllImportCriteriaApplied:
            getImportPlaceholderResolutionStatus(templateToApply),
        templateToApply
    };
};
