import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { VisualFormattingSettingsModel } from './model';
import {
    type VersionChangeDirection,
    type VersionComparator,
    type VersionInformation
} from '@deneb-viz/utils/versioning';
import {
    APPLICATION_INFORMATION_CONFIGURATION,
    PROJECT_DEFAULTS,
    PROVIDER_VERSION_CONFIGURATION
} from '@deneb-viz/configuration';
import { logDebug } from '@deneb-viz/utils/logging';
import { type PersistenceProperty } from './types';
import { persistProperties, resolveObjectProperties } from './persist';
import { getDenebState } from '@deneb-viz/app-core';
import { getDenebVisualState } from '../../state';

/**
 * Current visual and provider information
 */
const getCurrentVersionInfo = (
    visualSettings: VisualFormattingSettingsModel
): VersionInformation => {
    const {
        vega: {
            output: {
                provider: { value: provider }
            }
        }
    } = visualSettings;
    return {
        denebVersion: APPLICATION_INFORMATION_CONFIGURATION.version,
        provider: provider as SpecProvider,
        providerVersion: PROVIDER_VERSION_CONFIGURATION[provider]
    };
};

/**
 * Visual and provider information, according to visual properties (when changes were last persisted).
 */
const getLastVersionInfo = (
    visualSettings: VisualFormattingSettingsModel
): VersionInformation => {
    const {
        developer: {
            versioning: {
                version: { value: denebVersion }
            }
        },
        vega: {
            output: {
                provider: { value: provider },
                version: { value: providerVersion }
            }
        }
    } = visualSettings;
    return {
        denebVersion,
        provider: provider as SpecProvider,
        providerVersion
    };
};

/**
 * Get previous and current version information as a single object.
 */
const getVersionComparatorInfo = (
    visualSettings: VisualFormattingSettingsModel
): VersionComparator => ({
    current: getCurrentVersionInfo(visualSettings),
    previous: getLastVersionInfo(visualSettings)
});

/**
 * Determine if a change has occurred since last persist, and the direction.
 */
const getVersionChangeDetail = (
    comparatorInfo: VersionComparator
): VersionChangeDirection => {
    const { current, previous } = comparatorInfo;
    logDebug('getVersionChangeDetail', { current, previous });
    try {
        switch (true) {
            case isNewerVersion(previous.denebVersion, current.denebVersion) ||
                isNewerVersion(
                    previous.providerVersion,
                    current.providerVersion
                ):
                return 'increase';
            case isNewerVersion(current.denebVersion, previous.denebVersion) ||
                isNewerVersion(
                    current.providerVersion,
                    previous.providerVersion
                ):
                return 'decrease';
            default:
                return 'equal';
        }
    } catch (e) {
        return 'equal';
    }
};

/**
 * For updates, we need to be able to manage property migration between versions as necessary, just in case we're editing
 * a visual that hasn't caught up with the functionality we need in v-latest.
 */
export const handlePropertyMigration = (
    visualSettings: VisualFormattingSettingsModel
) => {
    const {
        vega: {
            output: {
                provider: { value: provider }
            }
        }
    } = visualSettings;
    const {
        migration: { migrationCheckPerformed, updateMigrationDetails }
    } = getDenebState();
    if (!migrationCheckPerformed) {
        const versionComparator = getVersionComparatorInfo(visualSettings);
        const changeType = getVersionChangeDetail(versionComparator);
        updateMigrationDetails({
            changeType,
            ...versionComparator
        });
        switch (true) {
            // No spec yet, or pre 1.1
            case isUnversionedSpec(): {
                migrateUnversionedSpec(<SpecProvider>provider);
                break;
            }
            // general change
            case changeType !== 'equal': {
                migrateWithNoChanges(<SpecProvider>provider);
                break;
            }
            default:
                break;
        }
    }
};

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const {
        settings: {
            vega: {
                output: {
                    jsonSpec: { value: jsonSpec },
                    jsonConfig: { value: jsonConfig }
                }
            }
        }
    } = getDenebVisualState();
    return (
        jsonSpec === PROJECT_DEFAULTS.spec &&
        jsonConfig === PROJECT_DEFAULTS.config
    );
};

/**
 * Allows comparison of versions, so that we can determine if there are any actions that need to be taken in the event
 * of a change in Deneb version or the Vega versions. We'd normally use semver for this, but AppSource version numbering
 * isn't 100% compatible with semver, so we're managing this with a good enough function here.
 * Credit: https://stackoverflow.com/a/52059759
 */
const isNewerVersion = (oldVer: string, newVer: string) => {
    const oldParts = oldVer?.split('.');
    const newParts = newVer?.split('.');
    for (let i = 0; i < newParts.length; i++) {
        const a = ~~newParts[i];
        const b = ~~oldParts[i];
        if (a > b) return true;
        if (a < b) return false;
    }
    // istanbul ignore next
    return false;
};

/**
 * Determine if the current spec is 'unversioned', meaning that it's the same as the default properties.
 */
const isUnversionedSpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * Determine if a visual is 'versioned' based on persisted properties.
 */
const isVersionedSpec = () => {
    const {
        settings: {
            developer: {
                versioning: {
                    version: { value: denebVersion }
                }
            },
            vega: {
                output: {
                    version: { value: providerVersion }
                }
            }
        }
    } = getDenebVisualState();
    return (denebVersion && providerVersion) || false;
};

/**
 * Handles property migration from 1.0 to 1.1
 */
const migrateUnversionedSpec = (provider: SpecProvider) => {
    logDebug('Migrate: initial versions for tracking');
    persistProperties(
        resolveObjectProperties([
            {
                objectName: 'developer',
                properties: [getDenebVersionProperty()]
            },
            {
                objectName: 'vega',
                properties: [
                    {
                        name: 'version',
                        value: PROVIDER_VERSION_CONFIGURATION[provider]
                    }
                ]
            }
        ])
    );
};

/**
 * Perform a migration where no changes are required (basically just updating
 * the visual and provider versions, and re-flagging the "new version"
 * notification).
 */
const migrateWithNoChanges = (provider: SpecProvider) => {
    logDebug('Migrate to current version (no changes)');
    persistProperties(
        resolveObjectProperties([
            {
                objectName: 'developer',
                properties: [getDenebVersionProperty()]
            },
            {
                objectName: 'vega',
                properties: [
                    {
                        name: 'version',
                        value: PROVIDER_VERSION_CONFIGURATION[provider]
                    }
                ]
            }
        ])
    );
};

/**
 * Return the version number for Deneb as a persistable property.
 */
const getDenebVersionProperty = (): PersistenceProperty => ({
    name: 'version',
    value: APPLICATION_INFORMATION_CONFIGURATION.version
});
