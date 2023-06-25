import React from 'react';
import { shallow } from 'zustand/shallow';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import store from '../../../store';

import EditorToggleIcon from './EditorToggleIcon';
import EditorHeadingText from './EditorHeadingText';
import { logRender } from '../../../features/logging';
import { getI18nValue } from '../../../features/i18n';

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
                content={getI18nValue(tooltip_i18_key)}
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
