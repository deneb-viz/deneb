import React, { createContext, createRef, useContext } from 'react';
import { editor } from '@deneb-viz/monaco-custom';
import { IEditorRefs } from '..';

const JsonEditorContext = createContext<IEditorRefs>({} as IEditorRefs);
const specEditorMonacoRef = createRef<editor.IStandaloneCodeEditor>();
const configEditorMonacoRef = createRef<editor.IStandaloneCodeEditor>();

export const JsonEditorContextProvider = (props) => {
    return (
        <JsonEditorContext.Provider
            value={{
                spec: specEditorMonacoRef,
                config: configEditorMonacoRef
            }}
        >
            {props.children}
        </JsonEditorContext.Provider>
    );
};

export const useJsonEditorContext = () => useContext(JsonEditorContext);
