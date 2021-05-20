import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';

import Debugger from '../../Debugger';
import {
    editorPaneExpandedStackStyles,
    editorPaneExpandedStackItemStyles,
    editorPaneExpandedOuterStackTokens,
    editorPaneExpandedInnerStackTokens
} from '../../config/styles';
import EditorHeadingExpanded from './EditorHeadingExpanded';
import EditorPanePivot from './EditorPanePivot';
import EditorCommandBar from './EditorCommandBar';
import EditorOperationContainer from './EditorOperationContainer';
import FixErrorDetails from './FixErrorDetails';

const EditorPaneExpanded = () => {
    Debugger.log('Rendering Component: [EditorPaneExpanded]...');
    return (
        <Stack
            id='editorPane'
            tokens={editorPaneExpandedOuterStackTokens}
            className='expanded'
        >
            <Stack
                styles={editorPaneExpandedStackStyles}
                tokens={editorPaneExpandedInnerStackTokens}
            >
                <Stack.Item shrink styles={editorPaneExpandedStackItemStyles}>
                    <EditorHeadingExpanded />
                </Stack.Item>
                <Stack.Item shrink styles={editorPaneExpandedStackItemStyles}>
                    <EditorCommandBar />
                </Stack.Item>
                <Stack.Item shrink styles={editorPaneExpandedStackItemStyles}>
                    <EditorPanePivot />
                </Stack.Item>
                <Stack.Item shrink styles={editorPaneExpandedStackItemStyles}>
                    <FixErrorDetails />
                </Stack.Item>
                <Stack.Item
                    verticalFill
                    styles={editorPaneExpandedStackItemStyles}
                >
                    <EditorOperationContainer />
                </Stack.Item>
            </Stack>
        </Stack>
    );
};

export default EditorPaneExpanded;
