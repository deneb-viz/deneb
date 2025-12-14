import { type StateCreator } from 'zustand';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type DeepPath, updateDeep } from '@deneb-viz/utils/object';
import { StateDependencies, type StoreState } from './state';
import { getNewTemplateMetadata } from '@deneb-viz/json-processing';
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
                    )
            }
        };

const handleSetMetadataPropertyBySelector = (
    state: StoreState,
    payload: ExportSliceSetMetadataPropertyBySelector
): Partial<StoreState> => {
    // TODO: make the id/selector system better to avoid this hack
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
