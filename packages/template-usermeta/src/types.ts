import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';
import type { SpecProvider } from '@deneb-viz/vega-runtime/embed';
import type { SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';


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
