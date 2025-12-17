import type { StateCreator } from 'zustand';

import { type DenebVisualStoreState } from './state';
import { type DisplayMode } from '../lib/state';
import { type ContainerViewport } from '@deneb-viz/app-core';

export type InterfaceSlice = {
    embedViewport: ContainerViewport | undefined;
    mode: DisplayMode;
    viewport: ContainerViewport | undefined;
    setEmbedViewport: (viewport: ContainerViewport) => void;
    setMode: (mode: DisplayMode) => void;
    setViewport: (viewport: ContainerViewport) => void;
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
        viewport: undefined,
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
        },
        setMode: (mode) => {
            set(
                (state) => ({
                    interface: {
                        ...state.interface,
                        mode
                    }
                }),
                false,
                'interface.setMode'
            );
        },
        setViewport: (viewport) => {
            set(
                (state) => ({
                    interface: {
                        ...state.interface,
                        viewport
                    }
                }),
                false,
                'interface.setViewport'
            );
        }
    });
};
