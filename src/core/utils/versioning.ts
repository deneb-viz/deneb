import { getState } from '../../store';
import { getVegaSettings, TSpecProvider } from '../vega';
import { getConfig, getVisualMetadata, providerVersions } from './config';
import { resolveObjectProperties, updateObjectProperties } from './properties';
import { isLegacySpec } from './specification';

/**
 * Structured version information that we can use for comparison or inspection purposes.
 */
interface IVersionInformation {
    denebVersion: string;
    provider: string;
    providerVersion: string;
}

/**
 * Holds both current and previous version information.
 */
interface IVersionComparator {
    current: IVersionInformation;
    last: IVersionInformation;
}

/**
 * Denotes type of version change, that we can use for appropriate handling.
 */
type TVersionChange = 'decrease' | 'equal' | 'increase';

/**
 * Current visual and provider information
 */
const getCurrentVersionInfo = (): IVersionInformation => {
    const { provider } = getVegaSettings();
    return {
        denebVersion: getVisualMetadata().version,
        provider,
        providerVersion: providerVersions[provider]
    };
};

/**
 * Visual and provider information, according to visual properties (when changes were last persisted).
 */
export const getLastVersionInfo = (): IVersionInformation => {
    const { developer } = getState().visualSettings;
    const denebVersion = developer.version;
    const { provider, version: providerVersion } = getVegaSettings();
    return {
        denebVersion,
        provider,
        providerVersion
    };
};

/**
 * Get previous and current version information as a single object.
 */
export const getVersionComparatorInfo = (): IVersionComparator => ({
    current: getCurrentVersionInfo(),
    last: getLastVersionInfo()
});

/**
 * Determine if a change has occurred since last persist, and the direction.
 */
export const getVersionChangeDetail = (): TVersionChange => {
    const { current, last } = getVersionComparatorInfo();
    switch (true) {
        case isNewerVersion(last.denebVersion, current.denebVersion) ||
            isNewerVersion(last.providerVersion, current.providerVersion):
            return 'increase';
        case isNewerVersion(current.denebVersion, last.denebVersion) ||
            isNewerVersion(current.providerVersion, last.providerVersion):
            return 'decrease';
        default:
            return 'equal';
    }
};

/**
 * For updates, we need to be able to manage property migration between versions as necessary, just in case we're editing
 * a visual that hasn't caught up with the functionality we need in v-latest.
 */
export const handlePropertyMigration = () => {
    switch (true) {
        // 1.0 > greater
        case isLegacySpec(): {
            const provider = <TSpecProvider>getVegaSettings().provider;
            migrateV1_0toV1_1(provider);
            break;
        }
        // general change
        case getVersionChangeDetail() !== 'equal': {
            migrateWithNoChanges();
            break;
        }
        default:
            break;
    }
};

/**
 * Allows comparison of versions, so that we can determine if there are any actions that need to be taken in the event
 * of a change in Deneb version or the Vega versions. We'd nomrally use semver for this, but AppSource version numbering
 * isn't 100% compatible with semver, so we're managing this with a good enough function here.
 * Credit: https://stackoverflow.com/a/52059759
 */
export const isNewerVersion = (oldVer: string, newVer: string) => {
    const oldParts = oldVer.split('.');
    const newParts = newVer.split('.');
    for (var i = 0; i < newParts.length; i++) {
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
const migrateV1_0toV1_1 = (provider: TSpecProvider) => {
    const { providerResources } = getConfig();
    updateObjectProperties(
        resolveObjectProperties([
            {
                objectName: 'developer',
                properties: [
                    {
                        name: 'version',
                        value: providerResources.deneb.legacyVersion
                    },
                    { name: 'showVersionNotification', value: true }
                ]
            },
            {
                objectName: 'vega',
                properties: [
                    {
                        name: 'version',
                        value: providerResources[provider].legacyVersion
                    }
                ]
            }
        ])
    );
};

/**
 * Perform a migration where no changes are required (basically just re-flagging the "new version" notification)
 */
const migrateWithNoChanges = () => {
    updateObjectProperties(
        resolveObjectProperties([
            {
                objectName: 'developer',
                properties: [{ name: 'showVersionNotification', value: true }]
            }
        ])
    );
};
