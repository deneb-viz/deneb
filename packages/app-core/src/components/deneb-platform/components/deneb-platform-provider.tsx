import { createContext, useMemo, type ReactNode } from 'react';

import { type DenebPlatformProviderProps } from '../types';

export const DenebPlatformProviderContext =
    createContext<DenebPlatformProviderProps | null>(null);

export const DenebPlatformProvider = ({
    settingsPanePlatformComponent = <></>,
    vegaLoader,
    children
}: DenebPlatformProviderProps & { children: ReactNode }) => {
    const platformContext = useMemo<DenebPlatformProviderProps>(
        () => ({
            settingsPanePlatformComponent,
            vegaLoader
        }),
        [settingsPanePlatformComponent, vegaLoader]
    );

    return (
        <DenebPlatformProviderContext.Provider value={platformContext}>
            {children}
        </DenebPlatformProviderContext.Provider>
    );
};
