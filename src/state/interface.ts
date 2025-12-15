import type { StateCreator } from 'zustand';

import { type DenebVisualStoreState } from './state';
import { type DisplayMode } from '../lib/state';
import { type ContainerViewport } from '@deneb-viz/app-core';

export type InterfaceSlice = {
    embedViewport: ContainerViewport | undefined;
    mode: DisplayMode;
    setEmbedViewport: (viewport: ContainerViewport) => void;
};

export const createInterfaceSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    InterfaceSlice
> => {
    return (set) => ({
        embedViewport: undefined,
        mode: 'initializing',
        setEmbedViewport: (viewport) => {
            set(
                (state) => ({
                    interface: {
                        ...state.interface,
                        embedViewport: viewport
                    }
                }),
                false,
                'interface.setEmbedViewport'
            );
        }
    });
};
