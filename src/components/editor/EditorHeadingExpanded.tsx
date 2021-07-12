import * as React from 'react';
import { useSelector } from 'react-redux';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { state } from '../../store';
import { buttonIconClass } from '../../config/styles';
import { toggleEditorPane } from '../../api/commands';
import { getHostLM } from '../../api/i18n';

const EditorHeadingExpanded = () => {
    const { settings } = useSelector(state).visual,
        { position } = settings.editor,
        i18n = getHostLM(),
        togglePane = () => {
            toggleEditorPane();
        },
        tooltip_i18_key = 'Tooltip_Collapse_Editor_Pane',
        iconName = position === 'left' ? 'ChevronLeft' : 'ChevronRight';

    return (
        <>
            <div
                className='editor-heading'
                aria-describedby={tooltip_i18_key}
                onClick={togglePane}
                role='button'
            >
                <Text
                    role='button'
                    variant='mediumPlus'
                    className='ms-fontWeight-semibold'
                >
                    {i18n.getDisplayName('Editor_Heading')}
                </Text>
            </div>
            <TooltipHost
                content={i18n.getDisplayName(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div
                    role='button'
                    className='editor-collapse'
                    onClick={togglePane}
                >
                    <FontIcon iconName={iconName} className={buttonIconClass} />
                </div>
            </TooltipHost>
        </>
    );
};

export default EditorHeadingExpanded;
