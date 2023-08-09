import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { TStoreState } from '.';
import {
    BASE64_BLANK_IMAGE,
    IDenebTemplateMetadata
} from '../features/template';

import { TSpecProvider } from '../core/vega';
import { TExportOperation, TTemplateExportState } from '../features/template';
import { getNewExportTemplateMetadata } from '../features/visual-export';

export interface ITemplateSlice {
    templateExportState: TTemplateExportState;
    templateExportErrorMessage: string;
    templateIncludePreviewImage: boolean;
    templatePreviewImageDataUri: string;
    templateExportMetadata: IDenebTemplateMetadata;
    templateAllExportCriteriaApplied: boolean;
    templateSelectedExportOperation: TExportOperation;
    initializeImportExport: () => void;
    updateTemplatePreviewImage: (
        payload: ITemplatePlaceholderImagePayload
    ) => void;
    updateTemplateExportPropertyBySelector: (
        payload: ITemplateExportFieldUpdatePayload
    ) => void;
    updateSelectedExportOperation: (
        templateSelectedExportOperation: TExportOperation
    ) => void;
    updateTemplateExportError: (message: string) => void;
    updateTemplateExportState: (exportState: TTemplateExportState) => void;
}

// eslint-disable-next-line max-lines-per-function
const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ITemplateSlice>{
        ...{
            templateAllExportCriteriaApplied: false,
            templateExportState: 'None',
            templateExportErrorMessage: null,
            templateFileRawContent: null,
            templateIncludePreviewImage: false,
            templatePreviewImageDataUri: BASE64_BLANK_IMAGE,
            templateExportMetadata: null,
            templateSelectedExportOperation: 'information',
            initializeImportExport: () =>
                set(
                    () => handleInitializeImportExport(),
                    false,
                    'initializeImportExport'
                ),
            updateTemplatePreviewImage: (payload) =>
                set(
                    (state) => handleUpdateTemplatePreviewImage(state, payload),
                    false,
                    'updateTemplatePreviewImage'
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
                )
        }
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

interface ITemplatePlaceholderImagePayload {
    include: boolean;
    dataUri: string;
}

const handleInitializeImportExport = (): Partial<TStoreState> => ({
    templateExportMetadata: getNewExportTemplateMetadata()
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

const handleTemplateExportError = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => ({
    templateExportState: 'Error'
});

const handleTemplateExportState = (
    state: TStoreState,
    exportState: TTemplateExportState
): Partial<TStoreState> => ({
    templateExportState: exportState
});
