import powerbi from 'powerbi-visuals-api';
import type {
    UsermetaDatasetField,
    UsermetaDatasetFieldType,
    UsermetaTemplate
} from '@deneb-viz/template-usermeta';
import { type DenebTemplateImportWorkingProperties } from './lib/template-processing';

/**
 * Ensure that all requirements are tested and validated before we can create.
 */
export const areAllCreateDataRequirementsMet = (
    metadata: UsermetaTemplate
): Partial<DenebTemplateImportWorkingProperties> => {
    const metadataAllFieldsAssigned = areAllTemplateFieldsAssigned(
        metadata?.dataset
    );
    const metadataDrilldownAssigned = true; // to be implemented when drilldown is implemented
    const metadataAllDependenciesAssigned =
        metadataAllFieldsAssigned && metadataDrilldownAssigned;
    return {
        metadataAllDependenciesAssigned,
        metadataAllFieldsAssigned,
        metadataDrilldownAssigned
    };
};

/**
 * For a given array of template dataset fields, confirm that they all have a field allocated for assignment later on.
 */
export const areAllTemplateFieldsAssigned = (fields: UsermetaDatasetField[]) =>
    fields?.length === 0 ||
    fields?.filter((f) => !f.suppliedObjectKey)?.length === 0 ||
    false;

/**
 * For a given column or measure (or template placeholder), resolve its type against the corresponding Power BI value
 * descriptor.
 */
export const getTemplateDatasetFieldType = (
    type: powerbi.ValueTypeDescriptor
): UsermetaDatasetFieldType => {
    switch (true) {
        case type?.bool:
            return 'bool';
        case type?.text:
            return 'text';
        case type?.numeric:
            return 'numeric';
        case type?.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};
