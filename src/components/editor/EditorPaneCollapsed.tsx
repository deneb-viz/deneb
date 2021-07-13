import * as React from 'react';
import { useSelector } from 'react-redux';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { state } from '../../store';
import { buttonIconClass } from '../../config/styles';
import { toggleEditorPane } from '../../api/commands';
import { getEditorHeadingIcon } from '../../core/ui/icons';
import { i18nValue } from '../../core/ui/i18n';

const EditorPaneCollapsed = () => {
    const { editorPaneIsExpanded, settings } = useSelector(state).visual,
        { position } = settings.editor,
        iconName = getEditorHeadingIcon(position, editorPaneIsExpanded),
        tooltip_i18_key = 'Tooltip_Expand_Editor_Pane';

    return (
        <div id='editorPane' className='collapsed'>
            <TooltipHost
                content={i18nValue(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div onClick={toggleEditorPane} role='button'>
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
                            {i18nValue('Editor_Heading')}
                        </Text>
                    </div>
                </div>
            </TooltipHost>
        </div>
    );
};

export default EditorPaneCollapsed;
