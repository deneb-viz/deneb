import React, { useMemo } from 'react';
import { makeStyles, Select, SelectProps } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../../state';
import { type LogLevelEnumMember } from './types';
import { handleVegaLogLevel } from '../../../../lib';
import { getDebugLogLevels } from './helpers';

type LogLevelDropdownProps = {
    id: string;
};

const useLogLevelStyles = makeStyles({
    root: {
        minWidth: '95px',
        width: '95px',
        maxWidth: '95px'
    }
});

/**
 * Represents a dropdown for selecting a log level in the UI. Composed from
 * Fluent UI `Menu` and `SplitButton` components, as Dropdown is still unstable.
 */
export const LogLevelDropdown = ({ id }: LogLevelDropdownProps) => {
    const { logLevel } = useDenebState((state) => ({
        logLevel: state.visualSettings.vega.logging.logLevel.value
    }));
    const items = useMemo(() => getFieldOptions(), []);
    const onChange: SelectProps['onChange'] = (
        event: React.ChangeEvent<HTMLSelectElement>,
        data
    ) => {
        handleVegaLogLevel(data.value);
    };
    const classes = useLogLevelStyles();
    logRender('LogLevelDropdown');
    return (
        <Select
            className={classes.root}
            aria-labelledby={id}
            value={`${logLevel}`}
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
const getFieldOptions = () =>
    getDebugLogLevels().map((e: LogLevelEnumMember) => {
        const { translate } = useDenebState.getState().i18n;
        return (
            <option key={e.value} value={`${e.value}`}>
                {translate(e.displayNameKey as string)}
            </option>
        );
    });
