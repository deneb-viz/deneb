import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import {
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getResizablePaneSize,
    TPreviewPivotRole
} from '../core/ui/advancedEditor';
import { EditorApplyMode, TEditorRole } from '../features/json-editor';
import { getApplicationMode } from '../features/interface';
import {
    isExportSpecCommandEnabled,
    isZoomOtherCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOutCommandEnabled,
    IZoomOtherCommandTestOptions,
    IZoomLevelCommandTestOptions,
    getNextApplyMode
} from '../features/commands';
import { VISUAL_PREVIEW_ZOOM } from '../../config';
import {
    // getFieldsInUseFromSpecification,
    // getRemapEligibleFields,
    // getTokenizedSpec,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { TEditorPosition } from '../core/ui';
import { editor } from '@deneb-viz/monaco-custom';
// import { logTimeEnd, logTimeStart } from '../features/logging';

export interface IEditorSlice {
    editor: {
        applyMode: EditorApplyMode;
        isDirty: boolean;
        stagedConfig: string;
        stagedSpec: string;
        viewStateConfig: editor.ICodeEditorViewState;
        viewStateSpec: editor.ICodeEditorViewState;
        setViewState: (viewState: editor.ICodeEditorViewState) => void;
        toggleApplyMode: () => void;
        updateApplyMode: (applyMode: EditorApplyMode) => void;
        updateChanges: (payload: IEditorSliceUpdateChangesPayload) => void;
        updateIsDirty: (isDirty: boolean) => void;
    };
    editorIsExportDialogVisible: boolean;
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
    toggleEditorPane: () => void;
    togglePreviewDebugPane: () => void;
    updateEditorPreviewDebugIsExpanded: (value: boolean) => void;
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
            applyMode: 'Manual',
            isDirty: false,
            stagedConfig: null,
            stagedSpec: null,
            setViewState: (viewState) =>
                set(
                    (state) => handleSetViewState(state, viewState),
                    false,
                    'editor.setViewState'
                ),
            toggleApplyMode: () =>
                set(
                    (state) => handleToggleApplyMode(state),
                    false,
                    'editor.toggleApplyMode'
                ),
            updateApplyMode: (applyMode) =>
                set(
                    (state) => handleUpdateApplyMode(state, applyMode),
                    false,
                    'editor.updateApplyMode'
                ),
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
                )
        },
        editorIsExportDialogVisible: false,
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
        editorSelectedOperation: 'Spec',
        editorZoomLevel: VISUAL_PREVIEW_ZOOM.default,
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

/**
 * Used to update the "staging" text for a JSON editor and ensure that it can
 * be restored (if navigating the UI), or persisted with a prompt, if the user
 * exits without saving changes.
 */
export interface IEditorSliceUpdateChangesPayload {
    /**
     * The editor that the text applies to.
     */
    role: TEditorRole;
    /**
     * The editor text value to stage into the store
     */
    text: string;
    /**
     * Current view state from the editor. If omitted, will use the current view state for that editor.
     */
    viewState?: editor.ICodeEditorViewState;
}

const handleSetViewState = (
    state: TStoreState,
    viewState: editor.ICodeEditorViewState
): Partial<TStoreState> => ({
    editor: {
        ...state.editor,
        [`viewState${state.editorSelectedOperation}`]: viewState
    }
});

const handleToggleApplyMode = (state: TStoreState): Partial<TStoreState> => {
    const { applyMode } = state.editor;
    const nextApplyMode = getNextApplyMode(applyMode);
    return {
        commands: {
            ...state.commands,
            applyChanges: nextApplyMode === 'Manual'
        },
        editor: {
            ...state.editor,
            applyMode: nextApplyMode
        }
    };
};

const handleUpdateApplyMode = (
    state: TStoreState,
    applyMode: EditorApplyMode
): Partial<TStoreState> => ({
    editor: {
        ...state.editor,
        applyMode
    }
});

const handleUpdateChanges = (
    state: TStoreState,
    payload: IEditorSliceUpdateChangesPayload
): Partial<TStoreState> => {
    const { role, text, viewState } = payload;
    const existingViewState =
        role === 'Spec'
            ? state.editor.viewStateSpec
            : state.editor.viewStateConfig;
    const isDirty =
        (role === 'Spec'
            ? state.visualSettings.vega.output.jsonSpec.value !== text
            : state.visualSettings.vega.output.jsonConfig.value !== text) &&
        state.editor.applyMode !== 'Auto';
    const viewStateConfig =
        role === 'Config'
            ? viewState ?? state.editor.viewStateConfig
            : existingViewState;
    const viewStateSpec =
        role === 'Spec'
            ? viewState ?? state.editor.viewStateSpec
            : existingViewState;
    const stagedConfig = role === 'Config' ? text : state.editor.stagedConfig;
    const stagedSpec = role === 'Spec' ? text : state.editor.stagedSpec;
    const exportMetadata = getUpdatedExportMetadata(state.export.metadata, {});
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled({
                editorIsDirty: isDirty,
                interfaceMode: state.interface.mode,
                specification: state.specification
            })
        },
        editor: {
            ...state.editor,
            isDirty,
            viewStateConfig,
            viewStateSpec,
            stagedConfig,
            stagedSpec
        },
        export: { ...state.export, metadata: exportMetadata },
        fieldUsage: {
            ...state.fieldUsage,
            editorShouldSkipRemap: false
        },
        interface: {
            ...state.interface,
            mode: getApplicationMode({
                currentMode: state.interface.mode,
                dataset: state.dataset,
                editMode: state.visualUpdateOptions.editMode,
                isInFocus: state.visualUpdateOptions.isInFocus,
                specification: state.editor.stagedSpec,
                updateType: state.visualUpdateOptions.type
            })
        },
        visual4d3d3d: false
    };
};

export interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

const handleToggleEditorPane = (state: TStoreState): Partial<TStoreState> => {
    const newExpansionState = !state.editorPaneIsExpanded;
    const { value: position } = state.visualSettings.editor.json.position;
    const newWidth = getResizablePaneSize(
        state.editorPaneExpandedWidth,
        newExpansionState,
        state.visualViewportCurrent,
        position as TEditorPosition
    );
    return {
        editorPaneIsExpanded: newExpansionState,
        editorPaneWidth: newWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            state.visualViewportCurrent.width,
            newWidth,
            position as TEditorPosition
        )
    };
};

const handleUpdateIsDirty = (
    state: TStoreState,
    isDirty: boolean
): Partial<TStoreState> => ({
    commands: {
        ...state.commands,
        exportSpecification: isExportSpecCommandEnabled({
            editorIsDirty: isDirty,
            interfaceMode: state.interface.mode,
            specification: state.specification
        })
    },
    editor: {
        ...state.editor,
        isDirty
    }
});

const handleUpdateEditorPaneWidth = (
    state: TStoreState,
    payload: IEditorPaneUpdatePayload
): Partial<TStoreState> => {
    const { editorPaneWidth, editorPaneExpandedWidth } = payload;
    const { value: position } = state.visualSettings.editor.json.position;
    return {
        editorPaneWidth,
        editorPaneExpandedWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            state.visualViewportCurrent.width,
            editorPaneWidth,
            position as TEditorPosition
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
        state.visualSettings.editor.json.position.value as TEditorPosition
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
): Partial<TStoreState> => {
    const zoomOtherCommandTest: IZoomOtherCommandTestOptions = {
        specification: state.specification,
        interfaceMode: state.interface.mode
    };
    const zoomLevelCommandTest: IZoomLevelCommandTestOptions = {
        value: zoomLevel,
        specification: state.specification,
        interfaceMode: state.interface.mode
    };
    return {
        commands: {
            ...state.commands,
            zoomFit: isZoomOtherCommandEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandEnabled(zoomOtherCommandTest)
        },
        editorZoomLevel: zoomLevel
    };
};
