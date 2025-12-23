import { logRender } from '@deneb-viz/utils/logging';
import { SpecificationEditorProvider } from '../../features/specification-editor';
import { EditorContent } from './editor-content';

export const Editor = () => {
    logRender('Editor');
    return (
        <SpecificationEditorProvider>
            <EditorContent />
        </SpecificationEditorProvider>
    );
};
