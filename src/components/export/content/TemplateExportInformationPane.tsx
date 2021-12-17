import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Scrollbars } from 'react-custom-scrollbars-2';

import {
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../elements';
import CappedTextField from '../../elements/CappedTextField';
import TemplateExportPreviewImage from './TemplateExportPreviewImage';
import { i18nValue } from '../../../core/ui/i18n';
import { informationProps } from '../../../core/template';

import { Assistive } from '../../elements/Typography';

const TemplateExportInformationPane: React.FC = () => {
    return (
        <Stack
            styles={templatePickerStackStyles}
            tokens={templateExportInfoStackTokens}
        >
            <Stack.Item>
                <Assistive>
                    {i18nValue('Template_Export_Information_Assistive')}
                </Assistive>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <Scrollbars>
                    <Stack tokens={templateExportInfoStackTokens}>
                        <Stack.Item>
                            <CappedTextField
                                id='information.name'
                                i18nLabel='Template_Export_Information_Name'
                                i18nPlaceholder='Template_Export_Information_Name_Placeholder'
                                maxLength={informationProps.name.maxLength}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <CappedTextField
                                id='information.description'
                                i18nLabel='Template_Export_Information_Description'
                                i18nPlaceholder='Template_Description_Optional_Placeholder'
                                maxLength={
                                    informationProps.description.maxLength
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
                                maxLength={informationProps.author.maxLength}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <TemplateExportPreviewImage />
                        </Stack.Item>
                    </Stack>
                </Scrollbars>
            </Stack.Item>
        </Stack>
    );
};

export default TemplateExportInformationPane;
