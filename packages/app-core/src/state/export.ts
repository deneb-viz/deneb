import { type StateCreator } from 'zustand';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { type DeepPath, updateDeep } from '@deneb-viz/utils/object';
import { StateDependencies, type StoreState } from './state';
import { getNewTemplateMetadata } from '@deneb-viz/json-processing';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { logDebug } from '@deneb-viz/utils/logging';

/**
 * Represents the export slice in the visual store.
 */
export type ExportSliceState = {
    export: ExportSliceProperties;
};

/**
 * Represents the export slice properties in the visual store.
 */
export type ExportSliceProperties = {
    includePreviewImage: boolean;
    metadata: UsermetaTemplate | null | undefined;
    setMetadataPropertyBySelector: (
        payload: ExportSliceSetMetadataPropertyBySelector
    ) => void;
    setPreviewImage: (payload: ExportSliceSetPreviewImage) => void;
    updateExportDataset: (dataset: UsermetaDatasetField[]) => void;
};

/**
 * Represents the payload for a preview image assignment.
 */
export type ExportSliceSetPreviewImage = {
    includePreviewImage: boolean;
    previewImageBase64PNG: string;
};

/**
 * Represents the payload for an export metadata property assignment.
 */
export type ExportSliceSetMetadataPropertyBySelector = {
    selector: string;
    value: string;
};

export const createExportSlice =
    (
        dependencies: StateDependencies
    ): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        ExportSliceState
    > =>
    (set) =>
        <ExportSliceState>{
            export: {
                includePreviewImage: false,
                metadata: getNewTemplateMetadata({
                    buildVersion: dependencies.applicationVersion,
                    provider: null,
                    providerVersion: null
                }),
                setMetadataPropertyBySelector(payload) {
                    set(
                        (state) =>
                            handleSetMetadataPropertyBySelector(state, payload),
                        false,
                        'export.setMetadataPropertyBySelector'
                    );
                },
                setPreviewImage: (payload) =>
                    set(
                        (state) => handleSetPreviewImage(state, payload),
                        false,
                        'export.setPreviewImage'
                    ),
                updateExportDataset: (dataset) =>
                    set(
                        (state) => handleUpdateExportDataset(state, dataset),
                        false,
                        'export.updateExportDataset'
                    )
            }
        };

const handleSetMetadataPropertyBySelector = (
    state: StoreState,
    payload: ExportSliceSetMetadataPropertyBySelector
): Partial<StoreState> => {
    // TODO: make the id/selector system better to avoid this hack.
    // Dataset-name coupling: selectors are split on '.', so path segments
    // that represent dataset names in `usermeta.datasets` MUST NOT contain
    // dots. Today this is safe because DATASET_DEFAULT_NAME = 'dataset'.
    // If multi-dataset support is added with user-supplied names, this
    // selector scheme will silently produce wrong paths for names like
    // 'my.layer' and needs to be revisited alongside the id convention.
    const path: DeepPath = payload.selector
        .split('.')
        .map((key) => (/^\d+$/.test(key) ? Number(key) : key));
    logDebug('Export slice - setting metadata property', {
        path,
        value: payload.value
    });
    return {
        export: {
            ...state.export,
            metadata: updateDeep(
                structuredClone(state.export.metadata),
                path,
                payload.value
            )
        }
    };
};

const handleSetPreviewImage = (
    state: StoreState,
    payload: ExportSliceSetPreviewImage
): Partial<StoreState> => ({
    export: {
        ...state.export,
        includePreviewImage: payload.includePreviewImage,
        metadata: {
            ...state.export.metadata,
            information: {
                ...state?.export?.metadata?.information,
                previewImageBase64PNG: payload.previewImageBase64PNG
            }
        } as UsermetaTemplate
    }
});

const handleUpdateExportDataset = (
    state: StoreState,
    dataset: UsermetaDatasetField[]
): Partial<StoreState> => {
    if (!state.export.metadata) return {};
    return {
        export: {
            ...state.export,
            metadata: {
                ...state.export.metadata,
                datasets: {
                    ...state.export.metadata.datasets,
                    [DATASET_DEFAULT_NAME]: dataset
                }
            }
        }
    };
};
