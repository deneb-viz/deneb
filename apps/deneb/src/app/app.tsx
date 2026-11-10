import powerbi from 'powerbi-visuals-api';
import { useEffect, useMemo, useRef, useState } from 'react';

import { logRender } from '@deneb-viz/utils/logging';
import { ReportViewRouter } from './report-view-router';
import { DenebProvider, GatedDenebViewer } from '@deneb-viz/app-core';
import {
    PLATFORM_SECTION_KEYS,
    platformSearchContributions
} from './platform-search-contributions';
import { markEditorOpenStart, RetainedDenebEditor } from '@deneb-viz/editor';
import { LandingPage } from '../features/status';
import {
    InteractivityFooter,
    TooltipSettings,
    ContextMenuSettings,
    CrossFilterSettings,
    CrossHighlightSettings,
    SemanticModelSettings
} from '../features/settings';
import { NotificationApplyChanges } from '../features/toaster';
import {
    resolveDownloadPermitted,
    useDenebVisualState,
    usePlatformProvider,
    useRenderingSettle,
    DevOverlays,
    FetchingMessage,
    SplashInitial,
    NotificationToaster,
    type VisualAppProps
} from '@deneb-viz/powerbi-host';
import { handlePersistBooleanProperty } from '../features/settings/helpers';

export const App = (props: VisualAppProps) => {
    const { host } = props;
    const [isDownloadPermitted, setIsDownloadPermitted] = useState<
        boolean | undefined
    >(undefined);
    const mode = useDenebVisualState((state) => state.interface.mode);
    // Marker for the viewport-freeze investigation: detect the
    // transition INTO editor mode and dispatch `markEditorOpenStart`.
    // Lives in `useEffect` rather than render-body so the module-
    // level mutation in the marker store is not triggered by a
    // discarded concurrent-mode render or by Strict Mode's double-
    // invocation. The previous-mode tracker is a ref because it is
    // only read from the post-commit effect; refs mutated during
    // effects (not during render) are concurrent-safe.
    //
    // Trade-off: child layout effects (e.g. `editor.tsx`'s
    // `markEditorOpenStage('editor-mount')`) run before parent
    // post-commit effects, so on a first cold open the
    // `editor-mount` stage may fire before this `start` and be
    // dropped by the marker module's "no active cycle" guard. This
    // is acceptable — the marker is dev-only instrumentation and
    // subsequent stages plus flush continue to work.
    const previousModeRef = useRef(mode);
    useEffect(() => {
        if (mode === 'editor' && previousModeRef.current !== 'editor') {
            markEditorOpenStart();
        }
        previousModeRef.current = mode;
    }, [mode]);
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    // Ensure that download permissions are evaluated against the current tenant and sent to the core app
    useEffect(() => {
        if (host) {
            resolveDownloadPermitted(
                () => host.downloadService.exportStatus(),
                powerbi.PrivilegeStatus.Allowed
            ).then(setIsDownloadPermitted);
        }
    }, [host]);

    const isRenderlessMode =
        mode === 'initializing' ||
        mode === 'landing' ||
        mode === 'no-project' ||
        mode === 'fetching' ||
        mode === 'transition-viewer-editor' ||
        mode === 'transition-editor-viewer';
    useRenderingSettle(mode, isRenderlessMode, props);

    const mainComponent = useMemo(() => {
        switch (mode) {
            case 'initializing':
                return <SplashInitial />;
            case 'fetching':
                return <FetchingMessage />;
            case 'landing':
            case 'no-project':
                return <LandingPage />;
            // Render nothing during Power BI host transitions — the container is
            // actively resizing and anything mounted would appear at the wrong
            // viewport size. See display-mode.ts for the full update sequence.
            case 'transition-viewer-editor':
            case 'transition-editor-viewer':
                return null;
            case 'editor':
                // Editor mode is rendered by `<RetainedDenebEditor />`
                // alongside the main component so the editor tree is
                // retained across viewer↔editor toggles after the
                // first open. See packages/app-core/src/app/retained-deneb-editor.tsx.
                return null;
            // Viewer mode is rendered by `<GatedDenebViewer />`
            // alongside the main component so the viewer's Vega
            // mount can be gated until the iframe has physically
            // shrunk to the new viewer-mode width on editor → viewer
            // transitions. See packages/app-core/src/app/gated-deneb-viewer.tsx.
            case 'viewer':
                return null;
            default:
                return null;
        }
    }, [mode]);
    logRender('App', mode);
    const basePlatformProvider = usePlatformProvider(props);
    /**
     * The editor's additions to the Power BI platform provider. Memoized,
     * so `DenebProvider` consumers keep a stable reference across renders
     * that change none of the values it closes over.
     */
    const platformProvider = useMemo(
        () => ({
            ...basePlatformProvider,
            isDownloadPermitted,
            onEnableCrossHighlight: () =>
                handlePersistBooleanProperty('enableHighlight', true),
            onDisableCrossHighlight: () =>
                handlePersistBooleanProperty('enableHighlight', false),
            settingsPaneFooter: <InteractivityFooter />,
            settingsPanePlatformComponent: [
                <SemanticModelSettings key={PLATFORM_SECTION_KEYS[0]} />,
                <TooltipSettings key={PLATFORM_SECTION_KEYS[1]} />,
                <ContextMenuSettings key={PLATFORM_SECTION_KEYS[2]} />,
                <CrossFilterSettings key={PLATFORM_SECTION_KEYS[3]} />,
                <CrossHighlightSettings key={PLATFORM_SECTION_KEYS[4]} />
            ],
            settingsPanePlatformSearchable: platformSearchContributions,
            downloadJsonFile: (content, filename, description) => {
                host.downloadService.exportVisualsContentExtended(
                    content,
                    filename,
                    'json',
                    description
                );
            }
        }),
        [basePlatformProvider, host, isDownloadPermitted]
    );
    return (
        <DenebProvider platformProvider={platformProvider}>
            <RetainedDenebEditor
                isEditorMode={mode === 'editor'}
                hostViewportWidth={visualUpdateOptions?.viewport?.width}
                hostViewportHeight={visualUpdateOptions?.viewport?.height}
            />
            <GatedDenebViewer
                isViewerMode={mode === 'viewer'}
                isEditorMode={mode === 'editor'}
            >
                <ReportViewRouter />
            </GatedDenebViewer>
            {mainComponent}
            <NotificationToaster
                notifications={(toasterId) => (
                    <NotificationApplyChanges toasterId={toasterId} />
                )}
            />
            <DevOverlays />
        </DenebProvider>
    );
};
