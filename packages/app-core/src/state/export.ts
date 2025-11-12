import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';

/**
 * Represents the export slice in the visual store.
 */
export type ExportSliceState = {
    export: ExportSliceProperties;
};

/**
 * Represents the export slice properties in the visual store.
 */
export type ExportSliceProperties = {
    includePreviewImage: boolean;
    metadata: UsermetaTemplate | null;
    setMetadataPropertyBySelector: (
        payload: ExportSliceSetMetadataPropertyBySelector
    ) => void;
    setPreviewImage: (payload: ExportSliceSetPreviewImage) => void;
};

/**
 * Represents the payload for a preview image assignment.
 */
export type ExportSliceSetPreviewImage = {
    includePreviewImage: boolean;
    previewImageBase64PNG: string;
};

/**
 * Represents the payload for an export metadata property assignment.
 */
export type ExportSliceSetMetadataPropertyBySelector = {
    selector: string;
    value: string;
};
