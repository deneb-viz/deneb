import { logRender } from '@deneb-viz/utils/logging';
import { DenebViewer } from '@deneb-viz/app-core';

/**
 * Handles routing of the main visual display, when in report view.
 *
 * Mounted only by `<GatedDenebViewer />` after the gate releases (and
 * `app.tsx` only routes to it via `<GatedDenebViewer>` when
 * `mode === 'viewer'`), so all other modes — `initializing`,
 * `fetching`, `landing`, `no-project`, `editor`, transitions — are
 * already handled upstream in `mainComponent`. This component is a
 * thin marker for render telemetry and a single mount point for the
 * Deneb viewer.
 */
export const ReportViewRouter = () => {
    logRender('ReportViewRouter', 'viewer');
    return <DenebViewer />;
};
