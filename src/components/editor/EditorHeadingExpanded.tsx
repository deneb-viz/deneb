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

const EditorHeadingExpanded = () => {
    const { editorPaneIsExpanded, settings } = useSelector(state).visual,
        { position } = settings.editor,
        tooltip_i18_key = 'Tooltip_Collapse_Editor_Pane',
        iconName = getEditorHeadingIcon(position, editorPaneIsExpanded);

    return (
        <>
            <div
                className='editor-heading'
                aria-describedby={tooltip_i18_key}
                onClick={toggleEditorPane}
                role='button'
            >
                <Text
                    role='button'
                    variant='mediumPlus'
                    className='ms-fontWeight-semibold'
                >
                    {i18nValue('Editor_Heading')}
                </Text>
            </div>
            <TooltipHost
                content={i18nValue(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div
                    role='button'
                    className='editor-collapse'
                    onClick={toggleEditorPane}
                >
                    <FontIcon iconName={iconName} className={buttonIconClass} />
                </div>
            </TooltipHost>
        </>
    );
};

export default EditorHeadingExpanded;
