import { makeStyles, mergeClasses } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { type EditorPaneRole } from '../../../lib';
import { useDenebState } from '../../../state';
import { SpecificationJsonEditor } from './specification-json-editor';
import { SettingsPane } from '../../settings-pane';

const useSelectedOperationStyles = makeStyles({
    container: {
        height: '100%',
        overflow: 'hidden',
        width: '100%'
    }
});

type IEditorOperationContainerProps = {
    operation: EditorPaneRole;
};

export const SpecificationEditorSelectedOperation = ({
    operation
}: IEditorOperationContainerProps) => {
    const { editorSelectedOperation } = useDenebState((state) => state);
    const visible = editorSelectedOperation === operation;
    const editorPane = operation !== 'Settings';
    const classes = useSelectedOperationStyles();
    const containerClasses = mergeClasses(
        `editor-pane-container ${(!editorPane && 'Settings') || ''}`,
        classes.container
    );
    logRender('EditorOperationContainer', operation);
    return (
        <div
            className={containerClasses}
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
