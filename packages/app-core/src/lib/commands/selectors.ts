import type { StoreState } from '../../state/state';
import {
    evaluateExportSpecCommandState,
    evaluateZoomCommandsState,
    type ExportSpecCommandState,
    type ZoomCommandsState
} from './state';
import type { Command } from './types';

/**
 * Derives the `exportSpecification` command's enabled state from the
 * current compilation result and editor dirty flag. Replaces the stored
 * `commands.exportSpecification` write that used to happen in
 * `handleCompile` (state/compilation.ts) — as of U4
 * (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md),
 * core slices no longer write into `commands`, so callers that need this
 * value read it here instead of `state.commands.exportSpecification`.
 *
 * Reuses the same pure helper (`evaluateExportSpecCommandState`) that
 * `handleCompile` (state/compilation.ts) used to call before U4, and that
 * `handleUpdateChanges`/`handleUpdateIsDirty` (state/editor.ts) used to
 * call before a later cleanup pass removed those writes too — this
 * selector is now the sole caller.
 */
export const selectExportSpecificationCommandEnabled = (
    state: StoreState
): ExportSpecCommandState =>
    evaluateExportSpecCommandState(
        state.editor.isDirty,
        state.compilation.result
    );

/**
 * Derives the four zoom commands' (`zoomFit`, `zoomIn`, `zoomOut`,
 * `zoomReset`) enabled state from the current zoom level and compilation
 * result. Replaces the stored `commands.zoom*` write that used to happen
 * in `handleCompile` (state/compilation.ts) — see
 * {@link selectExportSpecificationCommandEnabled} for why.
 *
 * Reuses the same pure helper (`evaluateZoomCommandsState`) that
 * `handleUpdateEditorZoomLevel` (state/editor.ts) used to call before a
 * later cleanup pass removed that write too — this selector is now the
 * sole caller.
 */
export const selectZoomCommandsState = (state: StoreState): ZoomCommandsState =>
    evaluateZoomCommandsState(state.editorZoomLevel, state.compilation.result);

/**
 * Resolves whether a given command is enabled, regardless of whether its
 * enabled state is derived (export/zoom) or stored (`state.commands`).
 * Single dispatch point for the two call sites that look up enablement by
 * an arbitrary `Command` value — `executeCommand` (lib/commands/actions.ts)
 * and the `disabled` prop in
 * components/ui/toolbar/toolbar-button-standard.tsx — so neither
 * duplicates the derived-vs-stored distinction in a local switch.
 */
export const selectCommandEnabled = (
    state: StoreState,
    command: Command
): boolean => {
    switch (command) {
        case 'exportSpecification':
            return selectExportSpecificationCommandEnabled(state)
                .exportSpecification;
        case 'zoomFit':
        case 'zoomIn':
        case 'zoomOut':
        case 'zoomReset':
            return selectZoomCommandsState(state)[command];
        default:
            return state.commands[command];
    }
};
