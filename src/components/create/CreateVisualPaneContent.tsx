import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Scrollbars } from 'react-custom-scrollbars-2';

import {
    templatePickerStackStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
} from '../elements';
import TemplateStateHandler from './content/TemplateStateHandler';
import CreateVisualTemplateNav from './nav/CreateVisualTemplateNav';
import { reactLog } from '../../core/utils/reactLog';

const CreateVisualPaneContent: React.FC = () => {
    reactLog('Rendering [CreateVisualPaneContent]');
    return (
        <Stack
            horizontal
            styles={templatePickerStackStyles}
            tokens={templatePickerStackTokens}
        >
            <Stack.Item
                grow
                disableShrink
                styles={templatePickerStackItemListStyles}
            >
                <>
                    <CreateVisualTemplateNav />
                </>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <TemplateStateHandler />
            </Stack.Item>
        </Stack>
    );
};

export default CreateVisualPaneContent;
