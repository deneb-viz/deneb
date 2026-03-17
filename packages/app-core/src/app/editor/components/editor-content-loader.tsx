import { use } from 'react';

import { initializeEditorDependencies } from '../../../lib/editor-init';
import { EditorContent } from './editor-content';

/**
 * Module-level promise — created once on first access, reused across
 * React re-renders. This ensures Suspense sees the same promise reference.
 */
let editorInitPromise: Promise<void> | null = null;
const getEditorInitPromise = () => {
    if (!editorInitPromise) {
        editorInitPromise = initializeEditorDependencies().catch((error) => {
            // Reset so the next render triggers a fresh attempt via the service.
            // Without this, a rejected promise is reused forever across mounts.
            editorInitPromise = null;
            throw error;
        });
    }
    return editorInitPromise;
};

/**
 * Gates EditorContent behind full editor dependency initialization
 * (schemas + Monaco). Uses React 19's use() hook to integrate with the
 * parent Suspense boundary, which shows EditorSuspense while loading.
 */
export const EditorContentLoader = () => {
    use(getEditorInitPromise());
    return <EditorContent />;
};
