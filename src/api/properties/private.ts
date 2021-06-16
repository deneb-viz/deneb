import powerbi from 'powerbi-visuals-api';
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;

import _ from 'lodash';

import { getState } from '../store/public';

export const getNewObjectInstance = (
    objectName: string
): VisualObjectInstancesToPersist => {
    const { dataViewObjects } = getState().visual;
    return {
        replace: [
            {
                objectName: objectName,
                selector: null,
                properties: _.cloneDeep(dataViewObjects[objectName]) || {}
            }
        ]
    };
};

export const persistProperties = () => getState().visual.persistProperties;
