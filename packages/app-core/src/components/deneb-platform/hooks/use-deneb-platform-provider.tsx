import { useContext } from 'react';

import { DenebPlatformProviderContext } from '../components/deneb-platform-provider';

/**
 * Custom hook to access the Deneb Platform Provider context.
 */
export const useDenebPlatformProvider = () => {
    const platformProvider = useContext(DenebPlatformProviderContext);
    if (!platformProvider) {
        throw new Error(
            'useDenebPlatformProvider must be used within a DenebPlatformProviderContext.Provider'
        );
    }
    return platformProvider;
};
