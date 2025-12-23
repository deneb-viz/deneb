import { useMemo } from 'react';
import { Label, makeStyles, tokens, useId } from '@fluentui/react-components';
import { Error, Info, Warn } from 'vega';

import { LogLevelDropdown } from './log-level-dropdown';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../../state';
import { StatusBarContainer } from '../../../../components/ui';
import type { LogEntry, LogEntryDisplay, LogLevelEnumMember } from './types';
import { getDebugLogLevels } from './helpers';
import {
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '../../../../lib';

/**
 * Styles used for debugging features.
 */
export const useLogViewerStyles = makeStyles({
    container: {
        height: `calc(100% - ${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px - ${
            SPLIT_PANE_HANDLE_SIZE / 2
        }px)`
    },
    contentWrapper: {
        display: 'flex',
        height: '100%',
        maxHeight: '100%',
        flexDirection: 'column'
    },
    logDetails: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        height: '0px',
        overflow: 'auto',
        padding: tokens.spacingVerticalM
    },
    logLevelDropdown: {
        minWidth: '95px',
        width: '95px',
        maxWidth: '95px'
    },
    logLevelEntry0: {
        fontWeight: 'bold',
        color: tokens.colorNeutralForeground1
    },
    logLevelEntry1: {
        fontWeight: 'bold',
        color: tokens.colorPaletteRedForeground1
    },
    logLevelEntry2: {
        fontWeight: 'bold',
        color: tokens.colorPaletteYellowForeground1
    },
    logLevelEntry3: {
        fontWeight: 'bold',
        color: tokens.colorPaletteGreenForeground1
    },
    logLevelEntry4: {
        fontWeight: 'bold',
        color: tokens.colorNeutralForeground1
    },
    statusBar: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        margin: `${tokens.spacingVerticalNone} ${tokens.spacingHorizontalMNudge}`
    },
    tab: {
        paddingBottom: '1px'
    }
});

export const LogViewer = () => {
    const { errors, logLevel, warns } = useDenebState((state) => ({
        errors: state.specification.errors,
        logLevel: state.project.logLevel,
        warns: state.specification.warns
    }));
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useLogViewerStyles();
    const levelId = useId();
    const levelLabel = useMemo(() => translate('Text_Vega_LogLevel'), []);
    const logEntries = getLogEntries(warns, errors, logLevel as number, classes);
    logRender('LogViewer', { warns, errors });
    return (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.logDetails}>{logEntries}</div>
                <StatusBarContainer>
                    <div className={classes.statusBar}>
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
const getLogEntries = (
    warns: string[],
    errors: string[],
    logLevel: number,
    classes: ReturnType<typeof useLogViewerStyles>
) =>
    getDebugLogEntriesForDisplay(warns, errors, logLevel).map((e, i) => (
        <div key={`${e.level}-${i}-${e.message}`}>
            <span
                className={
                    classes[
                        `logLevelEntry${e.level}` as keyof ReturnType<
                            typeof useLogViewerStyles
                        >
                    ]
                }
            >
                [{e.i18nLevel}]
            </span>{' '}
            {e.message}
        </div>
    ));

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
const getDebugLogEntryDisplayDetails = (entry: LogEntry): LogEntryDisplay => {
    const { level, message } = entry;
    const metadata = getDebugLogLevels().find(
        (e: LogLevelEnumMember) => e.value === level
    );
    const { translate } = useDenebState.getState().i18n;
    return metadata
        ? {
              level,
              message,
              i18nLevel: translate(metadata.displayNameKey || '')
          }
        : {
              level,
              message,
              i18nLevel: translate('Enum_Log_Level_Unknown')
          };
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
): LogEntry[] => {
    const { translate } = useDenebState.getState().i18n;
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
                      message: translate('Pivot_Log_No_Issues')
                  }
              ]
    ).filter((e) => e.level <= logLevel);
};
