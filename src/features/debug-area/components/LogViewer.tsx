import React, { useCallback } from 'react';
import { Stack, StackItem } from '@fluentui/react/lib/Stack';
import {
    Dropdown,
    IDropdownOption,
    IDropdownStyles
} from '@fluentui/react/lib/Dropdown';

import { reactLog } from '../../../core/utils/reactLog';
import { i18nValue } from '../../../core/ui/i18n';
import { useStoreVegaProp } from '../../../store';
import { updateLogLevel } from '../../../core/ui/commands';
import ResetButton from '../../../components/elements/ResetButton';
import { theme } from '../../../core/ui/fluent';
import { horizontalDropdownStyles } from '../../../components/elements';
import { getLogEntriesForDisplay, getLogLevelsForDropdown } from '../logging';

const dropdownStyles: Partial<IDropdownStyles> = {
    ...horizontalDropdownStyles,
    ...{ dropdown: { width: 80 } }
};

const getLogEntriesFormatted = () =>
    getLogEntriesForDisplay().map((e) => {
        return (
            <div>
                <span
                    style={{
                        fontWeight: 'bold',
                        color: theme.palette[e.color]
                    }}
                >
                    [{e.i18nLevel}]
                </span>{' '}
                {e.message}
            </div>
        );
    });

const LogViewer: React.FC = () => {
    const logLevel = useStoreVegaProp<number>('logLevel');
    const dropdownOptions = getLogLevelsForDropdown();
    const handleChange = useCallback(
        (ev: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void => {
            updateLogLevel(`${item.key}`);
        },
        []
    );
    reactLog('Rendering [LogViewer]');
    return (
        <>
            <StackItem>
                <Stack horizontal horizontalAlign='end'>
                    <Dropdown
                        styles={dropdownStyles}
                        options={dropdownOptions}
                        selectedKey={logLevel}
                        label={i18nValue('Objects_Vega_LogLevel')}
                        onChange={handleChange}
                    />
                    <ResetButton
                        resetPropertyKey='logLevel'
                        i18nKey='Tooltip_Setting_Reset'
                        location='debugger'
                    />
                </Stack>
            </StackItem>
            <StackItem grow>{getLogEntriesFormatted()}</StackItem>
        </>
    );
};

export default LogViewer;
