import { createContext, useMemo, type ReactNode } from 'react';

import { type DenebPlatformProviderProps } from '../types';

export const DenebPlatformProviderContext =
    createContext<DenebPlatformProviderProps | null>(null);

export const DenebPlatformProvider = ({
    settingsPanePlatformComponent = <></>,
    children
}: DenebPlatformProviderProps & { children: ReactNode }) => {
    const platformContext = useMemo<DenebPlatformProviderProps>(
        () => ({
            settingsPanePlatformComponent
        }),
        [settingsPanePlatformComponent]
    );

    return (
        <DenebPlatformProviderContext.Provider value={platformContext}>
            {children}
        </DenebPlatformProviderContext.Provider>
    );
};
