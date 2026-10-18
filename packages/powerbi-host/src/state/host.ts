import powerbi from 'powerbi-visuals-api';
import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';

export type HostSlice = {
    allowInteractions: boolean;
    setHost: (host: powerbi.extensibility.visual.IVisualHost) => void;
};

export const createHostSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    HostSlice
> => {
    return (set) => ({
        allowInteractions: false,
        setHost: (host: powerbi.extensibility.visual.IVisualHost) => {
            set(
                (state) => {
                    return {
                        host: {
                            ...state.host,
                            allowInteractions:
                                host.hostCapabilities.allowInteractions ?? false
                        }
                    };
                },
                false,
                'host.setHost'
            );
        }
    });
};
