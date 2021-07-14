import * as React from 'react';
import { useSelector } from 'react-redux';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { state } from '../../store';
import { i18nValue } from '../../core/ui/i18n';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';

const EditorHeadingExpanded = () => {
    const { editorPaneIsExpanded, settings } = useSelector(state).visual,
        { position } = settings.editor,
        tooltip_i18_key = 'Tooltip_Collapse_Editor_Pane';

    return (
        <>
            <EditorHeadingText />
            <TooltipHost
                content={i18nValue(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <EditorToggleIcon
                    position={position}
                    editorPaneIsExpanded={editorPaneIsExpanded}
                />
            </TooltipHost>
        </>
    );
};

export default EditorHeadingExpanded;
