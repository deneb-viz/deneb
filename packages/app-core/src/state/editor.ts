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
    type ContainerViewport,
    type DebugPaneRole,
    type EditorApplyMode,
    type EditorPaneRole
} from '../lib/interface';
import { StoreState } from './state';
import { StateCreator } from 'zustand';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { UsermetaTemplate } from '@deneb-viz/template-usermeta';

type EditorSliceProperties = {
    applyMode: EditorApplyMode;
    debugPaneLatchHeight: number;
    debugPaneViewport: ContainerViewport;
    editorPaneViewport: ContainerViewport;
    isDebugPaneMinimized: boolean;
    isDirty: boolean;
    previewAreaViewport: ContainerViewport;
    stagedConfig: string | undefined;
    stagedSpec: string | undefined;
    viewStateConfig: monaco.editor.ICodeEditorViewState | undefined;
    viewStateSpec: monaco.editor.ICodeEditorViewState | undefined;
    setIsDebugPaneMinimized: (isMinimized: boolean) => void;
    setViewports: (options: {
        editorPaneViewport: ContainerViewport;
        previewAreaViewport: ContainerViewport;
        debugPaneViewport: ContainerViewport;
        debugPaneLatchHeight: number;
        isDebugPaneMinimized: boolean;
    }) => void;
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
    editorPreviewAreaSelectedPivot: DebugPaneRole;
    editorSelectedOperation: EditorPaneRole;
    editorZoomLevel: number;
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
            debugPaneLatchHeight: 0,
            debugPaneViewport: {
                height: 0,
                width: 0
            },
            editorPaneViewport: {
                height: 0,
                width: 0
            },
            isDebugPaneMinimized: false,
            isDirty: false,
            previewAreaViewport: {
                height: 0,
                width: 0
            },
            stagedConfig: undefined,
            stagedSpec: undefined,
            viewStateConfig: undefined,
            viewStateSpec: undefined,
            setIsDebugPaneMinimized: (isMinimized) =>
                set(
                    (state) => ({
                        editor: {
                            ...state.editor,
                            isDebugPaneMinimized: isMinimized
                        }
                    }),
                    false,
                    'editor.setIsDebugPaneMinimized'
                ),
            setViewports(options) {
                set(
                    (state) => ({
                        editor: {
                            ...state.editor,
                            isDebugPaneMinimized: options.isDebugPaneMinimized,
                            debugPaneLatchHeight: options.debugPaneLatchHeight,
                            debugPaneViewport: options.debugPaneViewport,
                            editorPaneViewport: options.editorPaneViewport,
                            previewAreaViewport: options.previewAreaViewport
                        }
                    }),
                    undefined,
                    'editor.setViewports'
                );
                //   get().setEditorPreviewAreaScaleToFit();
            },
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
        editorPreviewAreaSelectedPivot: 'data',
        editorSelectedOperation: 'Spec',
        editorZoomLevel: VISUAL_PREVIEW_ZOOM_CONFIGURATION.default,
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
                compilationResult: state.compilation.result
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

const handleUpdateIsDirty = (
    state: StoreState,
    isDirty: boolean
): Partial<StoreState> => ({
    commands: {
        ...state.commands,
        exportSpecification: isExportSpecCommandEnabled({
            editorIsDirty: isDirty,
            compilationResult: state.compilation.result
        })
    },
    editor: {
        ...state.editor,
        isDirty
    }
});

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
    return {
        editorPreviewAreaSelectedPivot: role
    };
};

const handleUpdateEditorZoomLevel = (
    state: StoreState,
    zoomLevel: number
): Partial<StoreState> => {
    const zoomOtherCommandTest: ZoomOtherCommandTestOptions = {
        compilationResult: state.compilation.result
    };
    const zoomLevelCommandTest: ZoomLevelCommandTestOptions = {
        value: zoomLevel,
        compilationResult: state.compilation.result
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
