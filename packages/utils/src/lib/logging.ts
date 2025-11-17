/**
 * Represents the log levels available to the internal logger.
 */
enum LogLevel {
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
 * The log level to use for the logger.
 *
 * This is set by the `LOG_LEVEL` environment variable, which can be set to
 * one of the values in `LogLevel`.
 */
const NAME_TO_LEVEL: Record<string, LogLevel> = {
    NONE: LogLevel.NONE,
    ERROR: LogLevel.ERROR,
    WARN: LogLevel.WARN,
    INFO: LogLevel.INFO,
    HOST: LogLevel.HOST,
    RENDER: LogLevel.RENDER,
    HOOK: LogLevel.HOOK,
    DEBUG: LogLevel.DEBUG,
    TIMING: LogLevel.TIMING,
    // Synonyms
    OFF: LogLevel.NONE,
    SILENT: LogLevel.NONE
};

const parseLogLevel = (input: unknown, fallback: LogLevel): LogLevel => {
    if (typeof input === 'number' && Number.isFinite(input)) {
        return input as LogLevel;
    }
    if (typeof input === 'string') {
        const trimmed = input.trim();
        // Numeric string
        if (/^-?\d+$/.test(trimmed)) {
            const n = Number(trimmed);
            if (Number.isFinite(n)) return n as LogLevel;
        }
        const upper = trimmed.toUpperCase();
        if (Object.prototype.hasOwnProperty.call(NAME_TO_LEVEL, upper)) {
            return NAME_TO_LEVEL[
                upper as keyof typeof NAME_TO_LEVEL
            ] as LogLevel;
        }
    }
    return fallback;
};

const DEFAULT_LOG_LEVEL = LogLevel.INFO;

const LOG_LEVEL: LogLevel = parseLogLevel(
    process.env?.['LOG_LEVEL'],
    DEFAULT_LOG_LEVEL
);

/**
 * Padding for the `importance` portion of log output.
 */
const LOG_IMPORTANCE_PAD = 10;

/**
 * Return the correct log method for the supplied level.
 */
const getLog = (level: LogLevel): ((...args: unknown[]) => void) => {
    switch (true) {
        case level === LogLevel.ERROR:
            return console.error;
        case level === LogLevel.WARN:
            return console.warn;
        case level >= LogLevel.INFO && level < LogLevel.HOST:
            return console.info;
        default:
            return console.debug;
    }
};

/**
 * General purpose log function; curried by the public log functions below.
 */
const _log =
    (level: LogLevel) =>
    (...args: unknown[]) => {
        const enabled = LOG_LEVEL >= level;
        if (!enabled) return;
        const importance = getPaddedImportance(level);
        getLog(level)?.(`${importance}`, ...args);
    };

/**
 * Start a timer for debug-level logging.
 */
const _logTimeStart =
    (level: LogLevel = LogLevel.TIMING) =>
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
    (level: LogLevel = LogLevel.TIMING) =>
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
const getPaddedImportance = (level: LogLevel) => {
    const importance = <string>LogLevel[level];
    return importance.padEnd(LOG_IMPORTANCE_PAD);
};

/**
 * Special method to provide decorated log entries in the console.
 */
export const logHeading = (message: string, size = 20) =>
    console.info(
        `%c${message}`,
        `font-family: Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif; font-size:${size}px; font-weight:600`
    );

/**
 * Debug-level logging to the console.
 */
export const logDebug = _log(LogLevel.DEBUG);

/**
 * Error-level logging to the console.
 */
export const logError = _log(LogLevel.ERROR);

/**
 * Info-level logging to the console.
 */
export const logInfo = _log(LogLevel.INFO);

/**
 * Host-level logging to the console.
 */
export const logHost = _log(LogLevel.HOST);

/**
 * Render-level logging to the console.
 */
export const logRender = _log(LogLevel.RENDER);

/**
 * Hook-level logging to the console.
 */
export const logHook = _log(LogLevel.HOOK);

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
export const logWarning = _log(LogLevel.WARN);
