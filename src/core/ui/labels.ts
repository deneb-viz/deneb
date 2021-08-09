import { ITemplateDatasetField, TDatasetFieldType } from '../template/schema';
import { i18nValue } from './i18n';

/**
 * For a given column or measure (or template placeholder), resolve the UI tooltip/title text for its data type.
 */
export const getDataTypeIconTitle = (type: TDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return i18nValue('Template_Type_Descriptor_Bool');
        case 'text':
            return i18nValue('Template_Type_Descriptor_Text');
        case 'numeric':
            return i18nValue('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return i18nValue('Template_Type_Descriptor_DateTime');
        default:
            return i18nValue('Template_Import_Not_Deneb');
    }
};

/**
 * Supply assistive text to a placeholder, based on whether it allows columns, measures or both.
 */
export const getPlaceholderDropdownText = (
    datasetField: ITemplateDatasetField
) => {
    switch (datasetField.kind) {
        case 'column':
            return i18nValue('Dropdown_Placeholder_Column');
        case 'measure':
            return i18nValue('Dropdown_Placeholder_Measure');
        default:
            return i18nValue('Dropdown_Placeholder_Both');
    }
};

export const resolveAutoApplyLabel = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');
