/**
 * Represents a single property change to persist to Power BI.
 */
export type PropertyChange = {
    objectName: string;
    propertyName: string;
    value: unknown;
};
