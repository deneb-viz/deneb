/**
 * Signal management for Deneb visualizations.
 * Provides container dimension signals and legacy signal migration.
 */

export {
    getSignalDenebContainer,
    getDenebContainerSignalFromDimensions,
    getContainerSignalReferences,
    SIGNAL_DENEB_CONTAINER,
    SIGNAL_PBI_CONTAINER_LEGACY,
    type ContainerDimensions,
    type DenebContainerSignal,
    type DenebContainerSignalOptions
} from './deneb-container';

export {
    replaceLegacySignalReferences,
    logLegacySignalWarning,
    hasLegacySignalReferences,
    type SignalMigrationResult
} from './migration';
