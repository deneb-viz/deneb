import { createContext, useMemo, type ReactNode } from 'react';

import { type DenebPlatformProviderProps } from '../types';

/**
 * Shared empty defaults, so a visual that omits these props doesn't hand the
 * context memo a new array on every render.
 */
const NO_SETTINGS_PANE_COMPONENTS: JSX.Element[] = [];
const NO_SETTINGS_PANE_SEARCHABLES: NonNullable<
    DenebPlatformProviderProps['settingsPanePlatformSearchable']
> = [];
const NO_VIEW_EVENT_BINDERS: NonNullable<
    DenebPlatformProviderProps['viewEventBinders']
> = [];

/**
 * Context props type - makes most props required (with defaults), but keeps
 * tooltipHandler and rendering callbacks optional since they're platform-specific.
 */
type DenebPlatformProviderContextProps = Omit<
    Required<DenebPlatformProviderProps>,
    | 'tooltipHandler'
    | 'onRenderingStarted'
    | 'onRenderingFinished'
    | 'onRenderingError'
    | 'onCreateProject'
    | 'onEnableCrossHighlight'
    | 'onDisableCrossHighlight'
    | 'settingsPaneFooter'
> &
    Pick<
        DenebPlatformProviderProps,
        | 'tooltipHandler'
        | 'onRenderingStarted'
        | 'onRenderingFinished'
        | 'onRenderingError'
        | 'onCreateProject'
        | 'onEnableCrossHighlight'
        | 'onDisableCrossHighlight'
        | 'settingsPaneFooter'
    >;

export const DenebPlatformProviderContext =
    createContext<DenebPlatformProviderContextProps | null>(null);

export const DenebPlatformProvider = ({
    embedContainerSetByHost = false,
    isDownloadPermitted = true,
    onCreateProject,
    onEnableCrossHighlight,
    onDisableCrossHighlight,
    onRenderingError,
    onRenderingFinished,
    onRenderingStarted,
    settingsPaneFooter,
    settingsPanePlatformComponent = NO_SETTINGS_PANE_COMPONENTS,
    settingsPanePlatformSearchable = NO_SETTINGS_PANE_SEARCHABLES,
    tooltipHandler,
    vegaLoader = null,
    viewEventBinders = NO_VIEW_EVENT_BINDERS,
    downloadJsonFile = downloadJsonFileDefault,
    launchUrl = launchUrlDefault,
    children
}: DenebPlatformProviderProps & { children: ReactNode }) => {
    const platformContext = useMemo<DenebPlatformProviderContextProps>(
        () => ({
            embedContainerSetByHost,
            isDownloadPermitted,
            onCreateProject,
            onEnableCrossHighlight,
            onDisableCrossHighlight,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            settingsPaneFooter,
            settingsPanePlatformComponent,
            settingsPanePlatformSearchable,
            tooltipHandler,
            vegaLoader,
            viewEventBinders,
            downloadJsonFile,
            launchUrl
        }),
        [
            downloadJsonFile,
            embedContainerSetByHost,
            isDownloadPermitted,
            launchUrl,
            onCreateProject,
            onEnableCrossHighlight,
            onDisableCrossHighlight,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            settingsPaneFooter,
            settingsPanePlatformComponent,
            settingsPanePlatformSearchable,
            tooltipHandler,
            vegaLoader,
            viewEventBinders
        ]
    );

    return (
        <DenebPlatformProviderContext.Provider value={platformContext}>
            {children}
        </DenebPlatformProviderContext.Provider>
    );
};

/**
 * Default function to handle downloading a JSON file.
 * Creates a Blob from the content and triggers a download.
 * @param content - The JSON content to download.
 * @param filename - The name of the file to save.
 */
const downloadJsonFileDefault = async (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Default function to handle launching a URL in a new tab.
 */
const launchUrlDefault = (url: string) => {
    window.open(url, '_blank');
};
