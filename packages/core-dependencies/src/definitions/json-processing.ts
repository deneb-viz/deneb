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
