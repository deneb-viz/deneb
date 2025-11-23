import {
    logDebug as dbLogDebug,
    logError as dbLogError,
    logInfo as dbLogInfo,
    logHost as dbLogHost,
    logRender as dbLogRender,
    logHook as dbLogHook,
    logTimeStart as dbLogTimeStart,
    logTimeEnd as dbLogTimeEnd,
    logWarning as dbLogWarning,
    logHeading as dbLogHeading
} from '@deneb-viz/utils/logging';

/**
 * Special method to provide decorated log entries in the console.
 */
export const logHeading = dbLogHeading;
/**
 * Debug-level logging to the console.
 */
export const logDebug = dbLogDebug;

/**
 * Error-level logging to the console.
 */
export const logError = dbLogError;

/**
 * Info-level logging to the console.
 */
export const logInfo = dbLogInfo;

/**
 * Host-level logging to the console.
 */
export const logHost = dbLogHost;

/**
 * Render-level logging to the console.
 */
export const logRender = dbLogRender;

/**
 * Hook-level logging to the console.
 */
export const logHook = dbLogHook;

/**
 * For debug-level logging, start a timer.
 */
export const logTimeStart = dbLogTimeStart;

/**
 * For debug-level logging, end a timer.
 */
export const logTimeEnd = dbLogTimeEnd;

/**
 * Warn-level logging to the console.
 */
export const logWarning = dbLogWarning;
