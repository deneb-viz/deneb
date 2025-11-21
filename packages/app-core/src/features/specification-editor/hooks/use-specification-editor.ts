import { useContext } from 'react';

import { SpecificationEditorContext } from '../components/specification-editor-provider';

export const useSpecificationEditor = () =>
    useContext(SpecificationEditorContext);
