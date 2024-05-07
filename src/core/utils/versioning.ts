import { SpecProvider } from '@deneb-viz/core-dependencies';
import { APPLICATION_INFORMATION, PROVIDER_VERSIONS } from '../../../config';
import { logDebug } from '../../features/logging';
import { isUnversionedSpec } from '../../features/specification';
import { getState } from '../../store';
import {
    getDenebVersionProperty,
    resolveObjectProperties,
    updateObjectProperties
} from './properties';
import { VisualFormattingSettingsModel } from '@deneb-viz/integration-powerbi';

/**
 * Structured version information that we can use for comparison or inspection purposes.
 */
export interface IVersionInformation {
    denebVersion: string;
    provider: string;
    providerVersion: string;
}

/**
 * Holds both current and previous version information.
 */
export interface IVersionComparator {
    current: IVersionInformation;
    previous: IVersionInformation;
}

/**
 * Denotes type of version change, that we can use for appropriate handling.
 */
export type TVersionChange = 'decrease' | 'equal' | 'increase';

/**
 * Current visual and provider information
 */
const getCurrentVersionInfo = (
    visualSettings: VisualFormattingSettingsModel
): IVersionInformation => {
    const {
        vega: {
            output: {
                provider: { value: provider }
            }
        }
    } = visualSettings;
    return {
        denebVersion: APPLICATION_INFORMATION.version,
        provider: provider as SpecProvider,
        providerVersion: PROVIDER_VERSIONS[provider]
    };
};

/**
 * Visual and provider information, according to visual properties (when changes were last persisted).
 */
const getLastVersionInfo = (
    visualSettings: VisualFormattingSettingsModel
): IVersionInformation => {
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
): IVersionComparator => ({
    current: getCurrentVersionInfo(visualSettings),
    previous: getLastVersionInfo(visualSettings)
});

/**
 * Determine if a change has occurred since last persist, and the direction.
 */
const getVersionChangeDetail = (
    comparatorInfo: IVersionComparator
): TVersionChange => {
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
    } = getState();
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
 * Handles property migration from 1.0 to 1.1
 */
const migrateUnversionedSpec = (provider: SpecProvider) => {
    logDebug('Migrate: initial versions for tracking');
    updateObjectProperties(
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
                        value: PROVIDER_VERSIONS[provider]
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
    updateObjectProperties(
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
                        value: PROVIDER_VERSIONS[provider]
                    }
                ]
            }
        ])
    );
};
