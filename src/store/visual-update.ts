import { StateCreator } from 'zustand';
import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { TStoreState } from '.';
import { IVisualUpdateHistoryRecord } from '../features/interface';

export interface IVisualUpdateSliceProperties extends VisualUpdateOptions {
    /**
     * History of visual update operations. The most recent update is at the
     * start of the array.
     */
    history: IVisualUpdateHistoryRecord[];
    /**
     * This is not present in the Power BI visuals API and is useful to us, so
     * this creates an explicit type for it.
     */
    updateId: string;
}

export interface IVisualUpdateSlice {
    visualUpdateOptions: IVisualUpdateSliceProperties;
}

const sliceStateInitializer = () =>
    <IVisualUpdateSlice>{
        visualUpdateOptions: {
            history: [],
            updateId: null
        }
    };

export const createVisualUpdateSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IVisualUpdateSlice
> = sliceStateInitializer;
