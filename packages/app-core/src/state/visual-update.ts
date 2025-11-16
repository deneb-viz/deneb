import powerbi from 'powerbi-visuals-api';
import { VisualUpdateHistoryRecord } from '../lib/interface';

export type VisualUpdateSliceProperties = powerbi.extensibility.visual.VisualUpdateOptions & {
    /**
     * History of visual update operations. The most recent update is at the
     * start of the array.
     */
    history: VisualUpdateHistoryRecord[];
    /**
     * This is not present in the Power BI visuals API and is useful to us, so
     * this creates an explicit type for it.
     */
    updateId: string;
}

export type VisualUpdateSlice = {
    visualUpdateOptions: VisualUpdateSliceProperties;
}