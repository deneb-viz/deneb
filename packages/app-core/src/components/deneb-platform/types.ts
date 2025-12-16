import { type JSX } from 'react';
import { type Loader } from 'vega';

export type DenebPlatformProviderProps = {
    /**
     * How the action of launching a URL should be handled.
     */
    launchUrl?: (url: string) => void;
    /**
     * A component to display and manage platform-specific settings, that will be added to the Settings pane.
     */
    settingsPanePlatformComponent?: JSX.Element;
    /**
     * A custom Vega Loader instance to use within Deneb.
     */
    vegaLoader?: Loader | null;
};
