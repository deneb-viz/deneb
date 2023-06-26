import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import reduce from 'lodash/reduce';

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
import { IFixResult } from '../features/specification';
import { TEditorRole } from '../features/json-editor';

export interface IEditorSlice {
    editor: {
        isDirty: boolean;
        stagedConfig: string;
        stagedSpec: string;
        updateChanges: (payload: IEditorSliceUpdateChangesPayload) => void;
        updateIsDirty: (isDirty: boolean) => void;
        updateStagedConfig: (stagedConfig: string) => void;
        updateStagedSpec: (stagedSpec: string) => void;
    };
    editorAutoApply: boolean;
    editorCanAutoApply: boolean;
    editorFieldDatasetMismatch: boolean;
    editorFieldsInUse: IVisualDatasetFields;
    editorFixResult: IFixResult;
    editorIsExportDialogVisible: boolean;
    editorIsMapDialogVisible: boolean;
    editorIsNewDialogVisible: boolean;
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
    editorZoomLevel: number;
    renewEditorFieldsInUse: () => void;
    setEditorFixErrorDismissed: () => void;
    toggleEditorAutoApplyStatus: () => void;
    toggleEditorPane: () => void;
    togglePreviewDebugPane: () => void;
    updateEditorPreviewDebugIsExpanded: (value: boolean) => void;
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
    updateEditorZoomLevel: (zoomLevel: number) => void;
}

// eslint-disable-next-line max-lines-per-function
const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IEditorSlice>{
        editor: {
            isDirty: false,
            stagedConfig: null,
            stagedSpec: null,
            updateChanges: (payload) =>
                set(
                    (state) => handleUpdateChanges(state, payload),
                    false,
                    'editor.updateChanges'
                ),
            updateIsDirty: (isDirty) =>
                set(
                    (state) => handleUpdateIsDirty(state, isDirty),
                    false,
                    'editor.updateIsDirty'
                ),
            updateStagedConfig: (stagedConfig) =>
                set(
                    (state) => handleUpdateStagedConfig(state, stagedConfig),
                    false,
                    'editor.updateStagedConfig'
                ),
            updateStagedSpec: (stagedSpec) =>
                set(
                    (state) => handleUpdateStagedSpec(state, stagedSpec),
                    false,
                    'editor.updateStagedSpec'
                )
        },
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
        editorIsExportDialogVisible: false,
        editorIsMapDialogVisible: false,
        editorIsNewDialogVisible: true,
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
        editorZoomLevel: getConfig().zoomLevel.default,
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

export interface IEditorSliceUpdateChangesPayload {
    isDirty: boolean;
    stagedConfig: string;
    stagedSpec: string;
}

const handleUpdateChanges = (
    state: TStoreState,
    payload: IEditorSliceUpdateChangesPayload
): Partial<TStoreState> => {
    const { isDirty, stagedConfig, stagedSpec } = payload;
    return {
        editor: {
            ...state.editor,
            isDirty,
            stagedConfig,
            stagedSpec
        },
        interface: {
            ...state.interface
        },
        visual4d3d3d: false,
        visualMode: resolveVisualMode(
            state.datasetViewHasValidMapping,
            state.visualEditMode,
            state.visualIsInFocusMode,
            state.visualViewMode,
            stagedSpec
        )
    };
};

const handleUpdateStagedSpec = (
    state: TStoreState,
    stagedSpec: string
): Partial<TStoreState> => {
    return {
        editor: {
            ...state.editor,
            stagedSpec
        }
    };
};

const handleUpdateStagedConfig = (
    state: TStoreState,
    stagedConfig: string
): Partial<TStoreState> => {
    return {
        editor: {
            ...state.editor,
            stagedConfig
        }
    };
};

export interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

interface IEditorFieldMappingUpdatePayload {
    key: string;
    objectName: string;
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

const handleUpdateIsDirty = (
    state: TStoreState,
    isDirty: boolean
): Partial<TStoreState> => ({
    editor: {
        ...state.editor,
        isDirty
    }
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

const handleupdateEditorZoomLevel = (
    state: TStoreState,
    zoomLevel: number
): Partial<TStoreState> => ({
    editorZoomLevel: zoomLevel
});
