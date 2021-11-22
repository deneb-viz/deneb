import * as React from 'react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import store from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';

const EditorHeadingExpanded = () => {
    const { editorPaneIsExpanded, visualSettings } = store((state) => state),
        { position } = visualSettings.editor,
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
