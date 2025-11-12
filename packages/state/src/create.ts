import {
    type DenebTemplateImportState,
    type DenebTemplateAllocationComponents,
    type DenebTemplateSetImportFilePayload,
    type DenebTemplateImportWorkingProperties,
    type DenebTemplateCreateMode
} from '@deneb-viz/json-processing/template-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';

/**
 * Represents the create slice in the visual store.
 */
export type CreateSliceState = {
    create: CreateSliceProperties;
};

/**
 * Represents the create slice properties in the visual store.
 */
export type CreateSliceProperties = DenebTemplateImportWorkingProperties & {
    createFromTemplate: () => void;
    setFieldAssignment: (payload: ICreateSliceSetFieldAssignment) => void;
    setImportFile: (payload: DenebTemplateSetImportFilePayload) => void;
    setImportState: (payload: ICreateSliceSetImportState) => void;
    setMode: (mode: DenebTemplateCreateMode) => void;
    setTemplate: (payload: ICreateSliceSetTemplate) => void;
};

/**
 * Represents the payload used to instigate creation of a new specification from a template.
 */
export interface ICreateSliceCreateFromTemplate {
    jsonSpec: string;
    jsonConfig: string;
}

/**
 * Represents the payload for a template field assignment.
 */
export interface ICreateSliceSetFieldAssignment {
    key: string;
    suppliedObjectKey: string;
    suppliedObjectName: string;
}

/**
 * Represents the payload for a template import state.
 */
export interface ICreateSliceSetImportState {
    /**
     * Desired import state to transation to.
     */
    importState: DenebTemplateImportState;
    /**
     * Whether to refresh the create properties (e.g. when importing a new template).
     */
    refresh?: boolean;
}

/**
 * Represents the payload for a selected template (included in visual).
 */
export interface ICreateSliceSetTemplate {
    candidates: DenebTemplateAllocationComponents;
    metadata: UsermetaTemplate;
}
