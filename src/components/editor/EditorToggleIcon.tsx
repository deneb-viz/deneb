import React from 'react';

import { mergeStyles } from '@fluentui/react/lib/Styling';
import { FontIcon } from '@fluentui/react/lib/Icon';

import { toggleEditorPane } from '../../core/ui/commands';
import { getEditorHeadingIcon } from '../../core/ui/icons';
import { getEditorHeadingIconClassName } from '../../core/ui/dom';
import { TEditorPosition } from '../../core/ui';

const buttonIconClass = mergeStyles({
    fontSize: 12,
    height: 20,
    width: 20,
    cursor: 'pointer'
});

interface IEditorToggleIconProps {
    editorPaneIsExpanded: boolean;
    position: TEditorPosition;
}

const EditorToggleIcon: React.FC<IEditorToggleIconProps> = ({
    position,
    editorPaneIsExpanded
}) => (
    <>
        <div
            role='button'
            className={getEditorHeadingIconClassName(editorPaneIsExpanded)}
            onClick={toggleEditorPane}
        >
            <FontIcon
                iconName={getEditorHeadingIcon(position, editorPaneIsExpanded)}
                className={buttonIconClass}
            />
        </div>
    </>
);

export default EditorToggleIcon;
