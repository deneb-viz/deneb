import { JSONPath } from 'jsonc-parser';
import { UsermetaDatasetField } from './template-usermeta-schema';

/**
 * Used to track the state of the JSON remapping process.
 */
export enum RemapState {
    None = 0,
    Tokenizing = 10,
    Replacing = 20,
    Tracking = 30,
    UpdatingEditor = 40,
    Complete = 100
}

/**
 * Used to track the state of the template export process.
 */
export enum TemplateExportProcessingState {
    None = 0,
    Tokenizing = 10,
    Complete = 100
}

/**
 * Ensures that we can manage tracking of drilldown field usage.
 */
export type TrackedDrilldownProperties = {
    isCurrent: boolean;
    isMappingRequired: boolean;
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
