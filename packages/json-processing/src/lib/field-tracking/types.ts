import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { type JSONPath } from 'jsonc-parser';

/**
 * Used to track the state of the JSON remapping process.
 */
export type RemapState =
    | 'None'
    | 'Tokenizing'
    | 'Replacing'
    | 'Tracking'
    | 'UpdatingEditor'
    | 'Complete';

/**
 * Ensures that we can manage tracking of drilldown field usage.
 */
export type TrackedDrilldownProperties = {
    isCurrent: boolean;
    isMappingRequired: boolean;
};

/**
 * Represents the properties of a tracked field candidate. A candidate is a field in the dataset that we have
 * identified as being used in the specification since the current editing session began. This allows us to track
 * renames of an existing field, or whether the creator removed it from the dataset and may need to re-map it.
 */
export type TrackedFieldCandidate = {
    /**
     * Whether this field is currently in the dataset.
     */
    isCurrent: boolean;
    /**
     * Represents what we think the current template metadata should be, based on the current dataset and the
     * `queryName` assigned. This allows us to track renames of an existing field.
     */
    templateMetadata?: UsermetaDatasetField;
    /**
     * The original template metadata associated with this field when intitial mapping was done. This gives us the
     * original metadata tied to this field's `queryName` and allows us to track renames of an existing field.
     */
    templateMetadataOriginal?: UsermetaDatasetField;
};

/**
 * Fields that we have reconciled against our dataset from our specification. This will include fields that have been
 * used in the specification, and have been removed from the dataset in the current editing session. This is to allow
 * us to identify and re-map them if necessary.
 */
export type TrackedFieldCandidates = {
    [key: string]: TrackedFieldCandidate;
};

/**
 * Represents the properties of a tracked field.
 */
export interface TrackedFieldProperties {
    /**
     * The placeholder that we are using to represent this field in the specification.
     */
    placeholder: string;
    /**
     * The identified JSON paths to where this field is used in the specification.
     */
    paths: JSONPath[];
    /**
     * Whether this field is currently in the dataset.
     */
    isInDataset: boolean;
    /**
     * Whether this field is currently in the specification.
     */
    isInSpecification: boolean;
    /**
     * Whether this field requires mapping. This means that it was in the dataset previously, and in the specification,
     * but has been removed from the dataset in the current editing session. This will then be used to determine if we
     * should prompt the user to re-map the field.
     */
    isMappingRequired: boolean;
    /**
     * Represents what we think the current template metadata should be, based on the current dataset and the
     * `queryName` assigned. This allows us to track renames of an existing field.
     */
    templateMetadata: UsermetaDatasetField;
    /**
     * The original template metadata associated with this field when intitial mapping was done. This gives us the
     * original metadata tied to this field's `queryName` and allows us to track renames of an existing field.
     */
    templateMetadataOriginal: UsermetaDatasetField;
}

/**
 * Fields that should be tracked across specification and dataset.
 */
export type TrackedFields = {
    [key: string]: TrackedFieldProperties;
};

/**
 * Represents the working properties for tracked fields.
 */
export type TrackedFieldWorkingProperties = {
    dataset: TrackedFields;
    drilldown: TrackedDrilldownProperties;
    editorShouldSkipRemap: boolean;
    remapFields: UsermetaDatasetField[];
    remapAllDependenciesAssigned: boolean;
    remapAllFieldsAssigned: boolean;
    remapDrilldownAssigned: boolean;
    tokenizedSpec: string | null;
};
