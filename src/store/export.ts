import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { getNewTemplateMetadata } from '@deneb-viz/json-processing';
import { APPLICATION_INFORMATION } from '../../config';
import {
    type StoreState,
    type ExportSliceSetMetadataPropertyBySelector,
    type ExportSliceSetPreviewImage,
    type ExportSliceState
} from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
    <ExportSliceState>{
        export: {
            includePreviewImage: false,
            metadata: getNewTemplateMetadata({
                buildVersion: APPLICATION_INFORMATION.version,
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

export const createExportSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    ExportSliceState
> = sliceStateInitializer;

const handleSetMetadataPropertyBySelector = (
    state: StoreState,
    payload: ExportSliceSetMetadataPropertyBySelector
): Partial<StoreState> => ({
    export: {
        ...state.export,
        metadata: set(
            cloneDeep(state.export.metadata),
            payload.selector,
            payload.value
        )
    }
});

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
                ...state.export.metadata.information,
                previewImageBase64PNG: payload.previewImageBase64PNG
            }
        }
    }
});
