import React from 'react';

import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles
} from '@fluentui/react/lib/Stack';

import ZoomControls from './ZoomControls';

import { theme } from '../../../core/ui/fluent';
import {
    previewToolbarHeight,
    previewToolbarPadding
} from '../../../core/ui/advancedEditor';

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
            height: previewToolbarHeight,
            justifyContent: 'flex-end'
        }
    },
    horiztontalStackTokens: IStackTokens = {
        childrenGap: 0,
        padding: previewToolbarPadding
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
