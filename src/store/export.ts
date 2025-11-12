import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { TStoreState } from '.';
import { getNewTemplateMetadata } from '@deneb-viz/json-processing';
import { APPLICATION_INFORMATION } from '../../config';
import {
    type ExportSliceSetMetadataPropertyBySelector,
    type ExportSliceSetPreviewImage,
    type ExportSliceState
} from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
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
    TStoreState,
    [['zustand/devtools', never]],
    [],
    ExportSliceState
> = sliceStateInitializer;

const handleSetMetadataPropertyBySelector = (
    state: TStoreState,
    payload: ExportSliceSetMetadataPropertyBySelector
): Partial<TStoreState> => ({
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
    state: TStoreState,
    payload: ExportSliceSetPreviewImage
): Partial<TStoreState> => ({
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
