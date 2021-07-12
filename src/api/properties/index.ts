export {
    resolveObjectProperties,
    updateObjectProperties,
    IPersistenceProperty
};

import powerbi from 'powerbi-visuals-api';
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;

import cloneDeep from 'lodash/cloneDeep';

import VisualSettings from '../../properties/VisualSettings';

import { getState } from '../store';

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

const updateObjectProperties = (changes: VisualObjectInstancesToPersist) =>
    persistProperties()(changes);

interface IPersistenceProperty {
    name: string;
    value?: DataViewPropertyValue;
}

const getNewObjectInstance = (
    objectName: string
): VisualObjectInstancesToPersist => {
    const { dataViewObjects } = getState().visual;
    return {
        replace: [
            {
                objectName: objectName,
                selector: null,
                properties: cloneDeep(dataViewObjects[objectName]) || {}
            }
        ]
    };
};

const persistProperties = () => getState().visual.persistProperties;
