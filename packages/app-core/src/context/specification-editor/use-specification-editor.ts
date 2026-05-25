import { useContext } from 'react';

import { SpecificationEditorContext } from './specification-editor-context';

/**
 * Returns the Monaco editor refs for consumers mounted inside
 * `SpecificationEditorProvider`.
 *
 * Throws if called outside the provider — that is intentional and catches
 * genuine programmer errors. If your component cannot structurally live
 * under the provider (e.g. an App-shell surface that is a sibling of the
 * editor pane), import `specificationEditorRefs` directly instead of
 * calling this hook.
 */
export const useSpecificationEditor = () => {
    const context = useContext(SpecificationEditorContext);
    if (!context) {
        throw new Error(
            'useSpecificationEditor must be used within a SpecificationEditorProvider'
        );
    }
    return context;
};
