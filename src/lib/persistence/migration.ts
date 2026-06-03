import {
    getVegaVersion,
    type SpecProvider
} from '@deneb-viz/vega-runtime/embed';
import { VisualFormattingSettingsModel } from './model';
import {
    type VersionChangeDirection,
    type VersionComparator,
    type VersionInformation
} from '@deneb-viz/utils/versioning';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { logDebug } from '@deneb-viz/utils/logging';
import { type PersistenceProperty } from './types';
import { persistProperties, resolveObjectProperties } from './persist';
import { getDenebState } from '@deneb-viz/app-core';
import { getDenebVisualState } from '../../state';
import { APPLICATION_VERSION } from '../application';

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
        denebVersion: APPLICATION_VERSION,
        provider: provider as SpecProvider,
        providerVersion: getVegaVersion(provider as SpecProvider)
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
 *
 * Behaviour is split by mode:
 *
 *  - **Edit mode** (the historical default): on the first qualifying update
 *    of the session, persist version stamps and any runtime-affecting
 *    remaps via `persistProperties`, flip the `migrationCheckPerformed`
 *    flag so the work doesn't re-run, and signal the version-change modal
 *    via `updateMigrationDetails`.
 *  - **Read mode** (`isReadMode === true`): never persist; never flip the
 *    flag; never open the modal. Instead apply the runtime-affecting parts
 *    of the migration directly to the in-memory settings model so the
 *    read render still honours migrated values (e.g. the pre-1.10
 *    `enableContextMenu` split). The `migrationCheckPerformed` flag is
 *    intentionally NOT consulted in read mode — the flag lives in a
 *    separate Zustand slice that is not reset between updates, so if a
 *    prior edit-mode session flipped it the read-mode path would
 *    otherwise become a no-op forever afterwards. Running every
 *    read-mode update is cheap (a couple of property reads + a possible
 *    assignment) and correct.
 */
export const handlePropertyMigration = (
    visualSettings: VisualFormattingSettingsModel,
    isReadMode: boolean
) => {
    const {
        vega: {
            output: {
                provider: { value: provider }
            }
        }
    } = visualSettings;
    if (isReadMode) {
        applyRuntimeAffectingMigrationsInMemory(
            visualSettings,
            <SpecProvider>provider
        );
        return;
    }
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
                migrateWithNoChanges(<SpecProvider>provider, visualSettings);
                break;
            }
            default:
                break;
        }
    }
};

/**
 * Apply the migration's runtime-affecting mutations directly to the
 * in-memory `VisualFormattingSettingsModel` reference, mirroring the
 * branching of the edit-mode path so a read-mode render honours the
 * same values the edit-mode persist round-trip would have produced.
 *
 * Mutating the live settings object is intentional: consumers (e.g.
 * `src/lib/interactivity/context-menu.ts`) read these values lazily via
 * `getDenebVisualState().settings.<...>.value`, so the mutation is
 * visible to whichever code reads next in the same update. The
 * mutation does not survive into the next update — the visual store's
 * `setVisualUpdateOptions` rebuilds the settings model on every update
 * from the host-shipped data view — which is exactly why read-mode
 * migration must run every update.
 */
const applyRuntimeAffectingMigrationsInMemory = (
    visualSettings: VisualFormattingSettingsModel,
    provider: SpecProvider
): void => {
    if (isUnversionedSpec()) {
        // Mirrors `migrateUnversionedSpec`: stamp current versions so
        // downstream consumers and the slice-sync mapping see the
        // correct values. No context-menu remap on this branch — the
        // edit-mode equivalent does not include one here either.
        applyVersionStampsInMemory(visualSettings, provider);
        return;
    }
    const versionComparator = getVersionComparatorInfo(visualSettings);
    const changeType = getVersionChangeDetail(versionComparator);
    if (changeType !== 'equal') {
        // Mirrors `migrateWithNoChanges`: capture the previous version
        // BEFORE stamping, then apply the optional context-menu remap
        // against the captured value, then stamp the new versions.
        const previousVersion = getLastVersionInfo(visualSettings).denebVersion;
        applyContextMenuRemapInMemory(visualSettings, previousVersion);
        applyVersionStampsInMemory(visualSettings, provider);
    }
};

/**
 * Stamp the current Deneb and provider versions onto the in-memory
 * settings model. Idempotent — repeated application on the same model
 * (e.g. across consecutive read-mode updates) is a no-op once the
 * values match.
 */
const applyVersionStampsInMemory = (
    visualSettings: VisualFormattingSettingsModel,
    provider: SpecProvider
): void => {
    visualSettings.developer.versioning.version.value = APPLICATION_VERSION;
    visualSettings.vega.output.version.value = getVegaVersion(provider);
};

/**
 * Single source of truth for whether the pre-1.10 context-menu split
 * remap applies to the current settings model. Shared between the
 * persist-payload builder (`getContextMenuMigrationProperties`) and the
 * in-memory mutation (`applyContextMenuRemapInMemory`) so the two
 * cannot drift as new properties are added to the legacy remap.
 *
 * Legacy state qualifies when the visual was last persisted before the
 * split version AND the persisted interactivity matches the legacy
 * `enableContextMenu: false` / `enableContextMenuSelector: true`
 * (default) pair.
 */
const isLegacyContextMenuRemapApplicable = (
    visualSettings: VisualFormattingSettingsModel,
    previousVersion: string
): boolean => {
    if (!isNewerVersion(previousVersion, CONTEXT_MENU_SPLIT_VERSION))
        return false;
    const { enableContextMenu, enableContextMenuSelector } =
        visualSettings.vega.interactivity;
    return !enableContextMenu.value && enableContextMenuSelector.value;
};

/**
 * Apply the pre-1.10 context-menu split to the in-memory settings
 * model when the legacy state qualifies. Mirrors the persist payload
 * built by `getContextMenuMigrationProperties` exactly — both delegate
 * to `isLegacyContextMenuRemapApplicable` for the decision.
 */
const applyContextMenuRemapInMemory = (
    visualSettings: VisualFormattingSettingsModel,
    previousVersion: string
): void => {
    if (!isLegacyContextMenuRemapApplicable(visualSettings, previousVersion))
        return;
    const { enableContextMenu, enableContextMenuSelector } =
        visualSettings.vega.interactivity;
    enableContextMenu.value = true;
    enableContextMenuSelector.value = false;
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
                        value: getVegaVersion(provider)
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
const migrateWithNoChanges = (
    provider: SpecProvider,
    visualSettings: VisualFormattingSettingsModel
) => {
    logDebug('Migrate to current version');
    const previousVersion = getLastVersionInfo(visualSettings).denebVersion;
    const contextMenuProperties = getContextMenuMigrationProperties(
        visualSettings,
        previousVersion
    );
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
                        value: getVegaVersion(provider)
                    },
                    ...contextMenuProperties
                ]
            }
        ])
    );
};

/**
 * The version that introduced the context menu property split. Only visuals
 * upgrading from before this version need the legacy migration.
 */
const CONTEXT_MENU_SPLIT_VERSION = '1.10.0';

/**
 * Pre-migration visuals had enableContextMenu: false to disable data point
 * resolution. The new model splits this into two properties. Detect the legacy
 * state and remap to enableContextMenu: true + enableContextMenuSelector: false.
 *
 * Only runs when upgrading from a version older than CONTEXT_MENU_SPLIT_VERSION
 * to avoid overwriting intentional post-upgrade settings on future version bumps.
 */
const getContextMenuMigrationProperties = (
    visualSettings: VisualFormattingSettingsModel,
    previousVersion: string
): PersistenceProperty[] => {
    if (!isLegacyContextMenuRemapApplicable(visualSettings, previousVersion)) {
        return [];
    }
    return [
        { name: 'enableContextMenu', value: true },
        { name: 'enableContextMenuSelector', value: false }
    ];
};

/**
 * Return the version number for Deneb as a persistable property.
 */
const getDenebVersionProperty = (): PersistenceProperty => ({
    name: 'version',
    value: APPLICATION_VERSION
});
