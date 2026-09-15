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
export const isCompilationReady = (result: CompilationResult | null): boolean =>
    result?.status === 'ready';

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

/**
 * Result shape produced by {@link evaluateZoomCommandsState}. Mirrors the
 * subset of the `commands` slice (defined in
 * `packages/app-core/src/state/commands.ts` as
 * `CommandsSliceProperties`) that the zoom controls write. Inlined as a
 * literal type rather than `Pick<CommandsSliceProperties, ...>` to avoid
 * the `lib → state → lib` import cycle that the latter would introduce.
 *
 * Note: `zoomLevel` is intentionally excluded — it has no dynamic
 * predicate and its slice value is initialised to `true` and never
 * updated. Adding it here would speculatively widen the contract.
 */
export type ZoomCommandsState = {
    zoomFit: boolean;
    zoomIn: boolean;
    zoomOut: boolean;
    zoomReset: boolean;
};

/**
 * Result shape produced by {@link evaluateExportSpecCommandState}.
 * Inlined for the same reason as {@link ZoomCommandsState}.
 */
export type ExportSpecCommandState = {
    exportSpecification: boolean;
};

/**
 * Pure helper that evaluates the four zoom command enabled flags from the
 * current zoom level and compilation result. Called from
 * `selectZoomCommandsState` (lib/commands/selectors.ts).
 *
 * Pure: no closures over store state, no side effects.
 */
export const evaluateZoomCommandsState = (
    zoomLevel: number,
    compilationResult: CompilationResult | null
): ZoomCommandsState => {
    const zoomLevelOptions: ZoomLevelCommandTestOptions = {
        value: zoomLevel,
        compilationResult
    };
    const zoomOtherOptions: ZoomOtherCommandTestOptions = {
        compilationResult
    };
    const otherEnabled = isZoomOtherCommandsEnabled(zoomOtherOptions);
    return {
        zoomFit: otherEnabled,
        zoomIn: isZoomInCommandEnabled(zoomLevelOptions),
        zoomOut: isZoomOutCommandEnabled(zoomLevelOptions),
        zoomReset: otherEnabled
    };
};

/**
 * Pure helper that evaluates the `exportSpecification` command enabled
 * flag from the editor dirty state and compilation result. Called from
 * `selectExportSpecificationCommandEnabled` (lib/commands/selectors.ts).
 *
 * Pure: no closures over store state, no side effects.
 */
export const evaluateExportSpecCommandState = (
    editorIsDirty: boolean,
    compilationResult: CompilationResult | null
): ExportSpecCommandState => ({
    exportSpecification: isExportSpecCommandEnabled({
        editorIsDirty,
        compilationResult
    })
});
