import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import {
    createInteractivitySlice,
    type InteractivitySlice
} from './interactivity';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { createSettingsSlice, type SettingsSlice } from './settings';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createUpdatesSlice, type UpdatesSlice } from './updates';

export type DenebVisualStoreState = {
    interactivity: InteractivitySlice;
    interface: InterfaceSlice;
    settings: SettingsSlice;
    updates: UpdatesSlice;
};

export type DenebVisualStateDependencies = {};

const useDenebVisualState = createWithEqualityFn<DenebVisualStoreState>()(
    devtools(
        (...a) => ({
            interactivity: createInteractivitySlice()(...a),
            interface: createInterfaceSlice()(...a),
            settings: createSettingsSlice()(...a),
            updates: createUpdatesSlice()(...a)
        }),
        {
            name: 'DenebVisualStore',
            enabled: toBoolean(process.env.ZUSTAND_DEV_TOOLS)
        }
    ),
    shallow
);

const getDenebVisualState = () => useDenebVisualState.getState();

export { useDenebVisualState, getDenebVisualState };
