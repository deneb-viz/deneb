import * as React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Scrollbars } from 'react-custom-scrollbars-2';

import {
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../../config/styles';
import ExportDataFields from './ExportDataFields';
import { i18nValue } from '../../../core/ui/i18n';
import { Assistive } from '../../elements/Typography';

const TemplateExportDatasetPane: React.FC = () => (
    <Stack
        styles={templatePickerStackStyles}
        tokens={templateExportInfoStackTokens}
    >
        <Stack.Item>
            <Assistive>
                {i18nValue('Template_Export_Dataset_Assistive')}
            </Assistive>
        </Stack.Item>
        <Stack.Item grow={3} styles={templatePickerNonShrinkingStackItemStyles}>
            <Scrollbars>
                <ExportDataFields />
            </Scrollbars>
        </Stack.Item>
    </Stack>
);

export default TemplateExportDatasetPane;
