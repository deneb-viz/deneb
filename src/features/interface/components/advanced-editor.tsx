import React from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { useKonami as fourd3d3d } from 'react-konami-code';
import { AdvancedEditorInterface } from './advanced-editor-interface';
import { SpecificationEditorProvider } from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

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
        <SpecificationEditorProvider>
            <AdvancedEditorInterface />
        </SpecificationEditorProvider>
    );
};
