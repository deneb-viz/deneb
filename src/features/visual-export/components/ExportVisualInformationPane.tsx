import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';

import CappedTextField from '../../../components/elements/CappedTextField';
import { ExportVisualPreviewImage } from './ExportVisualPreviewImage';

import { Assistive } from '../../../components/elements/Typography';

import {
    TEMPLATE_INFORMATION_PROPS,
    TEMPLATE_EXPORT_INFO_STACK_TOKENS,
    TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES,
    TEMPLATE_PICKER_STACK_STYLES
} from '../../template';
import { getI18nValue } from '../../i18n';

export const ExportVisualInformationPane: React.FC = () => {
    return (
        <Stack
            styles={TEMPLATE_PICKER_STACK_STYLES}
            tokens={TEMPLATE_EXPORT_INFO_STACK_TOKENS}
        >
            <Stack.Item>
                <Assistive>
                    {getI18nValue('Template_Export_Information_Assistive')}
                </Assistive>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES}
            >
                <>
                    <Stack tokens={TEMPLATE_EXPORT_INFO_STACK_TOKENS}>
                        <Stack.Item>
                            <CappedTextField
                                id='information.name'
                                i18nLabel='Template_Export_Information_Name'
                                i18nPlaceholder='Template_Export_Information_Name_Placeholder'
                                maxLength={
                                    TEMPLATE_INFORMATION_PROPS.name.maxLength
                                }
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <CappedTextField
                                id='information.description'
                                i18nLabel='Template_Export_Information_Description'
                                i18nPlaceholder='Template_Description_Optional_Placeholder'
                                maxLength={
                                    TEMPLATE_INFORMATION_PROPS.description
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
                                    TEMPLATE_INFORMATION_PROPS.author.maxLength
                                }
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <ExportVisualPreviewImage />
                        </Stack.Item>
                    </Stack>
                </>
            </Stack.Item>
        </Stack>
    );
};
