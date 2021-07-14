import * as React from 'react';
import { useSelector } from 'react-redux';
import { Stack } from '@fluentui/react/lib/Stack';

import Debugger from '../../Debugger';
import { state } from '../../store';
import {
    templatePickerStackStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
} from '../../config/styles';
import PreDefinedProviderTemplateList from './PreDefinedProviderTemplateList';
import ImportTemplateControl from './ImportTemplateControl';
import ImportTemplateHandler from './ImportTemplateHandler';

const TemplateManagementPane: React.FC = () => {
    Debugger.log('Rendering Component: [TemplateManagementPane]...');
    const root = useSelector(state),
        { templates } = root,
        { templateProvider: selectedProvider } = templates,
        resolveTemplateInput = () => {
            switch (selectedProvider) {
                case 'import':
                    return <ImportTemplateControl />;
                default:
                    return <PreDefinedProviderTemplateList />;
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
