import React, { createContext, createRef } from 'react';
import { type SpecificationEditorRefs } from '../../lib/editor/specification-editor-refs';
import type { monaco } from '../../lib/monaco/types';

export const SpecificationEditorContext =
    createContext<SpecificationEditorRefs>({} as SpecificationEditorRefs);
const specEditorMonacoRef =
    createRef<monaco.editor.IStandaloneCodeEditor | null>();
const configEditorMonacoRef =
    createRef<monaco.editor.IStandaloneCodeEditor | null>();

type SpecificationEditorProviderProps = {
    children: React.ReactNode;
};

export const SpecificationEditorProvider = (
    props: SpecificationEditorProviderProps
) => {
    return (
        <SpecificationEditorContext.Provider
            value={{
                spec: specEditorMonacoRef,
                config: configEditorMonacoRef
            }}
        >
            {props.children}
        </SpecificationEditorContext.Provider>
    );
};
