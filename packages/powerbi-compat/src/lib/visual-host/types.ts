import powerbi from 'powerbi-visuals-api';

/**
 * An object for persisting to the data view.
 */
export type PersistenceObject = {
    objectName: string;
    properties: PersistenceProperty[];
};

/**
 * Property name and optional value for persistence operations.
 */
export type PersistenceProperty = {
    name: string;
    value?: powerbi.DataViewPropertyValue;
};
