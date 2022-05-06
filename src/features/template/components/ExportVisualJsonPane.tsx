import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';
import { ITextStyles } from '@fluentui/react/lib/Text';

import { getExportTemplate } from '../../../core/template';
import { i18nValue } from '../../../core/ui/i18n';
import { iconButtonStyles } from '../../../core/ui/icons';
import { ExportVisualDownloadButton } from './ExportVisualDownloadButton';
import { Assistive } from '../../../components/elements/Typography';
import {
    TEMPLATE_EXPORT_INFO_STACK_TOKENS,
    TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES,
    TEMPLATE_PICKER_STACK_STYLES
} from '../styles';

const exportPivotAssistiveToastTextStyles: ITextStyles = {
    root: {
        display: 'inline-block',
        paddingTop: '8px',
        paddingRight: '8px'
    }
};
const textStyles: Partial<ITextFieldStyles> = {
    root: {
        width: '100%',
        height: '100%',
        paddingBottom: '16px',
        fontFamily: 'monospace'
    },
    wrapper: {
        height: '100%'
    },
    fieldGroup: {
        height: '100%'
    },
    field: {
        fontSize: '85%'
    }
};
const copyIcon: IIconProps = { iconName: 'Copy' };

export const ExportVisualJsonPane: React.FC = () => {
    const [copySuccess, setCopySuccess] = React.useState(false),
        textAreaRef = React.useRef(null),
        copyRef = React.useRef(null),
        handleCopy = () => {
            textAreaRef.current.select();
            document.execCommand('copy');
            setCopySuccess(true);
            copyRef.current.focus();
            setTimeout(() => {
                setCopySuccess(false);
            }, 3500);
        };

    return (
        <Stack
            styles={TEMPLATE_PICKER_STACK_STYLES}
            tokens={TEMPLATE_EXPORT_INFO_STACK_TOKENS}
        >
            <Stack.Item>
                <Stack horizontal>
                    <Stack.Item grow>
                        <Assistive>
                            {i18nValue('Template_Export_Json_Assistive')}
                        </Assistive>
                    </Stack.Item>
                    <Stack.Item>
                        {copySuccess && (
                            <Text
                                variant='small'
                                styles={exportPivotAssistiveToastTextStyles}
                            >
                                {i18nValue('Template_Export_Json_Copied')}
                            </Text>
                        )}
                    </Stack.Item>
                    <ExportVisualDownloadButton />
                    <Stack.Item>
                        <IconButton
                            componentRef={copyRef}
                            iconProps={copyIcon}
                            styles={iconButtonStyles}
                            ariaLabel={i18nValue('Template_Export_Json_Copy')}
                            ariaDescription={i18nValue(
                                'Template_Export_Json_Copy'
                            )}
                            onClick={handleCopy}
                        />
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item
                grow
                styles={TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES}
            >
                <TextField
                    componentRef={textAreaRef}
                    multiline
                    readOnly
                    value={getExportTemplate()}
                    styles={textStyles}
                    resizable={false}
                />
            </Stack.Item>
        </Stack>
    );
};
