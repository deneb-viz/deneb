import React from 'react';

import { AdvancedEditorInterface } from './advanced-editor-interface';
import { SpecificationEditorProvider } from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

export const AdvancedEditor: React.FC = () => {
    logRender('AdvancedEditorInterface');
    return (
        <SpecificationEditorProvider>
            <AdvancedEditorInterface />
        </SpecificationEditorProvider>
    );
};
