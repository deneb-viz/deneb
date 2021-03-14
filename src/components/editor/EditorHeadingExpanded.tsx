import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontIcon, Text, TooltipHost } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { toggleEditorPane } from '../../store/visualReducer';
import { buttonIconClass } from '../../config/styles';

const EditorHeadingExpanded = () => {
    Debugger.log('Rendering Component: [EditorHeadingExpanded]...');
    const { i18n, settings } = useSelector(state).visual,
        { position } = settings.editor,
        dispatch = useDispatch(),
        togglePane = () => {
            Debugger.log('Toggling pane expansion...');
            dispatch(toggleEditorPane());
        },
        tooltip_i18_key = 'Tooltip_Collapse_Editor_Pane';

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
                    <FontIcon
                        iconName={
                            position === 'left' ? 'ChevronLeft' : 'ChevronRight'
                        }
                        className={buttonIconClass}
                    />
                </div>
            </TooltipHost>
        </>
    );
};

export default EditorHeadingExpanded;
