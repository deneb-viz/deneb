import { useContext } from 'react';

import { SpecificationEditorContext } from './specification-editor-context';

export const useSpecificationEditor = () => {
    const context = useContext(SpecificationEditorContext);
    if (!context) {
        throw new Error(
            'useSpecificationEditor must be used within a SpecificationEditorProvider'
        );
    }
    return context;
};
