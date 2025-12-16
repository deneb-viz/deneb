import { type JSX } from 'react';
import { type Loader } from 'vega';

export type DenebPlatformProviderProps = {
    /**
     * Whether the host application allows downloading of files.
     */
    isDownloadPermitted?: boolean;
    /**
     * A component to display and manage platform-specific settings, that will be added to the Settings pane.
     */
    settingsPanePlatformComponent?: JSX.Element;
    /**
     * A custom Vega Loader instance to use within Deneb.
     */
    vegaLoader?: Loader | null;
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
