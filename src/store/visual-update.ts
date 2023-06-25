import { StateCreator } from 'zustand';
import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { TStoreState } from '.';

export interface IVisualUpdateSliceProperties extends VisualUpdateOptions {
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
        visualUpdateOptions: <unknown>null
    };

export const createVisualUpdateSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IVisualUpdateSlice
> = sliceStateInitializer;
