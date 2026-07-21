import { useDenebState } from '../../../../state';

/**
 * Shared Zustand selector for the zoom controls (level popover + slider): the
 * current zoom level, whether zoom-to-fit is enabled, the i18n translator, and
 * the zoom-level setter. Both controls read exactly this slice, so it lives in
 * one place to keep them from drifting apart.
 */
export const useZoomControlState = () =>
    useDenebState((state) => ({
        editorZoomLevel: state.editorZoomLevel,
        zoomFitEnabled: state.commands.zoomFit,
        translate: state.i18n.translate,
        updateEditorZoomLevel: state.updateEditorZoomLevel
    }));
