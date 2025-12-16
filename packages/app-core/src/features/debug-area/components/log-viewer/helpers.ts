import { VEGA_LOG_LEVEL_CONFIGURATION } from '@deneb-viz/configuration';
import { type LogLevelEnumMember } from './types';

/**
 * Used to exclude debug level entries from the UI.
 */
const DEBUG_LOG_LEVEL = 4;

/**
 * Get the log levels from the capabilities, adjusting for debug, as we don't want to include this in the UI.
 */
export const getDebugLogLevels = (): LogLevelEnumMember[] =>
    VEGA_LOG_LEVEL_CONFIGURATION.filter(
        (e: LogLevelEnumMember) => e.value !== DEBUG_LOG_LEVEL
    );
