import * as React from 'react';
import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles,
    IStackItemStyles
} from '@fluentui/react/lib/Stack';

import EditorHeadingExpanded from './EditorHeadingExpanded';
import EditorPanePivot from './EditorPanePivot';
import EditorCommandBar from './EditorCommandBar';
import EditorOperationContent from './EditorOperationContent';
import FixErrorDetails from './FixErrorDetails';

import { theme } from '../../core/ui/fluent';

const verticalStackOuterTokens: IStackTokens = { childrenGap: 5 },
    verticalStackInnerTokens: IStackTokens = {
        childrenGap: 5,
        padding: 10
    },
    verticalStackInnerStyles: IStackStyles = {
        root: {
            height: '100vh',
            backgroundColor: theme.palette.neutralLighterAlt,
            border: `1px solid ${theme.palette.neutralLight}`
        }
    },
    stackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex'
        }
    },
    finalStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            overflowY: 'auto'
        }
    };

const EditorPaneExpanded = () => {
    return (
        <Stack
            id='editorPane'
            tokens={verticalStackOuterTokens}
            className='expanded'
        >
            <Stack
                styles={verticalStackInnerStyles}
                tokens={verticalStackInnerTokens}
            >
                <StackItem shrink styles={stackItemStyles}>
                    <EditorHeadingExpanded />
                </StackItem>
                <StackItem shrink styles={stackItemStyles}>
                    <EditorCommandBar />
                </StackItem>
                <StackItem shrink styles={stackItemStyles}>
                    <EditorPanePivot />
                </StackItem>
                <StackItem shrink styles={stackItemStyles}>
                    <FixErrorDetails />
                </StackItem>
                <StackItem verticalFill styles={finalStackItemStyles}>
                    <EditorOperationContent />
                </StackItem>
            </Stack>
        </Stack>
    );
};

export default EditorPaneExpanded;
