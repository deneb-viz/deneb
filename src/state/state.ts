import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { createDatasetSlice, DatasetSlice } from './dataset';
import { createHostSlice, HostSlice } from './host';
import {
    createInteractivitySlice,
    type InteractivitySlice
} from './interactivity';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createSettingsSlice, type SettingsSlice } from './settings';
import { createUpdatesSlice, type UpdatesSlice } from './updates';

export type DenebVisualStoreState = {
    dataset: DatasetSlice;
    host: HostSlice;
    interactivity: InteractivitySlice;
    interface: InterfaceSlice;
    settings: SettingsSlice;
    updates: UpdatesSlice;
};

export type DenebVisualStateDependencies = {};

const useDenebVisualState = createWithEqualityFn<DenebVisualStoreState>()(
    subscribeWithSelector(
        devtools(
            (...a) => ({
                dataset: createDatasetSlice()(...a),
                host: createHostSlice()(...a),
                interactivity: createInteractivitySlice()(...a),
                interface: createInterfaceSlice()(...a),
                settings: createSettingsSlice()(...a),
                updates: createUpdatesSlice()(...a)
            }),
            {
                name: 'DenebVisualStore',
                enabled: toBoolean(process.env.ZUSTAND_DEV_TOOLS)
            }
        )
    ),
    shallow
);

const getDenebVisualState = () => useDenebVisualState.getState();

export { useDenebVisualState, getDenebVisualState };
