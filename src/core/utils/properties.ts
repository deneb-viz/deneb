export {
    getProviderVersionProperty,
    resolveObjectProperties,
    updateObjectProperties,
    IPersistenceProperty
};

import powerbi from 'powerbi-visuals-api';
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;

import cloneDeep from 'lodash/cloneDeep';

import VisualSettings from '../../properties/VisualSettings';

import { getState } from '../../store';
import { hostServices } from '../services';
import { TSpecProvider } from '../vega';
import { providerVersions } from './config';

/**
 * Handles resolution of object properties from the data view, either for persistence.
 * If a value is not supplied in the array of _properties_, the default value will be retrieved from the `VisualSettings` for the supplied name.
 */
const resolveObjectProperties = (
    objectName: string,
    properties: IPersistenceProperty[]
) => {
    try {
        let changes = getNewObjectInstance(objectName);
        properties.forEach((p) => {
            const defaultValue = <string>(
                VisualSettings.getDefault()[objectName][p.name]
            );
            changes.replace[0].properties[p.name] = p.value ?? defaultValue;
        });
        return changes;
    } catch (e) {}
};

/**
 * Manage persistence of content to the visual's data view `objects`.
 */
const updateObjectProperties = (changes: VisualObjectInstancesToPersist) =>
    persistProperties()(changes);

/**
 * Property name and optional value for persistence operations.
 */
interface IPersistenceProperty {
    name: string;
    value?: DataViewPropertyValue;
}

/**
 * Gets an empty metadata object so that we can populate it with a value from the text box, or reset it.
 */
const getNewObjectInstance = (
    objectName: string
): VisualObjectInstancesToPersist => {
    const { datasetViewObjects } = getState();
    return {
        replace: [
            {
                objectName: objectName,
                selector: null,
                properties: cloneDeep(datasetViewObjects[objectName]) || {}
            }
        ]
    };
};

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
