import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import {
    createInteractivitySlice,
    type InteractivitySlice
} from './interactivity';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { createSettingsSlice, SettingsSlice } from './settings';

export type DenebVisualStoreState = {
    interactivity: InteractivitySlice;
    settings: SettingsSlice;
};

export type DenebVisualStateDependencies = {};

const useDenebVisualState = createWithEqualityFn<DenebVisualStoreState>()(
    devtools(
        (...a) => ({
            interactivity: createInteractivitySlice()(...a),
            settings: createSettingsSlice()(...a)
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
