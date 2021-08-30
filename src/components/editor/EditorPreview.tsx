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
import { theme } from '../../core/ui/fluent';

import DataProcessingRouter from '../DataProcessingRouter';
import SpecificationError from '../status/SpecificationError';
import PreviewAreaToolbar from './preview/PreviewAreaToolbar';
import {
    getPreviewAreaHeight,
    previewAreaPadding
} from '../../core/ui/advancedEditor';

const verticalStackTokens: IStackTokens = {
        childrenGap: 0
    },
    verticalStackStyles: IStackStyles = {
        root: {
            height: '100vh',
            border: `1px solid ${theme.palette.neutralLight}`
        }
    };

const EditorPreview: React.FC = () => {
    const { visual, zoom } = useSelector(state),
        { editorPreviewAreaWidth, spec } = visual,
        editorPreviewStyles: IStackItemStyles = {
            root: {
                display: 'flex',
                boxSizing: 'border-box',
                overflow: 'auto',
                padding: previewAreaPadding,
                height: getPreviewAreaHeight()
            }
        },
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
            style={{ width: editorPreviewAreaWidth }}
        >
            <StackItem verticalFill styles={editorPreviewStyles}>
                {resolveContent()}
            </StackItem>
            <PreviewAreaToolbar />
        </Stack>
    );
};

export default EditorPreview;
