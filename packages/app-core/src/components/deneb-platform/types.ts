import { type JSX } from 'react';
import { type Loader, type TooltipHandler, type View } from 'vega';

/**
 * A function that binds platform-specific event listeners to a Vega view.
 * Implementations should close over any required dependencies (dataset, translations, etc.).
 */
export type ViewEventBinder = (view: View) => void;

export type DenebPlatformProviderProps = {
    /**
     * Whether the host application allows downloading of files.
     */
    isDownloadPermitted?: boolean;
    /**
     * Callback invoked when Vega rendering fails with an error.
     */
    onRenderingError?: (error: Error) => void;
    /**
     * Callback invoked when Vega rendering finishes successfully.
     */
    onRenderingFinished?: () => void;
    /**
     * Callback invoked when Vega rendering starts.
     */
    onRenderingStarted?: () => void;
    /**
     * A component to display and manage platform-specific settings, that will be added to the Settings pane.
     */
    settingsPanePlatformComponent?: JSX.Element;
    /**
     * A platform-specific tooltip handler for Vega. If not provided, default Vega tooltips will be used.
     */
    tooltipHandler?: TooltipHandler;
    /**
     * A custom Vega Loader instance to use within Deneb.
     */
    vegaLoader?: Loader | null;
    /**
     * Array of functions that bind platform-specific event listeners to the Vega view.
     * Called in order after view initialization. Each binder should close over its
     * required dependencies (dataset, translations, selection mode checks, etc.).
     */
    viewEventBinders?: ViewEventBinder[];
    /**
     * Function to handle the download of a JSON file from the application, if a host environment has a custom download
     * API.
     */
    downloadJsonFile?: (
        content: string,
        filename: string,
        description: string
    ) => void;
    /**
     * How the action of launching a URL should be handled.
     */
    launchUrl?: (url: string) => void;
};
