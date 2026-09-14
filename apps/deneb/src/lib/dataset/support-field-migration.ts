import { isSupportFieldMigrationPending } from '../persistence/state-management-migration';

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
 *
 * This is a thin delegate: the WHETHER decision (version comparison and
 * the cross-GUID/fresh-visual applicability check) is owned by the ordered
 * migration registry in
 * `src/lib/persistence/state-management-migration.ts`. The execution point
 * (the stamping block in `./processing.ts`) supplies its own trigger —
 * this is a class `'first-dataview'` migration that needs DataView columns
 * unavailable at load time.
 */
export const isLegacySpec = (
    jsonSpec: string,
    denebMetaVersion: number
): boolean => isSupportFieldMigrationPending(jsonSpec, denebMetaVersion);
