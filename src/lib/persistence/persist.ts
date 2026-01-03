import { getDenebVisualState } from '../../state';
import { getVisualHost } from '../host';
import { type PersistenceObject } from './types';

/**
 * Manage persistence of content to the visual's data view `objects`.
 */
export const persistProperties = (
    changes: powerbi.VisualObjectInstancesToPersist
) => {
    getVisualHost()?.persistProperties(changes);
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
