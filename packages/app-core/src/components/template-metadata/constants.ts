import { definitions } from '@deneb-viz/template-usermeta/schema.deneb-template-usermeta.json';

/**
 * Used for validation of text field lengths vs. generated schema.
 */
export const TEMPLATE_DATASET_FIELD_PROPS =
    definitions.UsermetaDatasetField.properties;

export const TEMPLATE_INFORMATION_PROPS =
    definitions.UsermetaInformation.properties;

export const TEMPLATE_DATA_FIELD_COLUMN_MIN_WIDTH = 150;
export const TEMPLATE_DATA_FIELD_COLUMN_MAX_WIDTH = 250;
