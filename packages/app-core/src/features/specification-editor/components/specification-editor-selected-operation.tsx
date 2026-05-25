import { type ReactNode } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { type EditorPaneRole } from '../../../lib';
import { useDenebState } from '../../../state';

const useSelectedOperationStyles = makeStyles({
    container: {
        height: '100%',
        overflow: 'hidden',
        width: '100%'
    }
});

type SpecificationEditorSelectedOperationProps = {
    operation: EditorPaneRole;
    children: ReactNode;
};

/**
 * Visibility wrapper for a single editor-pane operation slot. The
 * composer supplies the actual content via `children`; this component
 * only handles "is the active operation this one, or hide me with
 * display: none". The conditional Settings className is preserved so
 * downstream CSS keying on `.editor-pane-container.Settings` still works.
 */
export const SpecificationEditorSelectedOperation = ({
    operation,
    children
}: SpecificationEditorSelectedOperationProps) => {
    const { editorSelectedOperation } = useDenebState((state) => state);
    const visible = editorSelectedOperation === operation;
    const isSettings = operation === 'Settings';
    const classes = useSelectedOperationStyles();
    const containerClasses = mergeClasses(
        `editor-pane-container ${(isSettings && 'Settings') || ''}`,
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
            {children}
        </div>
    );
};
