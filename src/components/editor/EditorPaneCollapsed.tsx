import * as React from 'react';
import { useSelector } from 'react-redux';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { state } from '../../store';
import { buttonIconClass } from '../../config/styles';
import { toggleEditorPane } from '../../api/commands';
import { getHostLM } from '../../api/i18n';

const EditorPaneCollapsed = () => {
    const { settings } = useSelector(state).visual,
        { position } = settings.editor,
        i18n = getHostLM(),
        togglePane = () => {
            toggleEditorPane();
        },
        tooltip_i18_key = 'Tooltip_Expand_Editor_Pane',
        iconName = position === 'left' ? 'ChevronRight' : 'ChevronLeft';

    return (
        <div id='editorPane' className='collapsed'>
            <TooltipHost
                content={i18n.getDisplayName(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div onClick={togglePane} role='button'>
                    <div role='button' className='editor-expand'>
                        <FontIcon
                            iconName={iconName}
                            className={buttonIconClass}
                        />
                    </div>
                    <div role='button' className='editor-heading'>
                        <Text
                            className='ms-fontWeight-semibold'
                            variant='mediumPlus'
                        >
                            {i18n.getDisplayName('Editor_Heading')}
                        </Text>
                    </div>
                </div>
            </TooltipHost>
        </div>
    );
};

export default EditorPaneCollapsed;
