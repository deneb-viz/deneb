import React from 'react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { useStoreProp } from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';
import { reactLog } from '../../../core/utils/logger';
import { TEditorPosition } from '../../../core/ui';

const EditorHeadingExpanded = () => {
    const editorPaneIsExpanded = useStoreProp<boolean>('editorPaneIsExpanded');
    const position = useStoreProp<TEditorPosition>(
        'position',
        'visualSettings.editor'
    );
    const tooltip_i18_key = 'Tooltip_Collapse_Editor_Pane';
    reactLog('Rendering [EditorHeadingExpanded]');
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
