import { GetState, PartialState, SetState } from 'zustand';
import reduce from 'lodash/reduce';

import { TStoreState } from '.';
import {
    doesEditorHaveUnallocatedFields,
    IVisualValueMetadata
} from '../core/data/dataset';
import { TEditorRole } from '../core/services/JsonEditorServices';
import { resolveVisualMode } from '../core/ui';
import {
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getResizablePaneSize
} from '../core/ui/advancedEditor';
import { getConfig } from '../core/utils/config';
import {
    getSpecFieldsInUse,
    ICompiledSpec,
    IFixResult
} from '../core/utils/specification';

export interface IEditorSlice {
    editorAutoApply: boolean;
    editorCanAutoApply: boolean;
    editorFieldDatasetMismatch: boolean;
    editorFieldsInUse: IVisualValueMetadata;
    editorFixResult: IFixResult;
    editorIsDirty: boolean;
    editorIsExportDialogVisible: boolean;
    editorIsMapDialogVisible: boolean;
    editorIsNewDialogVisible: boolean;
    editorPaneIsExpanded: boolean;
    editorPreviewAreaWidth: number;
    editorPaneDefaultWidth: number;
    editorPaneExpandedWidth: number;
    editorPaneWidth: number;
    editorSelectedOperation: TEditorRole;
    editorSpec: ICompiledSpec;
    editorStagedConfig: string;
    editorStagedSpec: string;
    editorZoomLevel: number;
    setEditorFixErrorDismissed: () => void;
    toggleEditorAutoApplyStatus: () => void;
    toggleEditorPane: () => void;
    renewEditorFieldsInUse: () => void;
    updateEditorDirtyStatus: (dirty: boolean) => void;
    updateEditorExportDialogVisible: (visible: boolean) => void;
    updateEditorFieldMapping: (
        payload: IEditorFieldMappingUpdatePayload
    ) => void;
    updateEditorMapDialogVisible: (visible: boolean) => void;
    updateEditorFixStatus: (payload: IFixResult) => void;
    updateEditorPaneWidth: (payload: IEditorPaneUpdatePayload) => void;
    updateEditorPreviewAreaWidth: () => void;
    updateEditorSelectedOperation: (role: TEditorRole) => void;
    updateEditorSpec: (payload: ICompiledSpec) => void;
    updateEditorStagedConfig: (config: string) => void;
    updateEditorStagedSpec: (config: string) => void;
    updateEditorZoomLevel: (zoomLevel: number) => void;
}

export const createEditorSlice = (
    set: SetState<TStoreState>,
    get: GetState<TStoreState>
) =>
    <IEditorSlice>{
        editorAutoApply: false,
        editorCanAutoApply: true,
        editorFieldDatasetMismatch: false,
        editorFieldsInUse: {},
        editorFixResult: {
            success: true,
            dismissed: false,
            spec: null,
            config: null
        },
        editorIsDirty: false,
        editorIsExportDialogVisible: false,
        editorIsMapDialogVisible: false,
        editorIsNewDialogVisible: true,
        editorPaneIsExpanded: true,
        editorPreviewAreaWidth: null,
        editorPaneDefaultWidth: null,
        editorPaneExpandedWidth: null,
        editorPaneWidth: null,
        editorSelectedOperation: 'spec',
        editorSpec: {
            status: 'new',
            spec: null,
            rawSpec: null,
            message: 'Spec has not yet been parsed'
        },
        editorStagedConfig: null,
        editorStagedSpec: null,
        editorZoomLevel: getConfig().zoomLevel.default,
        renewEditorFieldsInUse: () =>
            set((state) => handleRenewEditorFieldsInUse(state)),
        setEditorFixErrorDismissed: () =>
            set((state) => handleSetEditorFixErrorDismissed(state)),
        toggleEditorAutoApplyStatus: () =>
            set((state) => handleToggleEditorAutoApplyStatus(state)),
        toggleEditorPane: () => set((state) => handleToggleEditorPane(state)),
        updateEditorDirtyStatus: (dirty) =>
            set((state) => handleUpdateEditorDirtyStatus(state, dirty)),
        updateEditorFieldMapping: (payload) =>
            set((state) => handleUpdateEditorFieldMappings(state, payload)),
        updateEditorExportDialogVisible: (visible) =>
            set((state) =>
                handleUpdateEditorExportDialogVisible(state, visible)
            ),
        updateEditorMapDialogVisible: (visible) =>
            set((state) => handleUpdateEditorMapDialogVisible(state, visible)),
        updateEditorFixStatus: (payload) =>
            set((state) => handleUpdateEditorFixStatus(state, payload)),
        updateEditorPaneWidth: (payload) =>
            set((state) => handleUpdateEditorPaneWidth(state, payload)),
        updateEditorPreviewAreaWidth: () =>
            set((state) => handleUpdateEditorPreviewAreaWidth(state)),
        updateEditorSelectedOperation: (role) =>
            set((state) => handleUpdateEditorSelectedOperation(state, role)),
        updateEditorSpec: (payload) =>
            set((state) => handleUpdateEditorSpec(state, payload)),
        updateEditorStagedConfig: (config) =>
            set((state) => handleUpdateEditorStagedConfig(state, config)),
        updateEditorStagedSpec: (spec) =>
            set((state) => handleUpdateEditorStagedSpec(state, spec)),
        updateEditorZoomLevel: (zoomLevel) =>
            set((state) => handleupdateEditorZoomLevel(state, zoomLevel))
    };

interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

interface IEditorFieldMappingUpdatePayload {
    key: string;
    objectName: string;
}

const handleRenewEditorFieldsInUse = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => {
    const { metadata } = state.dataset;
    const editorFieldsInUse = getSpecFieldsInUse(
        metadata,
        state.editorFieldsInUse,
        true
    );
    const editorFieldDatasetMismatch = doesEditorHaveUnallocatedFields(
        metadata,
        editorFieldsInUse,
        false
    );
    return {
        editorFieldsInUse,
        editorFieldDatasetMismatch
    };
};

const handleSetEditorFixErrorDismissed = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => {
    return {
        editorFixResult: {
            ...state.editorFixResult,
            ...{ dismissed: true }
        }
    };
};

const handleToggleEditorAutoApplyStatus = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => ({
    editorAutoApply: !state.editorAutoApply
});

const handleToggleEditorPane = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => {
    const newExpansionState = !state.editorPaneIsExpanded;
    const { position } = state.visualSettings.editor;
    const newWidth = getResizablePaneSize(
        state.editorPaneExpandedWidth,
        newExpansionState,
        state.visualViewportCurrent,
        position
    );
    return {
        editorPaneIsExpanded: newExpansionState,
        editorPaneWidth: newWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            state.visualViewportCurrent.width,
            newWidth,
            position
        ),
        visualViewportVega: calculateVegaViewport(
            state.visualViewportCurrent,
            newWidth,
            state.visualMode,
            position
        )
    };
};

const handleUpdateEditorDirtyStatus = (
    state: TStoreState,
    dirty: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    editorIsDirty: dirty
});

const handleUpdateEditorFieldMappings = (
    state: TStoreState,
    payload: IEditorFieldMappingUpdatePayload
): PartialState<TStoreState, never, never, never, never> => ({
    getEditorFieldsInUse: reduce(
        state.editorFieldsInUse,
        (result, value, key) => {
            if (key === payload.key) {
                value.templateMetadata.suppliedObjectName = payload.objectName;
                result[key] = value;
            }
            return result;
        },
        <IVisualValueMetadata>{}
    )
});

const handleUpdateEditorExportDialogVisible = (
    state: TStoreState,
    visible: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    editorIsExportDialogVisible: visible
});

const handleUpdateEditorMapDialogVisible = (
    state: TStoreState,
    visible: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    editorIsMapDialogVisible: visible
});

const handleUpdateEditorFixStatus = (
    state: TStoreState,
    payload: IFixResult
): PartialState<TStoreState, never, never, never, never> => ({
    editorFixResult: payload
});

const handleUpdateEditorPaneWidth = (
    state: TStoreState,
    payload: IEditorPaneUpdatePayload
): PartialState<TStoreState, never, never, never, never> => {
    const { editorPaneWidth, editorPaneExpandedWidth } = payload;
    const { position } = state.visualSettings.editor;
    return {
        editorPaneWidth,
        editorPaneExpandedWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            state.visualViewportCurrent.width,
            editorPaneWidth,
            position
        ),
        visualViewportVega: calculateVegaViewport(
            state.visualViewportCurrent,
            editorPaneWidth,
            state.visualMode,
            position
        )
    };
};

const handleUpdateEditorPreviewAreaWidth = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => ({
    editorPreviewAreaWidth: getEditorPreviewAreaWidth(
        state.visualViewportCurrent.width,
        state.editorPaneWidth,
        state.visualSettings.editor.position
    )
});

const handleUpdateEditorSelectedOperation = (
    state: TStoreState,
    role: TEditorRole
): PartialState<TStoreState, never, never, never, never> => ({
    editorSelectedOperation: role
});

const handleUpdateEditorSpec = (
    state: TStoreState,
    payload: ICompiledSpec
): PartialState<TStoreState, never, never, never, never> => ({
    editorSpec: payload,
    visualMode: resolveVisualMode(
        state.datasetViewHasValidMapping,
        state.visualEditMode,
        state.visualIsInFocusMode,
        state.visualViewMode,
        payload
    )
});

const handleUpdateEditorStagedConfig = (
    state: TStoreState,
    config: string
): PartialState<TStoreState, never, never, never, never> => ({
    editorStagedConfig: config
});

const handleUpdateEditorStagedSpec = (
    state: TStoreState,
    spec: string
): PartialState<TStoreState, never, never, never, never> => ({
    editorStagedSpec: spec
});

const handleupdateEditorZoomLevel = (
    state: TStoreState,
    zoomLevel: number
): PartialState<TStoreState, never, never, never, never> => ({
    editorZoomLevel: zoomLevel
});
