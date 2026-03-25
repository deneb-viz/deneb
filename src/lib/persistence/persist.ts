import { logDebug } from '@deneb-viz/utils/logging';
import { getDenebVisualState } from '../../state';
import { getVisualHost } from '../host';
import { type PersistenceObject } from './types';

/**
 * Manage persistence of content to the visual's data view `objects`.
 * Skips the call if the proposed changes match the current dataview values,
 * avoiding a superfluous update cycle from the Power BI host.
 */
export const persistProperties = (
    changes: powerbi.VisualObjectInstancesToPersist
) => {
    if (!hasPropertyChanges(changes)) {
        logDebug('persistProperties: no changes detected, skipping');
        return;
    }
    getVisualHost()?.persistProperties(changes);
};

/**
 * Compare proposed changes against the current dataview objects to determine
 * if any values actually differ. Returns false if all proposed values match
 * the currently persisted values.
 *
 * Only optimises `replace` operations — `merge` and `remove` are always
 * treated as changes to avoid silently skipping them.
 */
const hasPropertyChanges = (
    changes: powerbi.VisualObjectInstancesToPersist
): boolean => {
    if ((changes.merge?.length ?? 0) > 0 || (changes.remove?.length ?? 0) > 0) {
        return true;
    }
    const currentObjects =
        getDenebVisualState().updates.options?.dataViews?.[0]?.metadata
            ?.objects ?? {};
    for (const instance of changes.replace ?? []) {
        const current = currentObjects[instance.objectName] ?? {};
        for (const [key, value] of Object.entries(instance.properties ?? {})) {
            if (!valuesMatch(current[key], value)) return true;
        }
    }
    return false;
};

/**
 * Compare two property values, handling reference types that may have been
 * produced by structuredClone (e.g. Date objects from the dataview).
 */
const valuesMatch = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date)
        return a.getTime() === b.getTime();
    return false;
};

/**
 * For any attempt to persist to the data view, this gives us the empty object to start with.
 */
const getNewObjectInstanceToPersist =
    (): powerbi.VisualObjectInstancesToPersist => ({
        replace: []
    });

/**
 * For the specific object names, get an object suitable for merging into the data view for persistence,
 * including property defaults.
 */
const getNewObjectInstance = (
    objectName: string[]
): powerbi.VisualObjectInstancesToPersist => {
    const datasetViewObjects =
        getDenebVisualState().updates.options?.dataViews?.[0]?.metadata
            ?.objects ?? {};
    const result = getNewObjectInstanceToPersist();
    for (const value of objectName) {
        result.replace?.push({
            objectName: value,
            selector: null as unknown as powerbi.data.Selector,
            properties: structuredClone(datasetViewObjects[value]) || {}
        });
    }
    return result;
};

/**
 * Handles resolution of object properties from the data view, either for persistence.
 * If a value is not supplied in the array of _properties_, the default value will be retrieved from the `VisualSettings` for the supplied name.
 */
export const resolveObjectProperties = (objects: PersistenceObject[]) => {
    const names = objects.map((o) => o.objectName);
    const changes = getNewObjectInstance(names);
    objects.forEach((value, index) => {
        value.properties.forEach((p) => {
            if (
                changes.replace?.[index]?.properties !== undefined &&
                p.value !== undefined
            ) {
                changes.replace[index].properties[p.name] = p.value;
            }
        });
    });
    return changes;
};
