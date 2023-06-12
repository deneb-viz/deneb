import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import isEqual from 'lodash/isEqual';
import reduce from 'lodash/reduce';
import uniqWith from 'lodash/uniqWith';

import { TStoreState } from '.';
import { doUnallocatedFieldsExist } from '../core/data/dataset';
import { resolveVisualMode } from '../core/ui';
import {
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getResizablePaneSize,
    TPreviewPivotRole
} from '../core/ui/advancedEditor';
import { getConfig } from '../core/utils/config';
import { IVisualDatasetFields } from '../core/data';
import { getFieldsInUseFromSpec } from '../features/template';
import { ICompiledSpec, IFixResult } from '../features/specification';
import { TEditorRole } from '../features/json-editor';

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
    updateEditorZoomLevel: (zoomLevel: number) => void;
}

// eslint-disable-next-line max-lines-per-function
const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
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
        editorPreviewAreaSelectedPivot: 'data',
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
        editorZoomLevel: getConfig().zoomLevel.default,
        recordLogErrorMain: (message) =>
            set(
                (state) => handleRecordLogErrorMain(state, message),
                false,
                'recordLogErrorMain'
            ),
        recordLogError: (message) =>
            set(
                (state) => handleRecordLogError(state, message),
                false,
                'recordLogError'
            ),
        recordLogWarn: (message) =>
            set(
                (state) => handleRecordLogWarn(state, message),
                false,
                'recordLogWarn'
            ),
        renewEditorFieldsInUse: () =>
            set(
                (state) => handleRenewEditorFieldsInUse(state),
                false,
                'renewEditorFieldsInUse'
            ),
        setEditorFixErrorDismissed: () =>
            set(
                (state) => handleSetEditorFixErrorDismissed(state),
                false,
                'setEditorFixErrorDismissed'
            ),
        toggleEditorAutoApplyStatus: () =>
            set(
                (state) => handleToggleEditorAutoApplyStatus(state),
                false,
                'toggleEditorAutoApplyStatus'
            ),
        toggleEditorPane: () =>
            set(
                (state) => handleToggleEditorPane(state),
                false,
                'toggleEditorPane'
            ),
        togglePreviewDebugPane: () =>
            set(
                (state) => handleTogglePreviewDebugPane(state),
                false,
                'togglePreviewDebugPane'
            ),
        updateEditorDirtyStatus: (dirty) =>
            set(
                (state) => handleUpdateEditorDirtyStatus(state, dirty),
                false,
                'updateEditorDirtyStatus'
            ),
        updateEditorFieldMapping: (payload) =>
            set(
                (state) => handleUpdateEditorFieldMappings(state, payload),
                false,
                'updateEditorFieldMapping'
            ),
        updateEditorExportDialogVisible: (visible) =>
            set(
                (state) =>
                    handleUpdateEditorExportDialogVisible(state, visible),
                false,
                'updateEditorExportDialogVisible'
            ),
        updateEditorMapDialogVisible: (visible) =>
            set(
                (state) => handleUpdateEditorMapDialogVisible(state, visible),
                false,
                'updateEditorMapDialogVisible'
            ),
        updateEditorFixStatus: (payload) =>
            set(
                (state) => handleUpdateEditorFixStatus(state, payload),
                false,
                'updateEditorFixStatus'
            ),
        updateEditorPaneWidth: (payload) =>
            set(
                (state) => handleUpdateEditorPaneWidth(state, payload),
                false,
                'updateEditorPaneWidth'
            ),
        updateEditorPreviewAreaHeight: (height) =>
            set(
                (state) => handleUpdateEditorPreviewAreaHeight(state, height),
                false,
                'updateEditorPreviewAreaHeight'
            ),
        updateEditorPreviewAreaWidth: () =>
            set(
                (state) => handleUpdateEditorPreviewAreaWidth(state),
                false,
                'updateEditorPreviewAreaWidth'
            ),
        updateEditorPreviewDebugIsExpanded: (value) =>
            set(
                (state) =>
                    handleUpdateEditorPreviewDebugIsExpanded(state, value),
                false,
                'updateEditorPreviewDebugIsExpanded'
            ),
        updateEditorSelectedOperation: (role) =>
            set(
                (state) => handleUpdateEditorSelectedOperation(state, role),
                false,
                'updateEditorSelectedOperation'
            ),
        updateEditorSelectedPreviewRole: (role) =>
            set(
                (state) => handleUpdateEditorSelectedPreviewRole(state, role),
                false,
                'updateEditorSelectedPreviewRole'
            ),
        updateEditorSpec: (payload) =>
            set(
                (state) => handleUpdateEditorSpec(state, payload),
                false,
                'updateEditorSpec'
            ),
        updateEditorStagedConfig: (config) =>
            set(
                (state) => handleUpdateEditorStagedConfig(state, config),
                false,
                'updateEditorStagedConfig'
            ),
        updateEditorStagedSpec: (spec) =>
            set(
                (state) => handleUpdateEditorStagedSpec(state, spec),
                false,
                'updateEditorStagedSpec'
            ),
        updateEditorZoomLevel: (zoomLevel) =>
            set(
                (state) => handleupdateEditorZoomLevel(state, zoomLevel),
                false,
                'updateEditorZoomLevel'
            )
    };

export const createEditorSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IEditorSlice
> = sliceStateInitializer;

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
): Partial<TStoreState> => {
    const { fields } = state.dataset;
    const editorFieldsInUse = getFieldsInUseFromSpec(
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
): Partial<TStoreState> => ({
    editorLogWarns: uniqWith([...state.editorLogWarns, message], isEqual)
});

const handleRecordLogError = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => {
    const editorLogErrors = uniqWith(
        [...state.editorLogErrors, message],
        isEqual
    );
    return {
        debug: { ...state.debug, logAttention: editorLogErrors.length > 0 },
        editorLogErrors
    };
};

const handleRecordLogErrorMain = (
    state: TStoreState,
    message: string
): Partial<TStoreState> => {
    const logAttention = message !== null;
    return {
        editorLogError: message,
        debug: { ...state.debug, logAttention }
    };
};

const handleSetEditorFixErrorDismissed = (
    state: TStoreState
): Partial<TStoreState> => {
    return {
        editorFixResult: {
            ...state.editorFixResult,
            ...{ dismissed: true }
        }
    };
};

const handleToggleEditorAutoApplyStatus = (
    state: TStoreState
): Partial<TStoreState> => ({
    editorAutoApply: !state.editorAutoApply
});

const handleToggleEditorPane = (state: TStoreState): Partial<TStoreState> => {
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
): Partial<TStoreState> => ({
    editorIsDirty: dirty
});

const handleUpdateEditorFieldMappings = (
    state: TStoreState,
    payload: IEditorFieldMappingUpdatePayload
): Partial<TStoreState> => ({
    editorFieldsInUse: reduce(
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
): Partial<TStoreState> => ({
    editorIsExportDialogVisible: visible
});

const handleUpdateEditorMapDialogVisible = (
    state: TStoreState,
    visible: boolean
): Partial<TStoreState> => ({
    editorIsMapDialogVisible: visible
});

const handleUpdateEditorFixStatus = (
    state: TStoreState,
    payload: IFixResult
): Partial<TStoreState> => ({
    editorFixResult: payload
});

const handleUpdateEditorPaneWidth = (
    state: TStoreState,
    payload: IEditorPaneUpdatePayload
): Partial<TStoreState> => {
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
): Partial<TStoreState> => {
    return {
        editorPreviewDebugIsExpanded:
            height !== state.editorPreviewAreaHeightMax,
        editorPreviewAreaHeight: height,
        editorPreviewAreaHeightLatch: height
    };
};

const handleUpdateEditorPreviewAreaWidth = (
    state: TStoreState
): Partial<TStoreState> => ({
    editorPreviewAreaWidth: getEditorPreviewAreaWidth(
        state.visualViewportCurrent.width,
        state.editorPaneWidth,
        state.visualSettings.editor.position
    )
});

const handleUpdateEditorPreviewDebugIsExpanded = (
    state: TStoreState,
    value: boolean
): Partial<TStoreState> => ({
    editorPreviewDebugIsExpanded: value
});

const handleTogglePreviewDebugPane = (
    state: TStoreState
): Partial<TStoreState> => {
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
): Partial<TStoreState> => ({
    editorSelectedOperation: role
});

const handleUpdateEditorSelectedPreviewRole = (
    state: TStoreState,
    role: TPreviewPivotRole
): Partial<TStoreState> => {
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
): Partial<TStoreState> => {
    const logAttention = payload.error !== null;
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
        ),
        debug: { ...state.debug, logAttention }
    };
};

const handleUpdateEditorStagedConfig = (
    state: TStoreState,
    config: string
): Partial<TStoreState> => ({
    editorStagedConfig: config
});

const handleUpdateEditorStagedSpec = (
    state: TStoreState,
    spec: string
): Partial<TStoreState> => ({
    editorStagedSpec: spec
});

const handleupdateEditorZoomLevel = (
    state: TStoreState,
    zoomLevel: number
): Partial<TStoreState> => ({
    editorZoomLevel: zoomLevel
});
