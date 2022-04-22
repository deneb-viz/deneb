import React from 'react';

import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { useStoreProp } from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';
import { reactLog } from '../../../core/utils/reactLog';
import { TEditorPosition } from '../../../core/ui';

const EditorPaneCollapsed = () => {
    const editorPaneIsExpanded = useStoreProp<boolean>('editorPaneIsExpanded');
    const position = useStoreProp<TEditorPosition>(
        'position',
        'visualSettings.editor'
    );
    const tooltip_i18_key = 'Tooltip_Expand_Editor_Pane';
    reactLog('Rendering [EditorPaneCollapsed]');
    return (
        <div id='editorPane' className='collapsed'>
            <TooltipHost
                content={i18nValue(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div role='button'>
                    <EditorToggleIcon
                        position={position}
                        editorPaneIsExpanded={editorPaneIsExpanded}
                    />
                    <EditorHeadingText />
                </div>
            </TooltipHost>
        </div>
    );
};

export default EditorPaneCollapsed;
