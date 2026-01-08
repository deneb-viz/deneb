import {
    getCrossHighlightFieldBaseMeasureName,
    isCrossHighlightComparatorField,
    isCrossHighlightField,
    isCrossHighlightStatusField,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/data-core/field';
import { getDenebState } from '../../state';

/**
 * List of default dataset fields managed by Deneb that can benefit from specific documentation explaining their
 * purpose.
 */
const DATASET_DEFAULT_FIELDS = [ROW_INDEX_FIELD_NAME, SELECTED_ROW_FIELD_NAME];

/**
 * For a given field, checks for any special conditions and resolves a suitable description.
 */
export const getFieldDocumentationByName = (fieldName: string) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case isFieldNameDefault(fieldName):
            return getDefaultFieldDocumentationByName(fieldName);
        case isCrossHighlightComparatorField(fieldName):
            return translate('Pivot_Dataset_HighlightComparatorField', [
                getCrossHighlightFieldBaseMeasureName(fieldName),
                translate('Text_Dataset_FieldHighlightComparatorEq'),
                translate('Text_Dataset_FieldHighlightComparatorLt'),
                translate('Text_Dataset_FieldHighlightComparatorGt'),
                translate('Text_Dataset_FieldHighlightComparatorNeq'),
                translate('Text_Dataset_FieldRefer_Documentation')
            ]);
        case isCrossHighlightStatusField(fieldName):
            return translate('Pivot_Dataset_HighlightStatusField', [
                getCrossHighlightFieldBaseMeasureName(fieldName),
                translate('Text_Dataset_FieldHighlightStatusNeutral'),
                translate('Text_Dataset_FieldHighlightStatusOn'),
                translate('Text_Dataset_FieldHighlightStatusOff'),
                translate('Text_Dataset_FieldRefer_Documentation')
            ]);
        case isCrossHighlightField(fieldName):
            return translate('Pivot_Dataset_HighlightField', [
                getCrossHighlightFieldBaseMeasureName(fieldName)
            ]);
        default:
            return fieldName;
    }
};

/**
 * If a column name is a default field, then supply a suitable description.
 */
const getDefaultFieldDocumentationByName = (fieldName: string) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case fieldName === SELECTED_ROW_FIELD_NAME:
            return translate('Pivot_Dataset_SelectedName', [
                fieldName,
                translate('Text_Dataset_FieldSelectedNeutral'),
                translate('Text_Dataset_FieldSelectedOn'),
                translate('Text_Dataset_FieldSelectedOff'),
                translate('Text_Dataset_FieldRefer_Documentation')
            ]);
        default:
            return translate(
                `Pivot_Dataset_${
                    fieldName === ROW_INDEX_FIELD_NAME
                        ? 'RowIdentifier'
                        : 'Unknown'
                }`,
                [fieldName]
            );
    }
};

/**
 * For a given field name, determine if it's in the list of 'default' fields that should be processed differently.
 */
const isFieldNameDefault = (fieldName: string) =>
    DATASET_DEFAULT_FIELDS.indexOf(fieldName) > -1;
