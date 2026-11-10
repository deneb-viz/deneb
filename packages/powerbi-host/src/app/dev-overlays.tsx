import {
    IS_OVERLAY_ENABLED as IS_VIEWPORT_GATE_OVERLAY_ENABLED,
    ViewportGateDebugOverlay
} from '../features/viewport-gate-debug-overlay';
import {
    IS_OVERLAY_ENABLED as IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED,
    VisualUpdateHistoryOverlay
} from '../features/visual-update-history-overlay';

/**
 * The dev overlays the build enables. Each is gated where it mounts, so a
 * build with an overlay off never invokes its component.
 */
export const DevOverlays = () => (
    <>
        {IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED && (
            <VisualUpdateHistoryOverlay />
        )}
        {IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}
    </>
);
