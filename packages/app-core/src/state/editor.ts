import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { monaco } from '../components/code-editor/monaco-integration';
import {
    getNextApplyMode,
    isExportSpecCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOtherCommandsEnabled,
    isZoomOutCommandEnabled,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from '../lib';
import {
    type DebugPaneRole,
    type EditorApplyMode,
    type EditorPaneRole
} from '../lib/interface';
import { StoreState } from './state';
import { StateCreator } from 'zustand';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { UsermetaTemplate } from '@deneb-viz/template-usermeta';
import {
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getResizablePaneSize
} from '../lib/interface/layout';

type EditorSliceProperties = {
    applyMode: EditorApplyMode;
    isDirty: boolean;
    stagedConfig: string | undefined;
    stagedSpec: string | undefined;
    viewStateConfig: monaco.editor.ICodeEditorViewState | undefined;
    viewStateSpec: monaco.editor.ICodeEditorViewState | undefined;
    setViewState: (
        viewState: monaco.editor.ICodeEditorViewState | undefined | null
    ) => void;
    toggleApplyMode: () => void;
    updateApplyMode: (applyMode: EditorApplyMode) => void;
    updateChanges: (payload: EditorSliceUpdateChangesPayload) => void;
    updateIsDirty: (isDirty: boolean) => void;
};

export type EditorSlice = {
    editor: EditorSliceProperties;
    editorIsExportDialogVisible: boolean;
    editorPaneIsExpanded: boolean;
    editorPreviewAreaHeight: number | null;
    editorPreviewAreaHeightLatch: number | null;
    editorPreviewAreaHeightMax: number | null;
    editorPreviewAreaSelectedPivot: DebugPaneRole;
    editorPreviewAreaWidth: number | null;
    editorPreviewDebugIsExpanded: boolean;
    editorPaneDefaultWidth: number | null;
    editorPaneExpandedWidth: number | null;
    editorPaneWidth: number | null;
    editorSelectedOperation: EditorPaneRole;
    editorZoomLevel: number;
    toggleEditorPane: () => void;
    togglePreviewDebugPane: () => void;
    updateEditorPreviewDebugIsExpanded: (value: boolean) => void;
    updateEditorPaneWidth: (payload: EditorPaneUpdatePayload) => void;
    updateEditorPreviewAreaHeight: (height: number) => void;
    updateEditorPreviewAreaWidth: () => void;
    updateEditorSelectedOperation: (role: EditorPaneRole) => void;
    updateEditorSelectedPreviewRole: (role: DebugPaneRole) => void;
    updateEditorZoomLevel: (zoomLevel: number) => void;
};

/**
 * Used to update the "staging" text for a JSON editor and ensure that it can
 * be restored (if navigating the UI), or persisted with a prompt, if the user
 * exits without saving changes.
 */
export type EditorSliceUpdateChangesPayload = {
    /**
     * The editor that the text applies to.
     */
    role: EditorPaneRole;
    /**
     * The editor text value to stage into the store
     */
    text: string;
    /**
     * Current view state from the editor. If omitted, will use the current view state for that editor.
     */
    viewState?: monaco.editor.ICodeEditorViewState | undefined | null;
};

export type EditorPaneUpdatePayload = {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
};

export const createEditorSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        EditorSlice
    > =>
    (set) => ({
        editor: {
            applyMode: 'Manual',
            isDirty: false,
            stagedConfig: undefined,
            stagedSpec: undefined,
            viewStateConfig: undefined,
            viewStateSpec: undefined,
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
        editorZoomLevel: VISUAL_PREVIEW_ZOOM_CONFIGURATION.default,
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
                (state) => handleUpdateEditorZoomLevel(state, zoomLevel),
                false,
                'updateEditorZoomLevel'
            )
    });

const handleSetViewState = (
    state: StoreState,
    viewState: monaco.editor.ICodeEditorViewState | undefined | null
): Partial<StoreState> => ({
    editor: {
        ...state.editor,
        [`viewState${state.editorSelectedOperation}`]: viewState
    }
});

const handleToggleApplyMode = (state: StoreState): Partial<StoreState> => {
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
    state: StoreState,
    applyMode: EditorApplyMode
): Partial<StoreState> => ({
    editor: {
        ...state.editor,
        applyMode
    }
});

const handleUpdateChanges = (
    state: StoreState,
    payload: EditorSliceUpdateChangesPayload
): Partial<StoreState> => {
    const { role, text, viewState } = payload;
    const existingViewState =
        role === 'Spec'
            ? state.editor.viewStateSpec
            : state.editor.viewStateConfig;
    const isDirty =
        (role === 'Spec'
            ? state.project.spec !== text
            : state.project.config !== text) &&
        state.editor.applyMode !== 'Auto';
    const viewStateConfig =
        role === 'Config'
            ? (viewState ?? state.editor.viewStateConfig)
            : existingViewState;
    const viewStateSpec =
        role === 'Spec'
            ? (viewState ?? state.editor.viewStateSpec)
            : existingViewState;
    const stagedConfig = role === 'Config' ? text : state.editor.stagedConfig;
    const stagedSpec = role === 'Spec' ? text : state.editor.stagedSpec;
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {}
    );
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled({
                editorIsDirty: isDirty,
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
        }
    };
};

const handleToggleEditorPane = (state: StoreState): Partial<StoreState> => {
    const newExpansionState = !state.editorPaneIsExpanded;
    const newWidth = getResizablePaneSize(
        state.editorPaneExpandedWidth as number,
        newExpansionState,
        state.interface.viewport,
        state.editorPreferences.jsonEditorPosition
    );
    return {
        editorPaneIsExpanded: newExpansionState,
        editorPaneWidth: newWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            state.interface.viewport?.width ?? 0,
            newWidth,
            state.editorPreferences.jsonEditorPosition
        )
    };
};

const handleUpdateIsDirty = (
    state: StoreState,
    isDirty: boolean
): Partial<StoreState> => ({
    commands: {
        ...state.commands,
        exportSpecification: isExportSpecCommandEnabled({
            editorIsDirty: isDirty,
            specification: state.specification
        })
    },
    editor: {
        ...state.editor,
        isDirty
    }
});

const handleUpdateEditorPaneWidth = (
    state: StoreState,
    payload: EditorPaneUpdatePayload
): Partial<StoreState> => {
    const { editorPaneWidth, editorPaneExpandedWidth } = payload;
    const viewportWidth = state.interface.viewport?.width ?? 0;
    return {
        editorPaneWidth,
        editorPaneExpandedWidth,
        editorPreviewAreaWidth: getEditorPreviewAreaWidth(
            viewportWidth,
            editorPaneWidth,
            state.editorPreferences.jsonEditorPosition
        )
    };
};

const handleUpdateEditorPreviewAreaHeight = (
    state: StoreState,
    height: number
): Partial<StoreState> => {
    return {
        editorPreviewDebugIsExpanded:
            height !== state.editorPreviewAreaHeightMax,
        editorPreviewAreaHeight: height,
        editorPreviewAreaHeightLatch: height
    };
};

const handleUpdateEditorPreviewAreaWidth = (
    state: StoreState
): Partial<StoreState> => ({
    editorPreviewAreaWidth: getEditorPreviewAreaWidth(
        state.interface.viewport?.width ?? 0,
        state.editorPaneWidth as number,
        state.editorPreferences.jsonEditorPosition
    )
});

const handleUpdateEditorPreviewDebugIsExpanded = (
    state: StoreState,
    value: boolean
): Partial<StoreState> => ({
    editorPreviewDebugIsExpanded: value
});

const handleTogglePreviewDebugPane = (
    state: StoreState
): Partial<StoreState> => {
    const prev = state.editorPreviewDebugIsExpanded;
    const next = !prev;
    const editorPreviewAreaHeight = prev
        ? state.editorPreviewAreaHeightMax
        : state.editorPreviewAreaHeightLatch ===
            state.editorPreviewAreaHeightMax
          ? getPreviewAreaHeightInitial(state.interface.viewport?.height ?? 0)
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
    state: StoreState,
    role: EditorPaneRole
): Partial<StoreState> => ({
    editorSelectedOperation: role
});

const handleUpdateEditorSelectedPreviewRole = (
    state: StoreState,
    role: DebugPaneRole
): Partial<StoreState> => {
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

const handleUpdateEditorZoomLevel = (
    state: StoreState,
    zoomLevel: number
): Partial<StoreState> => {
    const zoomOtherCommandTest: ZoomOtherCommandTestOptions = {
        specification: state.specification
    };
    const zoomLevelCommandTest: ZoomLevelCommandTestOptions = {
        value: zoomLevel,
        specification: state.specification
    };
    return {
        commands: {
            ...state.commands,
            zoomFit: isZoomOtherCommandsEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandsEnabled(zoomOtherCommandTest)
        },
        editorZoomLevel: zoomLevel
    };
};
