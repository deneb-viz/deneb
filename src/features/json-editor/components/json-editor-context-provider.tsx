import React, { createContext, createRef, useContext } from 'react';
import { monaco } from '@deneb-viz/app-core';
import { IEditorRefs } from '..';

const JsonEditorContext = createContext<IEditorRefs>({} as IEditorRefs);
const specEditorMonacoRef = createRef<monaco.editor.IStandaloneCodeEditor>();
const configEditorMonacoRef = createRef<monaco.editor.IStandaloneCodeEditor>();

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
