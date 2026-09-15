import type { StoreState } from '../../state/state';
import {
    evaluateExportSpecCommandState,
    evaluateZoomCommandsState,
    type ExportSpecCommandState,
    type ZoomCommandsState
} from './state';
import type { Command } from './types';

/**
 * Derived, not stored: computed from `compilation.result` and
 * `editor.isDirty` rather than read from `state.commands`.
 */
export const selectExportSpecificationCommandEnabled = (
    state: StoreState
): ExportSpecCommandState =>
    evaluateExportSpecCommandState(
        state.editor.isDirty,
        state.compilation.result
    );

/**
 * Derived, not stored: computed from the current zoom level and
 * `compilation.result` rather than read from `state.commands`.
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
