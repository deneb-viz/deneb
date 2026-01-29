import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { type CompilationResult } from '@deneb-viz/vega-runtime/compilation';
import {
    type ExportSpecCommandTestOptions,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from './types';
import { type EditorApplyMode } from '../interface';

/**
 * For the current apply mode, determine what the new one should be.
 */
export const getNextApplyMode = (
    applyMode: EditorApplyMode
): EditorApplyMode => (applyMode === 'Auto' ? 'Manual' : 'Auto');

/**
 * Check if compilation result indicates a valid/ready specification.
 */
export const isCompilationReady = (
    result: CompilationResult | null
): boolean => result?.status === 'ready';

/**
 * Tests whether the export specification command is enabled.
 */
export const isExportSpecCommandEnabled = (
    options: ExportSpecCommandTestOptions
) => !options.editorIsDirty && isCompilationReady(options.compilationResult);

/**
 * Tests whether the zoom in command is enabled.
 */
export const isZoomInCommandEnabled = (options: ZoomLevelCommandTestOptions) =>
    options.value !== VISUAL_PREVIEW_ZOOM_CONFIGURATION.max &&
    isCompilationReady(options.compilationResult);

/**
 * Tests whether other zoom commands are enabled.
 */
export const isZoomOtherCommandsEnabled = (
    options: ZoomOtherCommandTestOptions
) => isCompilationReady(options.compilationResult);

/**
 * Tests whether the zoom out command is enabled.
 */
export const isZoomOutCommandEnabled = (options: ZoomLevelCommandTestOptions) =>
    options.value !== VISUAL_PREVIEW_ZOOM_CONFIGURATION.min &&
    isCompilationReady(options.compilationResult);
