import powerbi from 'powerbi-visuals-api';
import { type VisualUpdateHistoryRecord } from '../lib/interface';
import { type StateCreator } from 'zustand';
import { type StoreState } from './state';

export type VisualUpdateSliceProperties =
    powerbi.extensibility.visual.VisualUpdateOptions & {
        /**
         * History of visual update operations. The most recent update is at the
         * start of the array.
         */
        history: VisualUpdateHistoryRecord[];
        /**
         * This is not present in the Power BI visuals API and is useful to us, so
         * this creates an explicit type for it.
         */
        updateId: string | null;
    };

export type VisualUpdateSlice = {
    visualUpdateOptions: Partial<VisualUpdateSliceProperties>;
};

export const createVisualUpdateSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        VisualUpdateSlice
    > =>
    () => ({
        visualUpdateOptions: {
            history: [],
            updateId: null
        }
    });
