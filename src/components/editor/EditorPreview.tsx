import React from 'react';
import { useSelector } from 'react-redux';

import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles,
    IStackItemStyles
} from '@fluentui/react/lib/Stack';

import { state } from '../../store';
import { theme } from '../../api/fluent';

import DataProcessingRouter from '../DataProcessingRouter';
import SpecificationError from '../status/SpecificationError';
import PreviewAreaToolbar from './preview/PreviewAreaToolbar';

const verticalStackTokens: IStackTokens = {
        childrenGap: 0
    },
    verticalStackStyles: IStackStyles = {
        root: {
            height: '100vh',
            border: `1px solid ${theme.palette.neutralLight}`
        }
    },
    editorPreviewStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            boxSizing: 'border-box',
            overflow: 'auto',
            padding: 5
        }
    };

const EditorPreview: React.FC = () => {
    const { visual, zoom } = useSelector(state),
        { spec } = visual,
        resolveContent = () => {
            switch (spec.status) {
                case 'error':
                    return <SpecificationError />;
                default:
                    return (
                        <>
                            <div id='editorPreview'>
                                <DataProcessingRouter zoomLevel={zoom.value} />
                            </div>
                        </>
                    );
            }
        };

    return (
        <Stack
            id='editorPreviewStack'
            tokens={verticalStackTokens}
            styles={verticalStackStyles}
        >
            <StackItem verticalFill styles={editorPreviewStyles}>
                {resolveContent()}
            </StackItem>
            <PreviewAreaToolbar />
        </Stack>
    );
};

export default EditorPreview;
