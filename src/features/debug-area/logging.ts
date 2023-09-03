import { SETTINGS_OBJECTS } from '../../core/utils/config';
import { ICapabilitiesEnumMember } from '../settings';

/**
 * Used to exlude debug level entries from the UI.
 */
const DEBUG_LOG_LEVEL = 4;

/**
 * Get the log levels from the capabiliites, adjusting for debug, as we don't
 * want to include this in the UI.
 */
export const getDebugLogLevels = (): ICapabilitiesEnumMember[] =>
    SETTINGS_OBJECTS.vega.properties.logLevel.type.enumeration.filter(
        (e: ICapabilitiesEnumMember) => e.value !== `${DEBUG_LOG_LEVEL}`
    );
