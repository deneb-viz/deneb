import { getConfig } from '../../core/utils/config';
/**
 * Represents values used for logging to the console. The `logLevel`
 * configuration property will determine which log levels are actually output
 * to the browser console.
 *
 * Lower levels are, with anything above `3` (`INFO`)
 * providing different granularities of `DEBUG`-level logging (as it can
 * sometimes be handy to just look at component render events, for example, and
 * the Power BI visual iframe does not allow the React tools to be attached for
 * more detailed debugging, unfortunately).
 */
export { StoreVegaLoggerService, LocalVegaLoggerService } from './vega';

export enum ELogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    HOST = 10,
    RENDER = 11,
    HOOK = 12,
    DEBUG = 50,
    TIMING = 51
}

/**
 * Resolved log level, from configuration.
 */
const LOG_LEVEL = getConfig()?.logLevel ?? ELogLevel.NONE;

/**
 * Padding for the `importance` portion of log output.
 */
const LOG_IMPORTANCE_PAD = 10;

/**
 * Return the correct log method for the supplied level.
 */
const getLog = (level: ELogLevel): ((...args: any[]) => void) => {
    switch (true) {
        case level === ELogLevel.ERROR:
            return console.error;
        case level === ELogLevel.WARN:
            return console.warn;
        case level >= ELogLevel.INFO && level < ELogLevel.HOST:
            return console.info;
        default:
            return console.debug;
    }
};

/**
 * General purpose log function; curried by the public log functions below.
 */
const _log =
    (level: ELogLevel) =>
    (...args: any[]) => {
        const enabled = LOG_LEVEL >= level;
        if (!enabled) return;
        const importance = getPaddedImportance(level);
        getLog(level)?.(`${importance}`, ...args);
    };

/**
 * Start a timer for debug-level logging.
 */
const _logTimeStart =
    (level: ELogLevel = ELogLevel.TIMING) =>
    (label: string) => {
        const enabled = LOG_LEVEL >= level;
        if (!enabled) return;
        const importance = getPaddedImportance(level);
        const newLabel = `${importance} ${label}`;
        console.time?.(newLabel);
    };

/**
 * End a timer for debug-level logging.
 */
const _logTimeEnd =
    (level: ELogLevel = ELogLevel.TIMING) =>
    (label: string) => {
        const enabled = LOG_LEVEL >= level;
        if (!enabled) return;
        const importance = getPaddedImportance(level);
        const newLabel = `${importance} ${label}`;
        console.timeEnd?.(newLabel);
    };

/**
 * Get the importance string for the log entry.
 */
const getPaddedImportance = (level: ELogLevel) => {
    const importance = <string>ELogLevel[level];
    return importance.padEnd(LOG_IMPORTANCE_PAD);
};

/**
 * Special method to provide decorated log entries in the console.
 */
export const logHeading = (message: string, size: number = 20) =>
    console.info(
        `%c${message}`,
        `font-family: Segoe UI; font-size:${size}px; font-weight:600`
    );

/**
 * Debug-level logging to the console.
 */
export const logDebug = _log(ELogLevel.DEBUG);

/**
 * Error-level logging to the console.
 */
export const logError = _log(ELogLevel.ERROR);

/**
 * Info-level logging to the console.
 */
export const logInfo = _log(ELogLevel.INFO);

/**
 * Host-level logging to the console.
 */
export const logHost = _log(ELogLevel.HOST);

/**
 * Render-level logging to the console.
 */
export const logRender = _log(ELogLevel.RENDER);

/**
 * Hook-level logging to the console.
 */
export const logHook = _log(ELogLevel.HOOK);

/**
 * For debug-level logging, start a timer.
 */
export const logTimeStart = _logTimeStart();

/**
 * For debug-level logging, end a timer.
 */
export const logTimeEnd = _logTimeEnd();

/**
 * Warn-level logging to the console.
 */
export const logWarning = _log(ELogLevel.WARN);
