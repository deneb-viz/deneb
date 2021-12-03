import { GetState, SetState, PartialState } from 'zustand';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { ErrorObject } from 'ajv';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { TStoreState } from '.';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField
} from '../core/template/schema';

import {
    getNewExportTemplateMetadata,
    getPlaceholderResolutionStatus,
    resolveTemplatesForProvider,
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from '../core/template';
import templates from '../templates';
import { TSpecProvider } from '../core/vega';

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

export const createTemplateSlice = (
    set: SetState<TStoreState>,
    get: GetState<TStoreState>
) =>
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
            templateToApply: templates.vegaLite[0],
            templateExportMetadata: null,
            templateSelectedIndex: 0,
            templateSelectedExportOperation: 'information',
            templateSpecProvider: 'vegaLite',
            templateProvider: 'vegaLite',
            initializeImportExport: () =>
                set((state) => handleInitializeImportExport(state)),
            syncTemplateExportDataset: (payload) =>
                set((state) => handleSyncTemplateExportDataset(state, payload)),
            updateTemplatePreviewImage: (payload) =>
                set((state) =>
                    handleUpdateTemplatePreviewImage(state, payload)
                ),
            updateTemplatePlaceholder: (payload) =>
                set((state) => handleUpdateTemplatePlaceholder(state, payload)),
            updateTemplateExportPropertyBySelector: (payload) =>
                set((state) =>
                    handleUpdateTemplateExportPropertyBySelector(state, payload)
                ),
            updateSelectedExportOperation: (templateSelectedExportOperation) =>
                set((state) =>
                    handleUpdateSelectedExportOperation(
                        state,
                        templateSelectedExportOperation
                    )
                ),
            updateSelectedTemplateProvider: (templateProvider) =>
                set((state) =>
                    handleUpdateSelectedTemplateProvider(
                        state,
                        templateProvider
                    )
                ),
            updateSelectedTemplate: (index) =>
                set((state) => handleUpdateSelectedTemplate(state, index)),
            updateTemplateExportError: (message) =>
                set((state) => handleTemplateExportError(state, message)),
            updateTemplateExportState: (exportState) =>
                set((state) => handleTemplateExportState(state, exportState)),
            updateTemplateImportError: (payload) =>
                set((state) => handleTemplateImportError(state, payload)),
            updateTemplateImportState: (importState) =>
                set((state) => handleTemplateImportState(state, importState)),
            updateTemplateImportSuccess: (payload) =>
                set((state) => handleTemplateImportSuccess(state, payload))
        },
        ...templates
    };

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
): PartialState<TStoreState, never, never, never, never> => ({
    templateAllImportCriteriaApplied: getPlaceholderResolutionStatus(
        templates.vegaLite[0]
    ),
    templateExportMetadata: getNewExportTemplateMetadata()
});

const handleSyncTemplateExportDataset = (
    state: TStoreState,
    payload: ITemplateDatasetField[]
): PartialState<TStoreState, never, never, never, never> => ({
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
): PartialState<TStoreState, never, never, never, never> => ({
    templateIncludePreviewImage: payload.include,
    templatePreviewImageDataUri: payload.dataUri
});

const handleUpdateTemplateExportPropertyBySelector = (
    state: TStoreState,
    payload: ITemplateExportFieldUpdatePayload
): PartialState<TStoreState, never, never, never, never> => ({
    templateExportMetadata: set(
        cloneDeep(state.templateExportMetadata),
        payload.selector,
        payload.value
    )
});

const handleUpdateSelectedExportOperation = (
    state: TStoreState,
    templateSelectedExportOperation: TExportOperation
): PartialState<TStoreState, never, never, never, never> => ({
    templateSelectedExportOperation
});

const handleUpdateSelectedTemplateProvider = (
    state: TStoreState,
    templateProvider: TTemplateProvider
): PartialState<TStoreState, never, never, never, never> => {
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
            : getPlaceholderResolutionStatus(templateToApply)
    };
};

const handleUpdateSelectedTemplate = (
    state: TStoreState,
    index: number
): PartialState<TStoreState, never, never, never, never> => {
    const templateToApply = resolveTemplatesForProvider()[index];
    return {
        templateSelectedIndex: index,
        templateToApply,
        templateAllImportCriteriaApplied:
            getPlaceholderResolutionStatus(templateToApply)
    };
};

const handleTemplateExportError = (
    state: TStoreState,
    message: string
): PartialState<TStoreState, never, never, never, never> => ({
    templateExportState: 'Error',
    templateImportErrorMessage: message
});

const handleTemplateExportState = (
    state: TStoreState,
    exportState: TTemplateExportState
): PartialState<TStoreState, never, never, never, never> => ({
    templateExportState: exportState,
    templateImportErrorMessage: null
});

const handleTemplateImportError = (
    state: TStoreState,
    payload: ITemplateImportErrorPayload
): PartialState<TStoreState, never, never, never, never> => ({
    templateImportState: 'Error',
    templateImportErrorMessage: payload.templateImportErrorMessage,
    templateSchemaErrors: payload.templateSchemaErrors
});

const handleTemplateImportState = (
    state: TStoreState,
    importState: TTemplateImportState
): PartialState<TStoreState, never, never, never, never> => ({
    templateImportState: importState
});

const handleTemplateImportSuccess = (
    state: TStoreState,
    payload: ITemplateImportPayload
): PartialState<TStoreState, never, never, never, never> => ({
    templateImportState: 'Success',
    templateFile: payload.templateFile,
    templateFileRawContent: payload.templateFileRawContent,
    templateToApply: payload.templateToApply,
    specProvider:
        payload.provider ||
        (<IDenebTemplateMetadata>payload.templateToApply.usermeta)?.deneb
            ?.provider
});

const handleUpdateTemplatePlaceholder = (
    state: TStoreState,
    payload: IPlaceholderValuePayload
): PartialState<TStoreState, never, never, never, never> => {
    let dataset = [
        ...(<IDenebTemplateMetadata>state.templateToApply?.usermeta)?.dataset
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
            getPlaceholderResolutionStatus(templateToApply),
        templateToApply
    };
};
