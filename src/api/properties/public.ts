import powerbi from 'powerbi-visuals-api';
import DataViewPropertyValue = powerbi.DataViewPropertyValue;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;

import VisualSettings from '../../properties/VisualSettings';

import { getNewObjectInstance, persistProperties } from './private';

export const resolveObjectProperties = (
    objectName: string,
    properties: {
        name: string;
        value?: DataViewPropertyValue;
    }[]
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

export const updateObjectProperties = (
    changes: VisualObjectInstancesToPersist
) => persistProperties()(changes);
