export type TDatasetFieldKind = 'column' | 'measure' | 'any';
export type TDatasetFieldType =
    | 'bool'
    | 'text'
    | 'numeric'
    | 'dateTime'
    | 'other';
type TProvider = 'vega' | 'vegaLite';

/**
 * Main template definition.
 */
export interface IDenebTemplateMetadata {
    /**
     * Deneb Information
     */
    deneb: IDenebUserMeta;
    /**
     * High-level information or metadata about the template.
     */
    information: ITemplateInformation;
    /**
     * Dataset columns or measures used by the template, that the end-user will need to supply for it to work.
     * @uniqueItems true
     */
    dataset: ITemplateDatasetField[];
    /**
     * Any interactivity settings that we want to explicitly set.
     */
    interactivity?: ITemplateInteractivityOptions;
}

/**
 * Interactivity properties for specification.
 * @additionalProperties false
 */
export interface ITemplateInteractivityOptions {
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
     * Maximum number of data points to allow when selecting.
     * @minimum 1
     * @maximum 250
     */
    dataPointLimit: number;
}

/**
 * @additionalProperties false
 */
export interface IDenebUserMeta {
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
    provider: TProvider;
}

/**
 * @additionalProperties false
 */
export interface ITemplateDatasetField {
    /**
     * Unique field placeholder name. Must start and end with __ (double-underscore) and can only use alpha-numeric characters in-between.
     * @pattern ^__[a-zA-Z0-9]+__$
     * @maxLength 30
     */
    key: string;
    /**
     * @maxLength 30
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
    kind: TDatasetFieldKind;
    /**
     * The list of data types that can be used for this placeholder, for any columns or measures in the data model.
     */
    type: TDatasetFieldType;
    /**
     * Used internally by Deneb for import reconcilitation purposes once user supplies object from their own visual via the UI.
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
interface ITemplateInformation {
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
     */
    previewImageBase64PNG?: string;
}
