import { isSpecificationValid } from '@deneb-viz/json-processing/spec-processing';
import { type ExportSpecCommandTestOptions } from './types';
import { isEditorInterface } from '../interface';

/**
 * Tests whether the export specification command is enabled.
 */
export const isExportSpecCommandEnabled = (
    options: ExportSpecCommandTestOptions
) =>
    !options.editorIsDirty &&
    isSpecificationValid(options.specification) &&
    isEditorInterface(options.interfaceMode);
