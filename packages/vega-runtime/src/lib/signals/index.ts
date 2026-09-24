/**
 * Signal management for Deneb visualizations.
 * Provides container dimension signals and legacy signal migration.
 */

export {
    getSignalDenebContainer,
    getDenebContainerSignalFromDimensions,
    getContainerSignalReferences,
    updateContainerInitDimensions,
    NO_PATCHED_DIMENSIONS,
    SIGNAL_DENEB_CONTAINER,
    SIGNAL_PBI_CONTAINER_LEGACY,
    type ContainerDimensions,
    type DenebContainerSignal,
    type DenebContainerSignalOptions,
    type PatchedDimensions
} from './deneb-container';

export {
    replaceLegacySignalReferences,
    logLegacySignalWarning,
    hasLegacySignalReferences,
    type SignalMigrationResult
} from './migration';
