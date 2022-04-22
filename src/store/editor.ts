import { GetState, PartialState, SetState } from 'zustand';
import isEqual from 'lodash/isEqual';
import reduce from 'lodash/reduce';
import uniqWith from 'lodash/uniqWith';
import { View } from 'vega';

import { TStoreState } from '.';
import { doUnallocatedFieldsExist } from '../core/data/dataset';
import { TEditorRole } from '../core/services/JsonEditorServices';
import { resolveVisualMode } from '../core/ui';
import {
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getResizablePaneSize,
    TPreviewPivotRole
} from '../core/ui/advancedEditor';
import { getConfig } from '../core/utils/config';
import {
    getSpecFieldsInUse,
    ICompiledSpec,
    IFixResult
} from '../core/utils/specification';
import { IVisualDatasetFields } from '../core/data';

export interface IEditorSlice {
    editorAutoApply: boolean;
    editorCanAutoApply: boolean;
    editorFieldDatasetMismatch: boolean;
    editorFieldsInUse: IVisualDatasetFields;
    editorFixResult: IFixResult;
    editorIsDirty: boolean;
    editorIsExportDialogVisible: boolean;
    editorIsMapDialogVisible: boolean;
    editorIsNewDialogVisible: boolean;
    editorLogError: string;
    editorLogErrors: string[];
    editorLogWarns: string[];
    editorPaneIsExpanded: boolean;
    editorPreviewAreaHeight: number;
    editorPreviewAreaHeightLatch: number;
    editorPreviewAreaHeightMax: number;
    editorPreviewAreaSelectedPivot: TPreviewPivotRole;
    editorPreviewAreaWidth: number;
    editorPreviewDebugIsExpanded: boolean;
    editorPaneDefaultWidth: number;
    editorPaneExpandedWidth: number;
    editorPaneWidth: number;
    editorSelectedOperation: TEditorRole;
    editorSpec: ICompiledSpec;
    editorStagedConfig: string;
    editorStagedSpec: string;
    editorView: View;
    editorZoomLevel: number;
    renewEditorFieldsInUse: () => void;
    recordLogErrorMain: (message: string) => void;
    recordLogError: (message: string) => void;
    recordLogWarn: (message: string) => void;
    setEditorFixErrorDismissed: () => void;
    toggleEditorAutoApplyStatus: () => void;
    toggleEditorPane: () => void;
    togglePreviewDebugPane: () => void;
    updateEditorPreviewDebugIsExpanded: (value: boolean) => void;
    updateEditorDirtyStatus: (dirty: boolean) => void;
    updateEditorExportDialogVisible: (visible: boolean) => void;
    updateEditorFieldMapping: (
        payload: IEditorFieldMappingUpdatePayload
    ) => void;
    updateEditorMapDialogVisible: (visible: boolean) => void;
    updateEditorFixStatus: (payload: IFixResult) => void;
    updateEditorPaneWidth: (payload: IEditorPaneUpdatePayload) => void;
    updateEditorPreviewAreaHeight: (height: number) => void;
    updateEditorPreviewAreaWidth: () => void;
    updateEditorSelectedOperation: (role: TEditorRole) => void;
    updateEditorSelectedPreviewRole: (role: TPreviewPivotRole) => void;
    updateEditorSpec: (payload: IEditorSpecUpdatePayload) => void;
    updateEditorStagedConfig: (config: string) => void;
    updateEditorStagedSpec: (spec: string) => void;
    updateEditorView: (view: View) => void;
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
        editorLogError: null,
        editorLogErrors: [],
        editorLogWarns: [],
        editorPaneIsExpanded: true,
        editorPreviewAreaHeight: null,
        editorPreviewAreaHeightLatch: null,
        editorPreviewAreaHeightMax: null,
        editorPreviewAreaSelectedPivot: 'log',
        editorPreviewAreaWidth: null,
        editorPreviewDebugIsExpanded: false,
        editorPaneDefaultWidth: null,
        editorPaneExpandedWidth: null,
        editorPaneWidth: null,
        editorSelectedOperation: 'spec',
        editorSpec: {
            status: 'new',
            spec: null,
            rawSpec: null
        },
        editorStagedConfig: null,
        editorStagedSpec: null,
        editorView: null,
        editorZoomLevel: getConfig().zoomLevel.default,
        recordLogErrorMain: (message) =>
            set((state) => handleRecordLogErrorMain(state, message)),
        recordLogError: (message) =>
            set((state) => handleRecordLogError(state, message)),
        recordLogWarn: (message) =>
            set((state) => handleRecordLogWarn(state, message)),
        renewEditorFieldsInUse: () =>
            set((state) => handleRenewEditorFieldsInUse(state)),
        setEditorFixErrorDismissed: () =>
            set((state) => handleSetEditorFixErrorDismissed(state)),
        toggleEditorAutoApplyStatus: () =>
            set((state) => handleToggleEditorAutoApplyStatus(state)),
        toggleEditorPane: () => set((state) => handleToggleEditorPane(state)),
        togglePreviewDebugPane: () =>
            set((state) => handleTogglePreviewDebugPane(state)),
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
        updateEditorPreviewAreaHeight: (height) =>
            set((state) => handleUpdateEditorPreviewAreaHeight(state, height)),
        updateEditorPreviewAreaWidth: () =>
            set((state) => handleUpdateEditorPreviewAreaWidth(state)),
        updateEditorPreviewDebugIsExpanded: (value) =>
            set((state) =>
                handleUpdateEditorPreviewDebugIsExpanded(state, value)
            ),
        updateEditorSelectedOperation: (role) =>
            set((state) => handleUpdateEditorSelectedOperation(state, role)),
        updateEditorSelectedPreviewRole: (role) =>
            set((state) => handleUpdateEditorSelectedPreviewRole(state, role)),
        updateEditorSpec: (payload) =>
            set((state) => handleUpdateEditorSpec(state, payload)),
        updateEditorStagedConfig: (config) =>
            set((state) => handleUpdateEditorStagedConfig(state, config)),
        updateEditorStagedSpec: (spec) =>
            set((state) => handleUpdateEditorStagedSpec(state, spec)),
        updateEditorView: (view) =>
            set((state) => handleupdateEditorView(state, view)),
        updateEditorZoomLevel: (zoomLevel) =>
            set((state) => handleupdateEditorZoomLevel(state, zoomLevel))
    };

export interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

interface IEditorFieldMappingUpdatePayload {
    key: string;
    objectName: string;
}

export interface IEditorSpecUpdatePayload {
    spec: ICompiledSpec;
    error: string;
    warns: string[];
}

const handleRenewEditorFieldsInUse = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => {
    const { fields } = state.dataset;
    const editorFieldsInUse = getSpecFieldsInUse(
        fields,
        state.editorFieldsInUse,
        true
    );
    const editorFieldDatasetMismatch = doUnallocatedFieldsExist(
        fields,
        editorFieldsInUse,
        false
    );
    return {
        editorFieldsInUse,
        editorFieldDatasetMismatch
    };
};

const handleRecordLogWarn = (
    state: TStoreState,
    message: string
): PartialState<TStoreState, never, never, never, never> => ({
    editorLogWarns: uniqWith([...state.editorLogWarns, message], isEqual)
});

const handleRecordLogError = (
    state: TStoreState,
    message: string
): PartialState<TStoreState, never, never, never, never> => ({
    editorLogErrors: uniqWith([...state.editorLogErrors, message], isEqual)
});

const handleRecordLogErrorMain = (
    state: TStoreState,
    message: string
): PartialState<TStoreState, never, never, never, never> => ({
    editorLogError: message
});

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
        <IVisualDatasetFields>{}
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

const handleUpdateEditorPreviewAreaHeight = (
    state: TStoreState,
    height: number
): PartialState<TStoreState, never, never, never, never> => {
    return {
        editorPreviewDebugIsExpanded:
            height !== state.editorPreviewAreaHeightMax,
        editorPreviewAreaHeight: height,
        editorPreviewAreaHeightLatch: height
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

const handleUpdateEditorPreviewDebugIsExpanded = (
    state: TStoreState,
    value: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    editorPreviewDebugIsExpanded: value
});

const handleTogglePreviewDebugPane = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => {
    const prev = state.editorPreviewDebugIsExpanded;
    const next = !prev;
    const editorPreviewAreaHeight = prev
        ? state.editorPreviewAreaHeightMax
        : state.editorPreviewAreaHeightLatch ===
          state.editorPreviewAreaHeightMax
        ? getPreviewAreaHeightInitial(state.visualViewportCurrent.height)
        : state.editorPreviewAreaHeightLatch;
    const editorPreviewAreaHeightLatch = prev
        ? state.editorPreviewAreaHeightLatch
        : state.editorPreviewAreaHeight;
    return {
        editorPreviewDebugIsExpanded: next,
        editorPreviewAreaHeight,
        editorPreviewAreaHeightLatch
    };
};

const handleUpdateEditorSelectedOperation = (
    state: TStoreState,
    role: TEditorRole
): PartialState<TStoreState, never, never, never, never> => ({
    editorSelectedOperation: role
});

const handleUpdateEditorSelectedPreviewRole = (
    state: TStoreState,
    role: TPreviewPivotRole
): PartialState<TStoreState, never, never, never, never> => {
    const expand = state.editorPreviewDebugIsExpanded;
    const editorPreviewAreaHeight = !expand
        ? state.editorPreviewAreaHeightLatch
        : state.editorPreviewAreaHeight;
    return {
        editorPreviewAreaSelectedPivot: role,
        editorPreviewAreaHeight,
        editorPreviewDebugIsExpanded: true
    };
};

const handleUpdateEditorSpec = (
    state: TStoreState,
    payload: IEditorSpecUpdatePayload
): PartialState<TStoreState, never, never, never, never> => {
    return {
        editorSpec: payload.spec,
        editorLogError: payload.error,
        editorLogErrors: [],
        editorLogWarns: payload.warns,
        visualMode: resolveVisualMode(
            state.datasetViewHasValidMapping,
            state.visualEditMode,
            state.visualIsInFocusMode,
            state.visualViewMode,
            payload.spec
        )
    };
};

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

const handleupdateEditorView = (
    state: TStoreState,
    view: View
): PartialState<TStoreState, never, never, never, never> => ({
    editorView: view
});

const handleupdateEditorZoomLevel = (
    state: TStoreState,
    zoomLevel: number
): PartialState<TStoreState, never, never, never, never> => ({
    editorZoomLevel: zoomLevel
});
