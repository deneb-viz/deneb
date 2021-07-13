import * as React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import {
    exportPivotAssistiveTextStyles,
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../config/styles';
import { exportFieldConstraints } from '../../config';
import CappedTextField from '../elements/CappedTextField';
import { i18nValue } from '../../core/ui/i18n';

const TemplateExportInformationPane: React.FC = () => (
    <Stack
        styles={templatePickerStackStyles}
        tokens={templateExportInfoStackTokens}
    >
        <Stack.Item>
            <Text variant='small' styles={exportPivotAssistiveTextStyles}>
                {i18nValue('Template_Export_Information_Assistive')}
            </Text>
        </Stack.Item>
        <Stack.Item grow={3} styles={templatePickerNonShrinkingStackItemStyles}>
            <Stack tokens={templateExportInfoStackTokens}>
                <Stack.Item>
                    <CappedTextField
                        id='information.name'
                        i18nLabel='Template_Export_Information_Name'
                        i18nPlaceholder='Template_Export_Information_Name_Placeholder'
                        maxLength={
                            exportFieldConstraints.information.name.maxLength
                        }
                    />
                </Stack.Item>
                <Stack.Item>
                    <CappedTextField
                        id='information.description'
                        i18nLabel='Template_Export_Information_Description'
                        i18nPlaceholder='Template_Description_Optional_Placeholder'
                        maxLength={
                            exportFieldConstraints.information.description
                                .maxLength
                        }
                        multiline
                    />
                </Stack.Item>
                <Stack.Item>
                    <CappedTextField
                        id='information.author'
                        i18nLabel='Template_Export_Author_Name'
                        i18nPlaceholder='Template_Export_Author_Name_Placeholder'
                        i18nAssistiveText='Template_Export_Author_Name_Assistive'
                        maxLength={
                            exportFieldConstraints.information.author.maxLength
                        }
                    />
                </Stack.Item>
            </Stack>
        </Stack.Item>
    </Stack>
);

export default TemplateExportInformationPane;
