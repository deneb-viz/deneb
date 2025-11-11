import { JSONPath } from 'jsonc-parser';
import { UsermetaDatasetField } from './template-usermeta-schema';

/**
 * Options for resolving a provider schema validator.
 */
export type GetProviderValidatorOptions = {
    provider: SchemaProvider;
    version?: string;
    isConfig?: boolean;
};

/**
 * Specifies the type of JSON content being processed, which allows us to determine things like the correct schema and
 * logic to apply when processing it.
 */
export type JsonContentType = 'Spec' | 'Config';

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
 * Valid provider types for JSON schemas used in Deneb.
 */
export type SchemaProvider = 'vega' | 'vegaLite' | 'denebUserMeta';

/**
 * Represents the JSON schema metadata for a given provider version.
 */
export type SchemaProviderMetadata = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

/**
 * A record of of all schema providers and the JSON for the specified versions.
 */
export type SchemaProviderReference = {
    [key in SchemaProvider]: SchemaProviderMetadata;
};

/**
 * When we perform parsing of the JSON editor or property content (prior to patching it), we need to know if there
 * re any errors so we can log them. This providdes the result of the parsing, and any errors that were encountered.
 */
export interface IJsonParseResult {
    result: object | null;
    errors: string[];
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
 * When we parse the JSON to look for specific field types, these rely on specific patterns and replacements. This
 * interface provides the pattern and the replacement for a given field type.
 */
export interface TokenPatternReplacer {
    pattern: string;
    replacer: string;
}

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
