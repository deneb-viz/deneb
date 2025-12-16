import { createContext, useMemo, type ReactNode } from 'react';

import { type DenebPlatformProviderProps } from '../types';

type DenebPlatformProviderContextProps = Required<DenebPlatformProviderProps>;

export const DenebPlatformProviderContext =
    createContext<DenebPlatformProviderContextProps | null>(null);

export const DenebPlatformProvider = ({
    isDownloadPermitted = true,
    settingsPanePlatformComponent = <></>,
    vegaLoader = null,
    downloadJsonFile = downloadJsonFileDefault,
    launchUrl = launchUrlDefault,
    children
}: DenebPlatformProviderProps & { children: ReactNode }) => {
    const platformContext = useMemo<DenebPlatformProviderContextProps>(
        () => ({
            isDownloadPermitted,
            settingsPanePlatformComponent,
            vegaLoader,
            downloadJsonFile,
            launchUrl
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
