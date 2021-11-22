import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';

import Debugger from '../../Debugger';
import store from '../../store';
import {
    templatePickerStackStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
} from '../../config/styles';
import ProviderTemplateList from './ProviderTemplateList';
import ImportTemplateControl from './ImportTemplateControl';
import ImportTemplateHandler from './ImportTemplateHandler';

const TemplateManagementPane: React.FC = () => {
    Debugger.log('Rendering Component: [TemplateManagementPane]...');
    const { templateProvider } = store(),
        resolveTemplateInput = () => {
            switch (templateProvider) {
                case 'import':
                    return <ImportTemplateControl />;
                default:
                    return <ProviderTemplateList />;
            }
        };
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
                {resolveTemplateInput()}
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <ImportTemplateHandler />
            </Stack.Item>
        </Stack>
    );
};

export default TemplateManagementPane;
