import React, { createContext, createRef } from 'react';
import { type SpecificationEditorRefs } from '../../lib/editor/specification-editor-refs';
import type { monaco } from '../../lib/monaco/types';

export const SpecificationEditorContext =
    createContext<SpecificationEditorRefs | null>(null);
const specEditorMonacoRef =
    createRef<monaco.editor.IStandaloneCodeEditor | null>();
const configEditorMonacoRef =
    createRef<monaco.editor.IStandaloneCodeEditor | null>();

/**
 * Module-level singleton handle to the Monaco editor refs. Exported for
 * consumers that need the refs but are mounted outside the
 * `SpecificationEditorProvider` subtree — typically platform-level
 * surfaces such as the unapplied-changes toast that lives on the App
 * shell rather than inside the editor pane.
 *
 * Consumers inside the editor tree should still go through
 * `useSpecificationEditor()` — the guard there is meaningful for
 * legitimate editor-tree code and catches genuine programmer errors
 * (a feature component mounted without its provider). This direct
 * export is the deliberate escape hatch for surfaces that cannot
 * structurally live under the provider.
 */
export const specificationEditorRefs: SpecificationEditorRefs = {
    spec: specEditorMonacoRef,
    config: configEditorMonacoRef
};

type SpecificationEditorProviderProps = {
    children: React.ReactNode;
};

export const SpecificationEditorProvider = (
    props: SpecificationEditorProviderProps
) => {
    return (
        <SpecificationEditorContext.Provider value={specificationEditorRefs}>
            {props.children}
        </SpecificationEditorContext.Provider>
    );
};
