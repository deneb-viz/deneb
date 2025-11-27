import powerbi from 'powerbi-visuals-api';

import { type VisualFormattingSettingsModel } from '../properties';

export type VisualUpdateComparisonOptions = {
    currentProcessingFlag: boolean;
    previousOptions: powerbi.extensibility.visual.VisualUpdateOptions;
    currentOptions: powerbi.extensibility.visual.VisualUpdateOptions;
    previousSettings: VisualFormattingSettingsModel;
    currentSettings: VisualFormattingSettingsModel;
};

export type CrossHighlightPropCheckOptions = {
    enableHighlight: boolean;
};

export type CrossFilterPropCheckOptions = {
    enableSelection: boolean;
};

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
