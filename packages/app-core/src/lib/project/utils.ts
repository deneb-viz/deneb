import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { DenebProject } from './types';
import { logDebug } from '@deneb-viz/utils/logging';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { type SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';

export const isProjectInitialized = (project: DenebProject): boolean => {
    const isInitialized =
        project.config !== PROJECT_DEFAULTS.config ||
        project.spec !== PROJECT_DEFAULTS.spec;
    logDebug('isProjectInitialized', { project, isInitialized });
    return isInitialized;
};

/**
 * Extract per-field support field configuration from dataset entries and remap to actual
 * encoded field names supplied by the user during import. Each dataset entry may carry an
 * inline `supportFieldConfiguration` (the new template format). The `suppliedObjectName`
 * becomes the key in the returned record. Returns an empty object when no entries carry config.
 *
 * Relocated from `@deneb-viz/json-processing` (2026-07-15, remediation WP8/#16): this helper
 * has no json-processing-internal dependencies and its only consumer is app-core's create-button
 * (project-create feature), so it lives here, adjacent to that consumer, instead of on
 * json-processing's public surface.
 */
export const remapSupportFieldConfigurationForImport = (
    dataset: UsermetaDatasetField[]
): SupportFieldConfiguration => {
    const result: SupportFieldConfiguration = {};
    for (const field of dataset) {
        if (field.supportFieldConfiguration && field.suppliedObjectName) {
            result[field.suppliedObjectName] = field.supportFieldConfiguration;
        }
    }
    return result;
};
