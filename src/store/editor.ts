import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import reduce from 'lodash/reduce';

import { TStoreState } from '.';
import { doUnallocatedFieldsExist } from '../core/data/dataset';
import {
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getResizablePaneSize,
    TPreviewPivotRole
} from '../core/ui/advancedEditor';
import { IVisualDatasetFields } from '../core/data';
import { getFieldsInUseFromSpec } from '../features/template';
import { IFixResult } from '../features/specification';
import {
    EditorApplyMode,
    IEditorFoldPosition,
    TEditorRole
} from '../features/json-editor';
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
import { IAceEditor } from 'react-ace/lib/types';

export interface IEditorSlice {
    editor: {
        applyMode: EditorApplyMode;
        foldsConfig: IEditorFoldPosition[];
        foldsSpec: IEditorFoldPosition[];
        /**
         * Tracks high-level error state of the editor. Essentially if either
         * editor fails to parse as valid JSON (or JSONC) then we should prevent
         * the ability to format the current content (potentially breaking it even
         * further).
         */
        hasErrors: boolean;
        isDirty: boolean;
        stagedConfig: string;
        stagedSpec: string;
        /**
         * Set the fold information for the specified editor role.
         */
        setFolds: (payload: IEditorSliceSetFolds) => void;
        /**
         * Sets the high-level error state flag accordingly.
         */
        setHasErrors: (hasErrors: boolean) => void;
        toggleApplyMode: () => void;
        updateApplyMode: (applyMode: EditorApplyMode) => void;
        updateChanges: (payload: IEditorSliceUpdateChangesPayload) => void;
        updateIsDirty: (isDirty: boolean) => void;
    };
    editorFieldDatasetMismatch: boolean;
    editorFieldsInUse: IVisualDatasetFields;
    editorFixResult: IFixResult;
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
    renewEditorFieldsInUse: (editor: IAceEditor) => void;
    setEditorFixErrorDismissed: () => void;
    toggleEditorPane: () => void;
    togglePreviewDebugPane: () => void;
    updateEditorPreviewDebugIsExpanded: (value: boolean) => void;
    updateEditorFieldMapping: (
        payload: IEditorFieldMappingUpdatePayload
    ) => void;
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
            applyMode: 'Manual',
            foldsConfig: [],
            foldsSpec: [],
            hasErrors: false,
            isDirty: false,
            stagedConfig: null,
            stagedSpec: null,
            setFolds: (payload) =>
                set(
                    (state) => handleSetFolds(state, payload),
                    false,
                    'editor.setFolds'
                ),
            setHasErrors: (hasErrors) =>
                set(
                    (state) => handleSetHasErrors(state, hasErrors),
                    false,
                    'editor.setHasErrors'
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
        editorFieldDatasetMismatch: false,
        editorFieldsInUse: {},
        editorFixResult: {
            success: true,
            dismissed: false,
            spec: null,
            config: null
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
        renewEditorFieldsInUse: (editor) =>
            set(
                (state) => handleRenewEditorFieldsInUse(state, editor),
                false,
                'renewEditorFieldsInUse'
            ),
        setEditorFixErrorDismissed: () =>
            set(
                (state) => handleSetEditorFixErrorDismissed(state),
                false,
                'setEditorFixErrorDismissed'
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

export interface IEditorSliceSetFolds {
    /**
     * The editor that the folds apply to.
     */
    role: TEditorRole;
    /**
     * Current fold data from the editor.
     */
    folds: IEditorFoldPosition[];
}

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
     * Current fold data from the editor. If omitted, will use the current fold
     * data for that editor.
     */
    folds?: IEditorFoldPosition[];
}

/**
 * Sets which nodes in the editor are folded, for retrieval later.
 */
const handleSetFolds = (
    state: TStoreState,
    payload: IEditorSliceSetFolds
): Partial<TStoreState> => ({
    editor: { ...state.editor, [`folds${payload.role}`]: payload.folds }
});

const handleSetHasErrors = (state: TStoreState, hasErrors: boolean) => ({
    editor: { ...state.editor, hasErrors }
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
    const { role, text, folds } = payload;
    const existingFolds =
        role === 'Spec' ? state.editor.foldsSpec : state.editor.foldsConfig;
    const isDirty =
        state.visualSettings.vega.jsonConfig !== text &&
        state.visualSettings.vega.jsonSpec !== text &&
        state.editor.applyMode !== 'Auto';
    const foldsConfig =
        role === 'Config' ? folds ?? state.editor.foldsConfig : existingFolds;
    const foldsSpec =
        role === 'Spec' ? folds ?? state.editor.foldsSpec : existingFolds;
    const stagedConfig = role === 'Config' ? text : state.editor.stagedConfig;
    const stagedSpec = role === 'Spec' ? text : state.editor.stagedSpec;
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
            foldsConfig,
            foldsSpec,
            stagedConfig,
            stagedSpec
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

interface IEditorFieldMappingUpdatePayload {
    key: string;
    objectName: string;
}

const handleRenewEditorFieldsInUse = (
    state: TStoreState,
    editor: IAceEditor
): Partial<TStoreState> => {
    const { fields } = state.dataset;
    const editorFieldsInUse = getFieldsInUseFromSpec(
        fields,
        state.editorFieldsInUse,
        editor,
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
        <IVisualDatasetFields>state.editorFieldsInUse
    )
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
