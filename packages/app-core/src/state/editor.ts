import { monaco } from '../components/code-editor/monaco-integration';
import {
    DebugPaneRole,
    EditorApplyMode,
    EditorPaneRole
} from '../lib/interface';

type EditorSliceProperties = {
    applyMode: EditorApplyMode;
    isDirty: boolean;
    stagedConfig: string;
    stagedSpec: string;
    viewStateConfig: monaco.editor.ICodeEditorViewState;
    viewStateSpec: monaco.editor.ICodeEditorViewState;
    setViewState: (viewState: monaco.editor.ICodeEditorViewState) => void;
    toggleApplyMode: () => void;
    updateApplyMode: (applyMode: EditorApplyMode) => void;
    updateChanges: (payload: EditorSliceUpdateChangesPayload) => void;
    updateIsDirty: (isDirty: boolean) => void;
};

export type EditorSlice = {
    editor: EditorSliceProperties;
    editorIsExportDialogVisible: boolean;
    editorIsNewDialogVisible: boolean;
    editorPaneIsExpanded: boolean;
    editorPreviewAreaHeight: number;
    editorPreviewAreaHeightLatch: number;
    editorPreviewAreaHeightMax: number;
    editorPreviewAreaSelectedPivot: DebugPaneRole;
    editorPreviewAreaWidth: number;
    editorPreviewDebugIsExpanded: boolean;
    editorPaneDefaultWidth: number;
    editorPaneExpandedWidth: number;
    editorPaneWidth: number;
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
    viewState?: monaco.editor.ICodeEditorViewState;
};

export type EditorPaneUpdatePayload = {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
};
