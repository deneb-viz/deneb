import * as React from 'react';

import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';

import {
    exportPivotAssistiveTextStyles,
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../config/styles';
import ExportDataFields from './ExportDataFields';
import { i18nValue } from '../../core/ui/i18n';

const TemplateExportDatasetPane: React.FC = () => (
    <Stack
        styles={templatePickerStackStyles}
        tokens={templateExportInfoStackTokens}
    >
        <Stack.Item>
            <Text variant='small' styles={exportPivotAssistiveTextStyles}>
                {i18nValue('Template_Export_Dataset_Assistive')}
            </Text>
        </Stack.Item>
        <Stack.Item grow={3} styles={templatePickerNonShrinkingStackItemStyles}>
            <ExportDataFields />
        </Stack.Item>
    </Stack>
);

export default TemplateExportDatasetPane;
