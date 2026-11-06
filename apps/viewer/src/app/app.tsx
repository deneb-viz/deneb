import { useEffect, useMemo, useRef } from 'react';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { logRender } from '@deneb-viz/utils/logging';
import {
    DenebProvider,
    DenebViewer,
    GatedDenebViewer,
    useDenebState
} from '@deneb-viz/app-core';
import {
    useDenebVisualState,
    usePlatformProvider,
    useRenderingSettle,
    DevOverlays,
    FetchingMessage,
    SplashInitial,
    NotificationToaster,
    type VisualAppProps
} from '@deneb-viz/powerbi-host';
import { LandingPage, resolveLandingSteps } from '../features/status';
import {
    CreateSurface,
    isCreatePending,
    isTemplateReset
} from '../features/create';
import {
    closesRenderingSynchronously,
    hasDataFields,
    isReadMode,
    resolveSurface
} from './surface';

export const App = (props: VisualAppProps) => {
    const { host } = props;
    const mode = useDenebVisualState((state) => state.interface.mode);
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    const persistedSpec = useDenebVisualState(
        (state) => state.settings?.vega?.output?.jsonSpec?.value
    );
    const storeSpec = useDenebState((state) => state.project.spec);
    const resetImport = useDenebState((state) => state.create.setMode);
    /**
     * Clears the import surface when the saved template is removed, so the
     * author starts from an empty import rather than the last template.
     * Every distinct saved value is recorded, whatever the update type.
     */
    const previousPersistedSpec = useRef(persistedSpec);
    useEffect(() => {
        if (isTemplateReset(previousPersistedSpec.current, persistedSpec)) {
            resetImport('import');
        }
        previousPersistedSpec.current = persistedSpec;
    }, [persistedSpec, resetImport]);
    const readMode = isReadMode(visualUpdateOptions);
    const surface = resolveSurface(
        mode,
        readMode,
        hasDataFields(visualUpdateOptions)
    );
    const hasTemplate = persistedSpec !== PROJECT_DEFAULTS.spec;
    useRenderingSettle(surface, closesRenderingSynchronously(surface), props);

    const mainComponent = useMemo(() => {
        switch (surface) {
            case 'splash':
                return <SplashInitial />;
            case 'fetching':
                return <FetchingMessage />;
            case 'create':
            case 'add-fields':
            case 'landing': {
                const steps = resolveLandingSteps({
                    surface,
                    readMode,
                    hasTemplate
                });
                if (surface !== 'create') {
                    return <LandingPage steps={steps} />;
                }
                return isCreatePending(storeSpec, persistedSpec) ? (
                    <SplashInitial />
                ) : (
                    <CreateSurface
                        host={host}
                        renderLanding={(importAction) => (
                            <LandingPage
                                steps={steps}
                                importAction={importAction}
                            />
                        )}
                    />
                );
            }
            // The viewer is mounted by `<GatedDenebViewer />` alongside this
            // component.
            default:
                return null;
        }
    }, [surface, readMode, hasTemplate, persistedSpec, storeSpec, host]);
    logRender('App', surface);
    const platformProvider = usePlatformProvider(props);
    return (
        <DenebProvider platformProvider={platformProvider}>
            <GatedDenebViewer
                isViewerMode={surface === 'viewer'}
                isEditorMode={false}
            >
                <DenebViewer />
            </GatedDenebViewer>
            {mainComponent}
            <NotificationToaster />
            <DevOverlays />
        </DenebProvider>
    );
};
