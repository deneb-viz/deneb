import * as React from 'react';
import { useSelector } from 'react-redux';
import { FontIcon, Text, TooltipHost } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { commandService } from '../../services';
import { buttonIconClass } from '../../config/styles';

const EditorPaneCollapsed = () => {
    Debugger.log('Rendering Component: [EditorPaneCollapsed]...');
    const { i18n, settings } = useSelector(state).visual,
        { position } = settings.editor,
        togglePane = () => {
            commandService.toggleEditorPane();
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
