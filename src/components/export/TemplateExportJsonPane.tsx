import * as React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import { IconButton } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';

import {
    exportPivotAssistiveTextStyles,
    exportPivotAssistiveToastTextStyles,
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../config/styles';
import { getExportTemplate } from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { iconButtonStyles } from '../../core/ui/icons';
import ExportDownloadButton from './ExportDownloadButton';

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

const TemplateExportJsonPane: React.FC = () => {
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
            styles={templatePickerStackStyles}
            tokens={templateExportInfoStackTokens}
        >
            <Stack.Item>
                <Stack horizontal>
                    <Stack.Item grow>
                        <Text
                            variant='small'
                            styles={exportPivotAssistiveTextStyles}
                        >
                            {i18nValue('Template_Export_Json_Assistive')}
                        </Text>
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
                    <ExportDownloadButton />
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
            <Stack.Item grow styles={templatePickerNonShrinkingStackItemStyles}>
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

export default TemplateExportJsonPane;
