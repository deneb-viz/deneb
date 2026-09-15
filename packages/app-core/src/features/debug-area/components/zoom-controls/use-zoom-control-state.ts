import { useDenebState } from '../../../../state';
import { selectZoomCommandsState } from '../../../../lib/commands';

/**
 * Shared Zustand selector for the zoom controls (level popover + slider): the
 * current zoom level, whether zoom-to-fit is enabled, the i18n translator, and
 * the zoom-level setter. Both controls read exactly this slice, so it lives in
 * one place to keep them from drifting apart.
 *
 * `zoomFitEnabled` is derived via `selectZoomCommandsState` rather than read
 * from `state.commands.zoomFit` — see
 * docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md U4.
 */
export const useZoomControlState = () =>
    useDenebState((state) => ({
        editorZoomLevel: state.editorZoomLevel,
        zoomFitEnabled: selectZoomCommandsState(state).zoomFit,
        translate: state.i18n.translate,
        updateEditorZoomLevel: state.updateEditorZoomLevel
    }));
