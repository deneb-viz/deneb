import { UsermetaTemplate } from './template-usermeta-schema';

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
