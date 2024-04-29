import {
    CreateMode,
    DenebTemplateImportState,
    IDenebTemplateAllocationComponents,
    TrackedDrilldownProperties,
    TrackedFields,
    UsermetaDatasetField,
    UsermetaTemplate
} from '.';

/**
 * Represents the create slice in the visual store.
 */
export interface ICreateSliceState {
    create: ICreateSliceProperties;
}

/**
 * Represents the create slice properties in the visual store.
 */
export interface ICreateSliceProperties {
    candidates: IDenebTemplateAllocationComponents | null;
    importFile: string | null;
    importState: DenebTemplateImportState;
    metadata: UsermetaTemplate | null;
    metadataAllDependenciesAssigned: boolean;
    metadataAllFieldsAssigned: boolean;
    metadataDrilldownAssigned: boolean;
    mode: CreateMode;
    createFromTemplate: () => void;
    setFieldAssignment: (payload: ICreateSliceSetFieldAssignment) => void;
    setImportFile: (payload: ICreateSliceSetImportFile) => void;
    setImportState: (payload: ICreateSliceSetImportState) => void;
    setMode: (mode: CreateMode) => void;
    setTemplate: (payload: ICreateSliceSetTemplate) => void;
}

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
 * Represents the payload for a processed template file.
 */
export interface ICreateSliceSetImportFile {
    candidates: IDenebTemplateAllocationComponents | null;
    metadata: UsermetaTemplate | null;
    importFile: string | null;
    importState: DenebTemplateImportState;
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
 * Represents the export slice in the visual store.
 */
export interface IExportSliceState {
    export: IExportSliceProperties;
}

/**
 * Represents the export slice properties in the visual store.
 */
export interface IExportSliceProperties {
    includePreviewImage: boolean;
    metadata: UsermetaTemplate | null;
    setMetadataPropertyBySelector: (
        payload: IExportSliceSetMetadataPropertyBySelector
    ) => void;
    setPreviewImage: (payload: IExportSliceSetPreviewImage) => void;
}

/**
 * Represents the payload for a preview image assignment.
 */
export interface IExportSliceSetPreviewImage {
    includePreviewImage: boolean;
    previewImageBase64PNG: string;
}

/**
 * Represents the payload for an export metadata property assignment.
 */
export interface IExportSliceSetMetadataPropertyBySelector {
    selector: string;
    value: string;
}

/**
 * Represents the create slice in the visual store.
 */
export interface IFieldUsageSliceState {
    fieldUsage: IFieldUsageSliceProperties;
}

/**
 * Represents the create slice properties in the visual store.
 */
export interface IFieldUsageSliceProperties {
    dataset: TrackedFields;
    drilldown: TrackedDrilldownProperties;
    editorShouldSkipRemap: boolean;
    remapFields: UsermetaDatasetField[];
    remapAllDependenciesAssigned: boolean;
    remapAllFieldsAssigned: boolean;
    remapDrilldownAssigned: boolean;
    tokenizedSpec: string;
    applyFieldMapping: (payload: IFieldUsageSliceApplyFieldMapping) => void;
    setFieldAssignment: (payload: IFieldUsageSliceSetFieldAssignment) => void;
}

/**
 * Represents the payload for field mapping changes.
 */
export interface IFieldUsageSliceApplyFieldMapping {
    dataset: TrackedFields;
    drilldown: TrackedDrilldownProperties;
    jsonSpec: string;
}

/**
 * Represents the payload for a selected template (included in visual).
 */
export interface ICreateSliceSetTemplate {
    candidates: IDenebTemplateAllocationComponents;
    metadata: UsermetaTemplate;
}

/**
 * Represents the payload for a template field assignment.
 */
export interface IFieldUsageSliceSetFieldAssignment {
    key: string;
    suppliedObjectKey: string;
    suppliedObjectName: string;
}
