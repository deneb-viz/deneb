import React, { useMemo } from 'react';
import { Label, useId } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';
import { Error, Info, Warn } from 'vega';

import { i18nValue } from '../../../core/ui/i18n';
import store from '../../../store';
import { logRender } from '../../logging';
import { useDebugStyles } from '..';
import { ILogEntry, ILogEntryDisplay } from '../types';
import { ICapabilitiesEnumMember } from '../../powerbi-settings';
import { getDebugLogLevels } from '../logging';
import { StatusBarContainer } from '../../interface';
import { LogLevelDropdown } from './log-level-dropdown';

export const LogViewer: React.FC = () => {
    const { errors, logLevel, warns } = store(
        (state) => ({
            errors: state.specification.errors,
            logLevel: state.visualSettings.vega.logLevel,
            warns: state.specification.warns
        }),
        shallow
    );
    const classes = useDebugStyles();
    const levelId = useId();
    const levelLabel = useMemo(() => i18nValue('Objects_Vega_LogLevel'), []);
    const logEntries = useMemo(
        () => getLogEntries(warns, errors, logLevel),
        [warns, errors, logLevel]
    );
    logRender('LogViewer');
    return (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.logDetails}>{logEntries}</div>
                <StatusBarContainer>
                    <div className={classes.statusBarLog}>
                        <Label size='small' id={levelId}>
                            {levelLabel}
                        </Label>
                        <LogLevelDropdown id={levelId} />
                    </div>
                </StatusBarContainer>
            </div>
        </div>
    );
};

/**
 * Get and format all log entries for display.
 */
const getLogEntries = (warns: string[], errors: string[], logLevel: number) => {
    const classes = useDebugStyles();
    return getDebugLogEntriesForDisplay(warns, errors, logLevel).map((e) => (
        <div>
            <span className={classes[`logLevelEntry${e.level}`]}>
                [{e.i18nLevel}]
            </span>{' '}
            {e.message}
        </div>
    ));
};

/**
 * Get all log entries, translate the level, and sort them for display, based
 * on level.
 */
const getDebugLogEntriesForDisplay = (
    warns: string[],
    errors: string[],
    logLevel: number
) =>
    getResolvedLogEntries(warns, errors, logLevel)
        .map((e) => getDebugLogEntryDisplayDetails(e))
        .sort((a, b) => a.level - b.level);

/**
 * Handle lookup and translation of the log level, so we can display it in the
 * UI.
 */
const getDebugLogEntryDisplayDetails = (entry: ILogEntry): ILogEntryDisplay => {
    const { level, message } = entry;
    const metadata = getDebugLogLevels().find(
        (e: ICapabilitiesEnumMember) => e.value === `${level}`
    );
    return (
        metadata && {
            level,
            message,
            i18nLevel: i18nValue(metadata.displayNameKey)
        }
    );
};

/**
 * Get the current log messages from the store, so they can be used for display
 * in the UI. We also add a 'success' message if the info level is selected.
 * This is then filtered based on the current log level, so we only get what we
 * need for the end-user.
 */
const getResolvedLogEntries = (
    warns: string[],
    errors: string[],
    logLevel: number
): ILogEntry[] => {
    return (
        errors.length > 0 || warns.length > 0
            ? [
                  ...(errors?.map((e: string) => ({
                      level: Error,
                      message: e
                  })) || []),
                  ...(warns?.map((e: string) => ({
                      level: Warn,
                      message: e
                  })) || [])
              ]
            : [
                  {
                      level: Info,
                      message: i18nValue('Pivot_Log_No_Issues')
                  }
              ]
    ).filter((e) => e.level <= logLevel);
};
