import { getState } from '../../store';
import { shouldPrioritizeJsonEditor } from '../interface';
import { IEditorRefs } from './types';

export { EditorPane } from './components/editor-pane';
export {
    JsonEditorContextProvider,
    useJsonEditorContext
} from './components/json-editor-context-provider';
export * from './types';

/**
 * Ensure that we have the correct ref for an Ace editor, based on the current editor role in the store. This will
 * allow us to access the editor instance from other components.
 */
const getActiveEditorRef = (editorRefs: IEditorRefs) => {
    const { editorSelectedOperation } = getState();
    switch (editorSelectedOperation) {
        case 'Spec':
            return editorRefs.spec;
        case 'Config':
            return editorRefs.config;
        default:
            return null;
    }
};

/**
 * Set focus to the active editor, based on the current editor role in the store.
 */
export const setFocusToActiveEditor = (editorRefs: IEditorRefs) => {
    if (shouldPrioritizeJsonEditor()) {
        getActiveEditorRef(editorRefs)?.current.editor?.focus();
    }
};
