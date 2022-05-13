import { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Info, Warn, Error } from 'vega';

import { i18nValue } from '../../core/ui/i18n';
import { getConfig } from '../../core/utils/config';
import { useStoreProp } from '../../store';
import { ILogEntry, ILogEntryDisplay, ILogLevel } from './types';

const getLogEntryDisplayDetail = (entry: ILogEntry): ILogEntryDisplay => {
    const { level, message } = entry;
    const metadata = logLevels.find((ll) => ll.level === level);
    return (
        metadata && {
            level,
            i18nLevel: i18nValue(metadata.i18n),
            message,
            color: metadata.color,
            icon: metadata.icon
        }
    );
};

const { logLevels } = getConfig().previewPane;

const getLogLevels = (): ILogLevel[] => logLevels;

export const getLogLevelsForDropdown = (): IDropdownOption[] =>
    getLogLevels().map(({ level, i18n }) => ({
        key: level,
        text: i18nValue(i18n)
    }));

export const getLogEntriesForDisplay = () => {
    return getResolvedLogEntries()
        .map((e) => getLogEntryDisplayDetail(e))
        .sort((a, b) => a.level - b.level);
};

const getResolvedLogEntries = () => {
    const error = useStoreProp<string>('editorLogError');
    const errors = useStoreProp<string[]>('editorLogErrors');
    const warns = useStoreProp<string[]>('editorLogWarns');
    return logHasErrors() || warns.length > 0
        ? [
              ...(error ? [{ level: Error, message: error }] : []),
              ...errors?.map((e): ILogEntry => ({ level: Error, message: e })),
              ...warns?.map((w): ILogEntry => ({ level: Warn, message: w }))
          ]
        : [{ level: Info, message: i18nValue('Pivot_Log_No_Issues') }];
};

export const getLogErrorForStatusDisplay = () => {
    const error = useStoreProp<string>('editorLogError');
    const errors = useStoreProp<string[]>('editorLogErrors');
    return error || errors?.[0] || '';
};

export const logHasErrors = () => {
    const error = useStoreProp<string>('editorLogError');
    const errors = useStoreProp<string[]>('editorLogErrors');
    return error !== null || errors.length > 0 || false;
};
