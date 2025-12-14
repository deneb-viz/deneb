import { type JSX } from 'react';

export type DenebPlatformProviderProps = {
    /**
     * A component to display and manage platform-specific settings, that will be added to the Settings pane.
     */
    settingsPanePlatformComponent?: JSX.Element;
};
