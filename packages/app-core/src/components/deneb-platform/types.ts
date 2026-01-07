import { type JSX } from 'react';
import { type Loader, type TooltipHandler, type View } from 'vega';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';

/**
 * A function that binds platform-specific event listeners to a Vega view.
 * Implementations should close over any required dependencies (dataset, translations, etc.).
 */
export type ViewEventBinder = (view: View) => void;

/**
 * Project data passed to the onCreateProject callback.
 * Includes template metadata and processed spec/config content.
 */
export type OnCreateProjectPayload = {
    metadata: UsermetaTemplate;
    spec: string;
    config: string;
};

export type DenebPlatformProviderProps = {
    /**
     * Whether the host application allows downloading of files.
     */
    isDownloadPermitted?: boolean;
    /**
     * Whether the embed container size is managed by the host application.
     * When true, the host is responsible for setting embedViewport dimensions.
     * When false (default), app-core will manage the container size internally.
     */
    embedContainerSetByHost?: boolean;
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
    /**
     * Callback invoked when a project is created from a template.
     * Platforms can use this to persist project and interactivity settings, or perform other platform-specific
     * actions. This is called BEFORE app-core state is updated, allowing platforms to persist to their source of truth
     * first and avoid sync race conditions.
     * @param payload - The template metadata and processed project data
     * @returns void or Promise<void> - errors should be logged, not thrown
     */
    onCreateProject?: (payload: OnCreateProjectPayload) => void | Promise<void>;
};
