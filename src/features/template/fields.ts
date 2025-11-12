import * as schema_v1 from '@deneb-viz/template-usermeta/schema.deneb-template-usermeta.json';
import { getI18nValue } from '../i18n';
import { useTemplateStyles } from './components';
import { type UsermetaDatasetFieldType } from '@deneb-viz/template-usermeta';
import { type DenebTemplateDatasetColumnRole } from './types';

/**
 * Used for validation of text field lengths vs. generated schema.
 */
export const TEMPLATE_DATASET_FIELD_PROPS =
    schema_v1.definitions.UsermetaDatasetField.properties;

export const TEMPLATE_INFORMATION_PROPS =
    schema_v1.definitions.UsermetaInformation.properties;

/**
 * Resolve class name based on role.
 */
export const getDataColumnClass = (role: DenebTemplateDatasetColumnRole) => {
    const classes = useTemplateStyles();
    switch (role) {
        case 'type':
            return classes.datasetDataType;
        case 'name':
        case 'originalName':
        case 'exportName':
            return classes.datasetColumnName;
        case 'assignment':
            return classes.datasetColumnAssignment;
        default:
            return '';
    }
};

/**
 * Resolve heading column text based on role.
 */
export const getDataColumnText = (role: DenebTemplateDatasetColumnRole) => {
    switch (role) {
        case 'name':
            return getI18nValue('Text_Template_Dataset_Field_Name');
        case 'exportName':
            return getI18nValue('Text_Template_Dataset_Field_Name_Export');
        case 'originalName':
            return getI18nValue('Text_Template_Dataset_Field_OriginalName');
        case 'assignment':
            return getI18nValue('Text_Template_Dataset_Field_Assignment');
        case 'description':
        case 'exportDescription':
            return getI18nValue('Text_Template_Dataset_Field_Description');
        default:
            return '';
    }
};

/**
 * For a given column or measure (or template placeholder), resolve the UI
 * tooltip/title text for its data type.
 */
export const getDataTypeIconTitle = (type: UsermetaDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return getI18nValue('Template_Type_Descriptor_Bool');
        case 'text':
            return getI18nValue('Template_Type_Descriptor_Text');
        case 'numeric':
            return getI18nValue('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return getI18nValue('Template_Type_Descriptor_DateTime');
        default:
            return getI18nValue('Template_Import_Not_Deneb');
    }
};
