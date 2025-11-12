import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type Spec } from 'vega';
import { type TopLevelSpec } from 'vega-lite';

/**
 * Which mode we wish to use to instantiate our new specification.
 */
export type DenebTemplateCreateMode = 'import' | 'vegaLite' | 'vega';

/**
 * Stages we go through when importing a template so that the interface can respond accordingly.
 */
export type DenebTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';

/**
 * Because we're using JSONC, it's much easier to store the intended spec and config content as a string when we need
 * to work with the APIs (and also when we need to update placeholders etc. prior to create). This interface allows us
 * to store both of the intended strings for transport to and from the store, and other places we need them.
 */
export type DenebTemplateAllocationComponents = {
    spec: string;
    config: string;
};

/**
 * Represents the payload for a processed template file.
 */
export type DenebTemplateSetImportFilePayload = {
    candidates: DenebTemplateAllocationComponents | null;
    metadata: UsermetaTemplate | null;
    importFile: string | null;
    importState: DenebTemplateImportState;
};

/**
 * Represents the properties needed to manage a template import process.
 */
export type DenebTemplateImportWorkingProperties = {
    candidates: DenebTemplateAllocationComponents | null;
    importFile: string | null;
    importState: DenebTemplateImportState;
    metadata: UsermetaTemplate | null;
    metadataAllDependenciesAssigned: boolean;
    metadataAllFieldsAssigned: boolean;
    metadataDrilldownAssigned: boolean;
    mode: DenebTemplateCreateMode;
};

/**
 * Represents templates that are packaged in the .pbiviz for demo purposes.
 */
export type DenebTemplatesIncluded = {
    vega: Spec[];
    vegaLite: TopLevelSpec[];
};

/**
 * Used to track the state of the template export process.
 */
export type TemplateExportProcessingState = 'None' | 'Tokenizing' | 'Complete';
