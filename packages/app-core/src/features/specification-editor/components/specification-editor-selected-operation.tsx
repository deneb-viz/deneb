import { logRender } from '@deneb-viz/utils/logging';
import { type EditorPaneRole } from '../../../lib';
import { useDenebState } from '../../../state';
import { SpecificationJsonEditor } from './specification-json-editor';
import { SettingsPane } from '../../settings-pane';

type IEditorOperationContainerProps = {
    operation: EditorPaneRole;
};

export const SpecificationEditorSelectedOperation = ({
    operation
}: IEditorOperationContainerProps) => {
    const { editorSelectedOperation } = useDenebState((state) => state);
    const visible = editorSelectedOperation === operation;
    const editorPane = operation !== 'Settings';
    logRender('EditorOperationContainer', operation);
    return (
        <div
            className={`editor-pane-container ${
                (!editorPane && 'Settings') || ''
            }`}
            style={{
                display: visible ? 'inherit' : 'none'
            }}
        >
            {editorPane ? (
                <SpecificationJsonEditor thisEditorRole={operation} />
            ) : (
                <SettingsPane />
            )}
        </div>
    );
};
