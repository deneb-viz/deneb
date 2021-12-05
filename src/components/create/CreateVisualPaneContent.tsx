import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Scrollbars } from 'react-custom-scrollbars-2';

import {
    templatePickerStackStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
} from '../../config/styles';
import TemplateStateHandler from './content/TemplateStateHandler';
import CreateVisualTemplateNav from './nav/CreateVisualTemplateNav';

const CreateVisualPaneContent: React.FC = () => {
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
                <Scrollbars>
                    <CreateVisualTemplateNav />
                </Scrollbars>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <Scrollbars>
                    <TemplateStateHandler />
                </Scrollbars>
            </Stack.Item>
        </Stack>
    );
};

export default CreateVisualPaneContent;
