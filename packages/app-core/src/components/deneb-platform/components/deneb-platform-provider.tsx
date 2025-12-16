import { createContext, useMemo, type ReactNode } from 'react';

import { type DenebPlatformProviderProps } from '../types';

type DenebPlatformProviderContextProps = Required<DenebPlatformProviderProps>;

export const DenebPlatformProviderContext =
    createContext<DenebPlatformProviderContextProps | null>(null);

export const DenebPlatformProvider = ({
    launchUrl = launchUrlDefault,
    settingsPanePlatformComponent = <></>,
    vegaLoader = null,
    children
}: DenebPlatformProviderProps & { children: ReactNode }) => {
    const platformContext = useMemo<DenebPlatformProviderContextProps>(
        () => ({
            launchUrl,
            settingsPanePlatformComponent,
            vegaLoader
        }),
        [launchUrl, settingsPanePlatformComponent, vegaLoader]
    );

    return (
        <DenebPlatformProviderContext.Provider value={platformContext}>
            {children}
        </DenebPlatformProviderContext.Provider>
    );
};

/**
 * Default function to handle launching a URL in a new tab.
 */
const launchUrlDefault = (url: string) => {
    window.open(url, '_blank');
};
