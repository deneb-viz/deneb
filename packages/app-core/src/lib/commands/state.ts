import { isSpecificationValid } from '@deneb-viz/json-processing/spec-processing';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import {
    type ExportSpecCommandTestOptions,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from './types';
import { type EditorApplyMode } from '../interface';
import { isEditorInterface } from '../interface/state';

/**
 * For the current apply mode, determine what the new one should be.
 */
export const getNextApplyMode = (
    applyMode: EditorApplyMode
): EditorApplyMode => (applyMode === 'Auto' ? 'Manual' : 'Auto');

/**
 * Tests whether the export specification command is enabled.
 */
export const isExportSpecCommandEnabled = (
    options: ExportSpecCommandTestOptions
) =>
    !options.editorIsDirty &&
    isSpecificationValid(options.specification) &&
    isEditorInterface(options.interfaceMode);

/**
 * Tests whether the zoom in command is enabled.
 */
export const isZoomInCommandEnabled = (options: ZoomLevelCommandTestOptions) =>
    options.value !== VISUAL_PREVIEW_ZOOM_CONFIGURATION.max &&
    isSpecificationValid(options.specification) &&
    isEditorInterface(options.interfaceMode);

/**
 * Tests whether other zoom commands are enabled.
 */
export const isZoomOtherCommandsEnabled = (
    options: ZoomOtherCommandTestOptions
) =>
    isSpecificationValid(options.specification) &&
    isEditorInterface(options.interfaceMode);

/**
 * Tests whether the zoom out command is enabled.
 */
export const isZoomOutCommandEnabled = (options: ZoomLevelCommandTestOptions) =>
    options.value !== VISUAL_PREVIEW_ZOOM_CONFIGURATION.min &&
    isSpecificationValid(options.specification) &&
    isEditorInterface(options.interfaceMode);
