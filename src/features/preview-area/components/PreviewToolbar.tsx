import React from 'react';

import {
    Stack,
    StackItem,
    IStackTokens,
    IStackStyles
} from '@fluentui/react/lib/Stack';

import { ProviderDetail } from './ProviderDetail';
import { PreviewToolbarSeparator } from './PreviewToolbarSeparator';
import { DebugModePivot } from './DebugModePivot';
import { ZoomControls } from './ZoomControls';
import { DebugAreaToggleButton } from './DebugAreaToggleButton';

import { theme } from '../../../core/ui/fluent';
import { reactLog } from '../../../core/utils/reactLog';
import { PREVIEW_PANE_TOOLBAR_PADDING } from '../../../constants';
import { DebugAreaContent } from '../../debug-area';

const horizontalStackTokens: IStackTokens = {
    childrenGap: 0,
    padding: PREVIEW_PANE_TOOLBAR_PADDING
};
const horizontalStackStyles: Partial<IStackStyles> = {
    root: {
        width: '100%',
        borderTop: `1px solid ${theme.palette.neutralLight}`,
        backgroundColor: theme.palette.neutralLighterAlt,
        justifyContent: 'flex-end'
    }
};
const verticalStackStyles: Partial<IStackStyles> = {
    root: {
        height: '100%',
        backgroundColor: theme.palette.white
    }
};

export const PreviewToolbar: React.FC = () => {
    reactLog('Rendering [PreviewToolbar]');
    return (
        <Stack styles={verticalStackStyles}>
            <StackItem>
                <Stack
                    horizontal
                    styles={horizontalStackStyles}
                    tokens={horizontalStackTokens}
                >
                    <DebugModePivot />
                    <StackItem grow>&nbsp;</StackItem>
                    <PreviewToolbarSeparator />
                    <ProviderDetail />
                    <PreviewToolbarSeparator />
                    <ZoomControls />
                    <PreviewToolbarSeparator />
                    <DebugAreaToggleButton />
                </Stack>
            </StackItem>
            <StackItem grow>
                <DebugAreaContent />
            </StackItem>
        </Stack>
    );
};
