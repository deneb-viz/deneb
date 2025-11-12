import reduce from 'lodash/reduce';
import values from 'lodash/values';
import { areAllTemplateFieldsAssigned } from './template-dataset';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import {
    type TrackedFields,
    type TrackedDrilldownProperties,
    type TrackedFieldWorkingProperties
} from './lib/field-tracking';

/**
 * Confirms that all requirements for field mapping have been met.
 */
export const areAllRemapDataRequirementsMet = (options: {
    remapFields: UsermetaDatasetField[];
    drilldownProperties?: TrackedDrilldownProperties;
}): Partial<TrackedFieldWorkingProperties> => {
    const remapAllFieldsAssigned = areAllTemplateFieldsAssigned(
        options.remapFields
    );
    const remapDrilldownAssigned =
        !options.drilldownProperties?.isMappingRequired;
    const remapAllDependenciesAssigned =
        remapAllFieldsAssigned && remapDrilldownAssigned;
    return {
        remapAllFieldsAssigned,
        remapDrilldownAssigned,
        remapAllDependenciesAssigned
    };
};

/**
 * From the tracked fields, get those that are in the specification, and therefore eligible for re-mapping.
 */
export const getRemapEligibleFields = (
    fields: TrackedFields
): UsermetaDatasetField[] =>
    reduce(
        fields,
        (result, value) =>
            value.isInSpecification
                ? result.concat({
                      ...value.templateMetadata,
                      name: value.templateMetadataOriginal.name,
                      namePlaceholder: value.templateMetadataOriginal.name,
                      suppliedObjectKey: value.isMappingRequired
                          ? undefined
                          : value.templateMetadata.key,
                      suppliedObjectName: value.isMappingRequired
                          ? undefined
                          : value.templateMetadata.name
                  })
                : result,
        <UsermetaDatasetField[]>[]
    ).sort((a, b) => (a.name?.toLowerCase() < b.name?.toLowerCase() ? -1 : 1));

/**
 * Test to see if the tracking information contains and fields that require mapping (which should trigger the mapping
 * modal dialog).
 */
export const isMappingDialogRequired = (options: {
    trackedFields: TrackedFields;
    drilldownProperties?: TrackedDrilldownProperties;
}) =>
    values(options.trackedFields).filter((v) => v.isMappingRequired).length >
        0 || options.drilldownProperties?.isMappingRequired;
