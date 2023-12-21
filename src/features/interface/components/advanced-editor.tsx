import React from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { useKonami as fourd3d3d } from 'react-konami-code';
import { logRender } from '../../logging';
import { JsonEditorContextProvider } from '../../json-editor';
import { AdvancedEditorInterface } from './advanced-editor-interface';

export const AdvancedEditor: React.FC = () => {
    const { setVisual4d3d3d } = store(
        (state) => ({
            setVisual4d3d3d: state.setVisual4d3d3d
        }),
        shallow
    );
    fourd3d3d(() => {
        setVisual4d3d3d(true);
    });
    logRender('AdvancedEditorInterface');
    return (
        <JsonEditorContextProvider>
            <AdvancedEditorInterface />
        </JsonEditorContextProvider>
    );
};
