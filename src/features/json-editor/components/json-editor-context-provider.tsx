import React, { createContext, createRef, useContext } from 'react';
import { IEditorRefs } from '..';
import ReactAce from 'react-ace/lib/ace';

const JsonEditorContext = createContext<IEditorRefs>({} as IEditorRefs);
const specEditorRef = createRef<ReactAce>();
const configEditorRef = createRef<ReactAce>();

export const JsonEditorContextProvider = (props) => {
    return (
        <JsonEditorContext.Provider
            value={{
                spec: specEditorRef,
                config: configEditorRef
            }}
        >
            {props.children}
        </JsonEditorContext.Provider>
    );
};

export const useJsonEditorContext = () => useContext(JsonEditorContext);
