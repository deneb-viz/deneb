import React, { useMemo } from 'react';
import { Select, SelectProps } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { useDebugStyles } from '..';
import store from '../../../store';
import { logRender } from '../../logging';
import { getDebugLogLevels } from '../logging';
import { ICapabilitiesEnumMember } from '../../powerbi-settings';
import { updateLogLevel } from '../../../core/ui/commands';
import { getI18nValue } from '../../i18n';

interface ILogLevelDropdownProps {
    id: string;
}

/**
 * Represents a dropdown for selecting a log level in the UI. Composed from
 * Fluent UI `Menu` and `SplitButton` components, as Dropdown is still unstable.
 */
export const LogLevelDropdown: React.FC<ILogLevelDropdownProps> = ({ id }) => {
    const { logLevel } = store(
        (state) => ({
            logLevel: state.visualSettings.vega.logLevel
        }),
        shallow
    );
    const items = useMemo(() => getFieldOptions(logLevel), []);
    const onChange: SelectProps['onChange'] = (
        event: React.ChangeEvent<HTMLSelectElement>,
        data
    ) => {
        updateLogLevel(data.value);
    };
    const classes = useDebugStyles();
    logRender('LogLevelDropdown');
    return (
        <Select
            className={classes.logLevelDropdown}
            aria-labelledby={id}
            onChange={onChange}
            size='small'
        >
            {items}
        </Select>
    );
};

/**
 * Returns a list of `MenuItemRadio` components from the visual capabilities.
 */
const getFieldOptions = (logLevel: number) =>
    getDebugLogLevels().map((e: ICapabilitiesEnumMember) => {
        const selected = e.value === `${logLevel}`;

        return (
            <option value={`${e.value}`} selected={selected}>
                {getI18nValue(e.displayNameKey as string)}
            </option>
        );
    });
