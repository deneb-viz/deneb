import React from 'react';

import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles,
    IStackItemStyles
} from '@fluentui/react/lib/Stack';

import store from '../../../store';
import { theme } from '../../../core/ui/fluent';

import DataProcessingRouter from '../../DataProcessingRouter';
import SpecificationError from '../../status/SpecificationError';
import PreviewAreaToolbar from './PreviewAreaToolbar';
import {
    getPreviewAreaHeight,
    previewAreaPadding
} from '../../../core/ui/advancedEditor';

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
    const { editorPreviewAreaWidth, editorSpec } = store((state) => state),
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
            switch (editorSpec.status) {
                case 'error':
                    return <SpecificationError />;
                default:
                    return (
                        <>
                            <div id='editorPreview'>
                                <DataProcessingRouter />
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
