import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Determine if a spec is a legacy (pre-2.0) spec that predates the support
 * field configuration feature. Legacy specs get all support fields enabled
 * by default to preserve backward compatibility.
 *
 * A spec is legacy when:
 * - It has non-default content (user has created a project)
 * - The persisted denebMetaVersion is < 2 (pre-2.0 or never set)
 *
 * A brand new spec (default template) is NOT legacy — it gets new defaults.
 */
export const isLegacySpec = (
    jsonSpec: string,
    denebMetaVersion: number
): boolean => {
    const hasProject = jsonSpec !== PROJECT_DEFAULTS.spec;
    return hasProject && denebMetaVersion < 2;
};
