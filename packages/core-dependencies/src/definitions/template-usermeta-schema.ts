import { SelectionMode, SpecProvider } from '.';

/**
 * The type of field that should ideally be applied to a placeholder.
 */
export type UsermetaDatasetFieldKind = 'column' | 'measure' | 'any';

/**
 * The list of data types that can be used for this placeholder, for any columns or measures in the data model.
 */
export type UsermetaDatasetFieldType =
    | 'bool'
    | 'text'
    | 'numeric'
    | 'dateTime'
    | 'other';

/**
 * Main template definition.
 */
export interface UsermetaTemplate {
    /**
     * Deneb Information
     */
    deneb: UsermetaDeneb;
    /**
     * High-level information or metadata about the template.
     */
    information: UsermetaInformation;
    /**
     * Dataset columns or measures used by the template, that the end-user will need to supply for it to work.
     * @uniqueItems true
     */
    dataset: UsermetaDatasetField[];
    /**
     * Any interactivity settings that we want to explicitly set.
     */
    interactivity?: UsermetaInteractivity;
    /**
     * The config editor content for the template. For versions prior to 1.7, this is merged into the top-level spec
     * and split back out when the template is imported. With the introduction of JSONC support, we need to keep the
     * spec and config separate. Anything stored in here is regarded as JSONC upon import also.
     */
    config?: string;
}

/**
 * Interactivity properties for specification.
 * @additionalProperties false
 */
export interface UsermetaInteractivity {
    /**
     * Enable tooltip handler.
     */
    tooltip: boolean;
    /**
     * Enable context menu for data points.
     */
    contextMenu: boolean;
    /**
     * Enable cross-filtering from data point click events.
     */
    selection: boolean;
    /**
     * The cross-filtering mode to use for the visual.
     */
    selectionMode?: SelectionMode;
    /**
     * Enable highlighting of measure values from other visuals.
     */
    highlight?: boolean;
    /**
     * Maximum number of data points to allow when selecting.
     * @minimum 1
     * @maximum 250
     */
    dataPointLimit: number;
}

/**
 * @additionalProperties false
 */
export interface UsermetaDeneb {
    /**
     * Which version the visual was built with. Uses semantic versioning internally, but we don't want to enforce this when validating as it's for information only. Can be spoofed but might be handy at some point.
     */
    build: string;
    /**
     * Template metadata version. Will be capped to the version matching this definition.
     * @minimum 1
     * @maximum 1
     */
    metaVersion: number;
    /**
     * Provider details for the template.
     */
    provider: SpecProvider;
    /**
     * Which version of the provider library was used to create the specification.
     */
    providerVersion: string;
}

/**
 * Definitions for individual fields within the dataset.
 */
export interface UsermetaDatasetField {
    /**
     * Unique field placeholder name. Must start and end with __ (double-underscore) and can only use alpha-numeric
     * characters in-between.
     * @pattern ^__[a-zA-Z0-9]+__$
     * @maxLength 30
     */
    key: string;
    /**
     * The display name of the field when presenting the template to the end user.
     * @maxLength 150
     */
    name: string;
    /**
     * Optional assistive text to display to the end-user when adding fields to the template.
     * @maxLength 300
     */
    description?: string;
    /**
     * Specifies whether a column or measure (or either) should be used for this placeholder.
     */
    kind: UsermetaDatasetFieldKind;
    /**
     * The list of data types that can be used for this placeholder, for any columns or measures in the data model.
     */
    type: UsermetaDatasetFieldType;
    /**
     * Used internally by Deneb for import reconcilitation purposes once user supplies object from their own visual via
     * the UI. This is the `queryName` of a supplied field from the data view.
     * @ignore
     */
    suppliedObjectKey?: string;
    /**
     * Used internally by Deneb for import reconcilitation purposes once user supplies object from their own visual via
     * the UI. This is the `displayName` of a supplied field from the data view.
     * @ignore
     */
    suppliedObjectName?: string;
    /**
     * Used internally by Deneb for export reconcilitation purposes.
     * @ignore
     */
    namePlaceholder?: string;
}

/**
 * @additionalProperties true
 */
export interface UsermetaInformation {
    /**
     * Display name of template.
     * @maxLength 100
     */
    name: string;
    /**
     * More detailed (but still short!) description of the template's purpose.
     * @maxLength 300
     */
    description?: string;
    /**
     * The author of the template, for follow-up... or kudos!
     *
     * @maxLength 100
     */
    author: string;
    /**
     * Unique identifier of template.
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
     */
    uuid: string;
    /**
     * Generation date and time of template.
     * @format date-time
     */
    generated: string;
    /**
     * Valid URI for a sample or instructional video.
     * @format uri
     */
    videoUri?: string;
    /**
     * Valid URI for a descriptive reference, e.g. blog post/support site etc.
     * @format uri
     */
    supportUri?: string;
    /**
     * Base64-encoded image/png string, representing a preview image for the template in external tools.
     * Should be a maximum of 150 x 150 pixels.
     */
    previewImageBase64PNG?: string;
}
