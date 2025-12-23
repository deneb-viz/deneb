import { logRender } from '@deneb-viz/utils/logging';
import { SpecificationEditorSelectedOperation } from './specification-editor-selected-operation';

export const ActiveEditorPaneRouter = () => {
    logRender('ActiveEditorPaneRouter');
    return (
        <>
            <SpecificationEditorSelectedOperation operation='Spec' />
            <SpecificationEditorSelectedOperation operation='Config' />
            <SpecificationEditorSelectedOperation operation='Settings' />
        </>
    );
};
