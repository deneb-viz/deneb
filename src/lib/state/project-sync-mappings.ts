import type { VisualFormattingSettingsModel } from '../../lib/persistence';
import {
    getDenebState,
    type ProjectSliceProperties
} from '@deneb-viz/app-core';
import type { SliceSyncMapping } from './sync-types';
import type { SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import type { UsermetaInteractivity } from '@deneb-viz/template-usermeta';
import { parseDenebMetaVersion } from '../persistence/state-management-migration';
import { logError } from '@deneb-viz/utils/logging';

/**
 * Keys that can be synced from ProjectSliceProperties
 * (excludes internal flags and methods)
 */
type ProjectSyncKey = keyof Omit<
    ProjectSliceProperties,
    | '__hasHydrated__'
    | '__isInitialized__'
    | 'syncProjectData'
    | 'setLogLevel'
    | 'setProvider'
    | 'setRenderMode'
    | 'setScaleToZoom'
    | 'setConsolidateFieldParameters'
>;

/**
 * Tracks corrupt persisted values that have already been surfaced, so the
 * warning fires once per distinct corrupt value rather than on every sync
 * subscriber pass (getVisualValue runs on both sync directions, every
 * update).
 */
const surfacedCorruptValues = new Set<string>();

/**
 * Surface a corrupt persisted `stateManagement` value as a DURABLE,
 * user-visible warning (L16) — the same compilation-slice channel used for
 * dataset mapping failures — instead of a silent degradation that is
 * invisible at certified LOG_LEVEL=0. The message is generic and
 * localized; the raw persisted value is only emitted to the debug log,
 * never echoed into the UI.
 */
const surfaceCorruptStateManagementValue = (
    propertyName: string,
    rawValue: string
): void => {
    const dedupeKey = `${propertyName}:${rawValue}`;
    if (surfacedCorruptValues.has(dedupeKey)) {
        return;
    }
    surfacedCorruptValues.add(dedupeKey);
    logError(
        `[StoreSynchronization:project] Corrupt persisted stateManagement value for '${propertyName}'`,
        { rawValue }
    );
    const { compilation, i18n } = getDenebState();
    compilation.logDurableWarn(
        i18n.translate('Text_Warn_Persisted_Property_Unreadable', [
            propertyName
        ])
    );
};

/**
 * Helper to extract interactivity object from visual settings.
 */
const getInteractivityFromSettings = (
    s: VisualFormattingSettingsModel
): UsermetaInteractivity => ({
    tooltip: s.vega.interactivity.enableTooltips.value,
    contextMenu: s.vega.interactivity.enableContextMenu.value,
    contextMenuSelector: s.vega.interactivity.enableContextMenuSelector.value,
    selection: s.vega.interactivity.enableSelection.value,
    selectionMode: s.vega.interactivity.selectionMode.value as SelectionMode,
    highlight: s.vega.interactivity.enableHighlight.value,
    dataPointLimit: s.vega.interactivity.selectionMaxDataPoints.value
});

/**
 * Mappings for all project properties that need to be synchronized
 * between the app-core store and Power BI visual settings.
 *
 * Add new mappings here as project properties are added.
 */
export const PROJECT_SYNC_MAPPINGS: SliceSyncMapping<ProjectSyncKey>[] = [
    {
        sliceKey: 'spec',
        getVisualValue: (s) => s.vega.output.jsonSpec.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonSpec'
        }
    },
    {
        sliceKey: 'config',
        getVisualValue: (s) => s.vega.output.jsonConfig.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'jsonConfig'
        }
    },
    {
        sliceKey: 'logLevel',
        getVisualValue: (s) => s.vega.logging.logLevel.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'logLevel'
        }
    },
    {
        sliceKey: 'provider',
        getVisualValue: (s) => s.vega.output.provider.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'provider'
        },
        onPersist: (provider, settings) => {
            // Reset selectionMode to 'simple' if switching to vegaLite
            // (vegaLite doesn't support 'advanced' selection mode)
            if (
                provider === 'vegaLite' &&
                settings.vega.interactivity.selectionMode.value !== 'simple'
            ) {
                return [
                    {
                        objectName: 'vega',
                        propertyName: 'selectionMode',
                        value: 'simple'
                    }
                ];
            }
            return [];
        }
    },
    {
        sliceKey: 'providerVersion',
        getVisualValue: (s) => s.vega.output.version.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'version'
        }
    },
    {
        sliceKey: 'renderMode',
        getVisualValue: (s) => s.vega.output.renderMode.value,
        persistence: {
            objectName: 'vega',
            propertyName: 'renderMode'
        }
    },
    {
        sliceKey: 'interactivity',
        getVisualValue: getInteractivityFromSettings
        // Note: interactivity persistence is handled separately per-property
        // since it's an object composed of multiple visual settings properties.
        // Changes to interactivity come from the Power BI side only.
    },
    {
        sliceKey: 'supportFieldConfiguration',
        getVisualValue: (s) => {
            const raw =
                s.stateManagement.projectMetadata?.supportFieldConfiguration
                    ?.value;
            if (!raw) return {};
            try {
                return JSON.parse(raw);
            } catch {
                // L16: corrupt persisted JSON degrades predictably to {}
                // (per-field defaults apply), but is surfaced as a durable
                // warning rather than silently swallowed.
                surfaceCorruptStateManagementValue(
                    'supportFieldConfiguration',
                    raw
                );
                return {};
            }
        },
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'supportFieldConfiguration'
        },
        serializeForPersistence: (value) => JSON.stringify(value)
    },
    {
        sliceKey: 'denebMetaVersion',
        getVisualValue: (s) => {
            const raw =
                s.stateManagement.projectMetadata?.denebMetaVersion?.value;
            // Parsing is owned by the migration registry so a corrupt
            // stamp is classified consistently store-side and registry-
            // side. A corrupt stamp must NOT coerce to 0 (= unversioned
            // legacy — the old `parseInt(raw, 10) || 0` behavior), which
            // would re-run the legacy migration against possibly-migrated
            // state. NaN mirrors the registry's fail-safe 'indeterminate'
            // posture: no migration entry is pending against it
            // (NaN < toVersion is false) and fast-equals treats NaN as
            // equal to NaN, so the sync layer never persists it back.
            const { version, corrupt } = parseDenebMetaVersion(raw);
            if (corrupt) {
                surfaceCorruptStateManagementValue(
                    'denebMetaVersion',
                    corrupt.rawValue
                );
                return Number.NaN;
            }
            return version;
        },
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'denebMetaVersion'
        },
        serializeForPersistence: (value) => String(value)
    },
    {
        sliceKey: 'scaleToZoom',
        getVisualValue: (s) =>
            s.stateManagement.projectMetadata?.scaleToZoom?.value ?? false,
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'scaleToZoom'
        }
    },
    {
        sliceKey: 'consolidateFieldParameters',
        getVisualValue: (s) =>
            s.stateManagement.projectMetadata?.consolidateFieldParameters
                ?.value ?? true,
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'consolidateFieldParameters'
        }
    }
];
