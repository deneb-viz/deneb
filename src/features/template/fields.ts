import * as schema_v1 from '@deneb-viz/template-usermeta/schema.deneb-template-usermeta.json';

/**
 * Used for validation of text field lengths vs. generated schema.
 */
export const TEMPLATE_DATASET_FIELD_PROPS =
    schema_v1.definitions.UsermetaDatasetField.properties;

export const TEMPLATE_INFORMATION_PROPS =
    schema_v1.definitions.UsermetaInformation.properties;
