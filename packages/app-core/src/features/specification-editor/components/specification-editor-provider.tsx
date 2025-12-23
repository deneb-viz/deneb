import React, { createContext, createRef, useContext } from 'react';
import { type SpecificationEditorRefs } from '../types';
import { monaco } from '../../../components/code-editor/monaco-integration';

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

export const useJsonEditorContext = () =>
    useContext(SpecificationEditorContext);
