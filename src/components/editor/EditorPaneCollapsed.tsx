import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontIcon, Text, TooltipHost } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { toggleEditorPane } from '../../store/visualReducer';
import { buttonIconClass } from '../../config/styles';

const EditorPaneCollapsed = () => {
    Debugger.log('Rendering Component: [EditorPaneCollapsed]...');
    const { i18n, settings } = useSelector(state).visual,
        { position } = settings.editor,
        dispatch = useDispatch(),
        togglePane = () => {
            Debugger.log('Toggling pane expansion...');
            dispatch(toggleEditorPane());
        },
        tooltip_i18_key = 'Tooltip_Expand_Editor_Pane';

    return (
        <div id='editorPane' className='collapsed'>
            <TooltipHost
                content={i18n.getDisplayName(tooltip_i18_key)}
                id={tooltip_i18_key}
            >
                <div onClick={togglePane} role='button'>
                    <div role='button' className='editor-expand'>
                        <FontIcon
                            iconName={
                                position === 'left'
                                    ? 'ChevronRight'
                                    : 'ChevronLeft'
                            }
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
