import powerbi from 'powerbi-visuals-api';
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;

import copy from 'fast-copy';

import Debugger, { standardLog } from '../Debugger';
import VisualSettings from '../properties/VisualSettings';
import store from '../store';
import { IPropertyService } from '../types';

const owner = 'PropertyService';

export class PropertyService implements IPropertyService {
    persistProperties: (changes: VisualObjectInstancesToPersist) => void;
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    resolveObjectProperties(
        objectName: string,
        properties: {
            name: string;
            value?: DataViewPropertyValue;
        }[]
    ) {
        Debugger.log(`Resolving content for ${objectName}...`);
        Debugger.log(`Supplied properties: ${JSON.stringify(properties)}`);
        try {
            let changes = this.getNewObjectInstance(objectName);
            Debugger.log('Changes', changes);
            properties.forEach((p) => {
                const defaultValue = <string>(
                    VisualSettings.getDefault()[objectName][p.name]
                );
                changes.replace[0].properties[p.name] = p.value ?? defaultValue;
            });
            Debugger.log('Resolved object properties', changes);
            return changes;
        } catch (e) {
            Debugger.log('Error', e);
        }
    }

    @standardLog()
    updateObjectProperties(changes: VisualObjectInstancesToPersist) {
        Debugger.log('Persisting changes to dataView...', changes);
        this.persistProperties(changes);
    }

    /**
     * Gets an empty metadata object so that we can populate it with a value from the text box, or reset it.
     */
    @standardLog()
    private getNewObjectInstance(
        objectName: string
    ): VisualObjectInstancesToPersist {
        Debugger.log('Getting new object instance for persistence...');
        const { dataViewObjects } = store.getState().visual;
        return {
            replace: [
                {
                    objectName: objectName,
                    selector: null,
                    properties: copy(dataViewObjects[objectName]) || {}
                }
            ]
        };
    }
}
