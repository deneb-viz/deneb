import React from 'react';

import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles
} from '@fluentui/react/lib/Stack';

import ZoomControls from './ZoomControls';

import { theme } from '../../../api/fluent';

const previewToolbarStackStyles = {
        root: {
            display: 'flex'
        }
    },
    horizontalStackStyles: Partial<IStackStyles> = {
        root: {
            width: '100%',
            borderTop: `1px solid ${theme.palette.neutralLight}`,
            backgroundColor: theme.palette.neutralLighterAlt,
            height: 30,
            justifyContent: 'flex-end'
        }
    },
    horiztontalStackTokens: IStackTokens = {
        childrenGap: 5,
        padding: 3
    };

const PreviewAreaToolbar: React.FC = () => {
    return (
        <StackItem shrink styles={previewToolbarStackStyles}>
            <Stack
                horizontal
                styles={horizontalStackStyles}
                tokens={horiztontalStackTokens}
            >
                <ZoomControls />
            </Stack>
        </StackItem>
    );
};

export default PreviewAreaToolbar;
