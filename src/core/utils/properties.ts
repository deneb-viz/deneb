export {
    getDenebVersionProperty,
    getProviderVersionProperty,
    resolveObjectProperties,
    updateObjectProperties,
    IPersistenceProperty
};

import powerbi from 'powerbi-visuals-api';
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;

import cloneDeep from 'lodash/cloneDeep';
import reduce from 'lodash/reduce';

import VisualSettings from '../../properties/VisualSettings';

import { getState } from '../../store';
import { hostServices } from '../services';
import { TSpecProvider } from '../vega';
import { getVisualMetadata, providerVersions } from './config';

/**
 * Handles resolution of object properties from the data view, either for persistence.
 * If a value is not supplied in the array of _properties_, the default value will be retrieved from the `VisualSettings` for the supplied name.
 */
const resolveObjectProperties = (objects: IPersistenceObject[]) => {
    const names = objects.map((o) => o.objectName);
    let changes = getNewObjectInstance(names);
    return reduce(
        objects,
        (result, value, index) => {
            value.properties.forEach((p) => {
                const defaultValue = <string>(
                    VisualSettings.getDefault()[value.objectName][p.name]
                );
                result.replace[index].properties[p.name] =
                    p.value ?? defaultValue;
            });
            return result;
        },
        changes
    );
};

/**
 * Manage persistence of content to the visual's data view `objects`.
 */
const updateObjectProperties = (changes: VisualObjectInstancesToPersist) =>
    persistProperties()(changes);

/**
 * An object for persisting to the data view.
 */
interface IPersistenceObject {
    objectName: string;
    properties: IPersistenceProperty[];
}

/**
 * Property name and optional value for persistence operations.
 */
interface IPersistenceProperty {
    name: string;
    value?: DataViewPropertyValue;
}

/**
 * For the specific object names, get an object suitable for merging into the data view for persistence,
 * including property defaults.
 */
const getNewObjectInstance = (
    objectName: string[]
): VisualObjectInstancesToPersist => {
    const { datasetViewObjects } = getState();
    return reduce(
        objectName,
        (result, value) => {
            result.replace.push({
                objectName: value,
                selector: null,
                properties: cloneDeep(datasetViewObjects[value]) || {}
            });
            return result;
        },
        getNewObjectInstanceToPersist()
    );
};

/**
 * For any attempt to persist to the data view, this gives us the empty object to start with.
 */
const getNewObjectInstanceToPersist = (): VisualObjectInstancesToPersist => ({
    replace: []
});

/**
 * Convenience function that returns the visual host's `persistProperties` instance from Deneb's store.
 */
const persistProperties = () => hostServices.persistProperties;

/**
 * Return the version number for the supplied provider as a persistable property.
 */
const getProviderVersionProperty = (
    provider: TSpecProvider
): IPersistenceProperty => ({
    name: 'version',
    value: providerVersions[provider]
});

/**
 * Return the persistence objects and properties for updating the Deneb version.
 */
const getDenebVersionProperty = (): IPersistenceObject => ({
    objectName: 'developer',
    properties: [{ name: 'version', value: getVisualMetadata().version }]
});
