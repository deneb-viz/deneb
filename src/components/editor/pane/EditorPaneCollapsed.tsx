import React from 'react';
import { shallow } from 'zustand/shallow';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import store from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';
import { logRender } from '../../../features/logging';

const EditorPaneCollapsed = () => {
    const { editorPaneIsExpanded, position } = store(
        (state) => ({
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            position: state.visualSettings.editor.position
        }),
        shallow
    );
    const tooltip_i18_key = 'Tooltip_Expand_Editor_Pane';
    logRender('EditorPaneCollapsed');
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
