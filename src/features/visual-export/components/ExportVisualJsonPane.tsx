import React, { useState } from 'react';

import { CopyRegular } from '@fluentui/react-icons';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import { ITextStyles } from '@fluentui/react/lib/Text';
import { Button, Caption2, Tooltip } from '@fluentui/react-components';

import { getExportTemplate } from '../logic';
import { ExportVisualDownloadButton } from './ExportVisualDownloadButton';
import {
    TEMPLATE_EXPORT_INFO_STACK_TOKENS,
    TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES,
    TEMPLATE_PICKER_STACK_STYLES
} from '../../template';
import { getI18nValue } from '../../i18n';
import { TooltipCustomMount } from '../../interface';

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

export const ExportVisualJsonPane: React.FC = () => {
    const [copySuccess, setCopySuccess] = React.useState(false),
        textAreaRef = React.useRef(null),
        copyRef = React.useRef(null);
    const [ttRef, setTtRef] = useState<HTMLElement | null>();
    const handleCopy = () => {
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
                        <Caption2>
                            {getI18nValue('Template_Export_Json_Assistive')}
                        </Caption2>
                    </Stack.Item>
                    <Stack.Item>
                        {copySuccess && (
                            <Text
                                variant='small'
                                styles={exportPivotAssistiveToastTextStyles}
                            >
                                {getI18nValue('Template_Export_Json_Copied')}
                            </Text>
                        )}
                    </Stack.Item>
                    <ExportVisualDownloadButton />
                    <Stack.Item>
                        <Tooltip
                            content={getI18nValue('Template_Export_Json_Copy')}
                            relationship='label'
                            withArrow
                            mountNode={ttRef}
                        >
                            <Button
                                ref={copyRef}
                                onClick={handleCopy}
                                icon={<CopyRegular />}
                            />
                        </Tooltip>
                        <TooltipCustomMount setRef={setTtRef} />
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
