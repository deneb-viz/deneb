import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Determine if a spec is a legacy (pre-2.0) spec that predates the support
 * field configuration feature. Legacy specs get all support fields enabled
 * by default to preserve backward compatibility.
 *
 * A spec is legacy when:
 * - It has non-default content (user has created a project)
 * - But no support field configuration has been persisted
 *
 * A brand new spec (default template) is NOT legacy — it gets new defaults.
 */
export const isLegacySpec = (
    jsonSpec: string,
    supportFieldConfiguration: SupportFieldConfiguration
): boolean => {
    const hasProject = jsonSpec !== PROJECT_DEFAULTS.spec;
    const hasConfig = Object.keys(supportFieldConfiguration).length > 0;
    return hasProject && !hasConfig;
};
