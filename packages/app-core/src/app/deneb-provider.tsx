import { type ReactNode } from 'react';
import { type DenebPlatformProviderProps } from '../components/deneb-platform/types';
import { DenebPlatformProvider } from '../components/deneb-platform';

type DenebProviderProps = {
    platformProvider?: DenebPlatformProviderProps;
    children: ReactNode;
};

export const DenebProvider = ({
    platformProvider,
    children
}: DenebProviderProps) => {
    return (
        <DenebPlatformProvider {...platformProvider}>
            {children}
        </DenebPlatformProvider>
    );
};
