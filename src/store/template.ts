import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { TStoreState } from '.';
import { BASE64_BLANK_IMAGE } from '../features/template';

import { TSpecProvider } from '../core/vega';
import { getNewExportTemplateMetadata } from '../features/visual-export';
import { UsermetaTemplate } from '@deneb-viz/core-dependencies';

export interface ITemplateSlice {
    templateExportErrorMessage: string;
    templateIncludePreviewImage: boolean;
    templatePreviewImageDataUri: string;
    templateExportMetadata: UsermetaTemplate;
    templateAllExportCriteriaApplied: boolean;
    initializeImportExport: () => void;
    updateTemplatePreviewImage: (
        payload: ITemplatePlaceholderImagePayload
    ) => void;
    updateTemplateExportPropertyBySelector: (
        payload: ITemplateExportFieldUpdatePayload
    ) => void;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <ITemplateSlice>{
        ...{
            templateAllExportCriteriaApplied: false,
            templateExportErrorMessage: null,
            templateFileRawContent: null,
            templateIncludePreviewImage: false,
            templatePreviewImageDataUri: BASE64_BLANK_IMAGE,
            templateExportMetadata: null,
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
